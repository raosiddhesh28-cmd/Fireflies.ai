import type { ExtractionRecord, User } from "./types.js";

export const EXTRACTION_SYSTEM_PROMPT = `You extract forward-looking meeting commitments from a transcript.

Read the transcript text. Return ONLY valid JSON (no markdown fences, no preamble) matching this shape:
{
  "summary": "2-3 sentence meeting summary",
  "commitments": [
    {
      "text": "paraphrased commitment in third person",
      "transcriptLine": "the exact quoted line from the transcript",
      "speakerName": "name of the person who made the commitment, or null if unclear",
      "requesterName": "name of the person who asked for it or would depend on it, or null if unclear"
    }
  ]
}

Rules:
- Only extract genuine forward-looking commitments ("I'll do X", "I will send Y by Friday").
- Do not extract general discussion, opinions, or past-tense statements.
- If no clear commitments exist, return an empty commitments array rather than inventing one.`;

export type TranscriptExtraction = Omit<
  ExtractionRecord,
  "id" | "meetingId" | "extractedAt"
> & {
  requesterId: string | null;
};

interface LlmCommitment {
  text: string;
  transcriptLine: string;
  speakerName: string | null;
  requesterName: string | null;
}

interface LlmPayload {
  summary: string;
  commitments: LlmCommitment[];
}

export function matchKnownUser(name: string | null | undefined, knownUsers: User[]): string | null {
  if (!name || typeof name !== "string") return null;
  const needle = name.trim().toLowerCase();
  if (!needle) return null;

  const exact = knownUsers.filter((u) => u.name.toLowerCase() === needle);
  if (exact.length === 1) return exact[0].id;

  const fuzzy = knownUsers.filter((u) => {
    const full = u.name.toLowerCase();
    const parts = full.split(/\s+/);
    return full.includes(needle) || needle.includes(full) || parts.some((p) => p === needle);
  });
  if (fuzzy.length === 1) return fuzzy[0].id;
  return null;
}

export function parseExtractionJson(raw: string): LlmPayload {
  const stripped = raw
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    throw new Error("Extraction response was not valid JSON.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Extraction response was not a JSON object.");
  }
  const body = parsed as { summary?: unknown; commitments?: unknown };
  const summary = typeof body.summary === "string" ? body.summary : "";
  if (!Array.isArray(body.commitments)) {
    throw new Error("Extraction response was missing a commitments array.");
  }
  const commitments: LlmCommitment[] = body.commitments.map((item, index) => {
    if (!item || typeof item !== "object") {
      throw new Error(`Extraction commitment ${index} was not an object.`);
    }
    const row = item as Record<string, unknown>;
    return {
      text: String(row.text ?? ""),
      transcriptLine: String(row.transcriptLine ?? ""),
      speakerName: typeof row.speakerName === "string" ? row.speakerName : null,
      requesterName: typeof row.requesterName === "string" ? row.requesterName : null,
    };
  });
  return { summary, commitments };
}

export async function extractFromTranscript(input: {
  transcriptText: string;
  meetingTitle: string;
  knownUsers: User[];
}): Promise<{ summary: string; extractions: TranscriptExtraction[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const workspaceId = process.env.ANTHROPIC_WORKSPACE_ID?.trim();
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-api-key": apiKey,
    "anthropic-version": "2023-06-01",
  };
  if (workspaceId) {
    headers["anthropic-workspace-id"] = workspaceId;
  }

  let response: Response;
  try {
    response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers,
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: EXTRACTION_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `Meeting title: ${input.meetingTitle}\n\nTranscript:\n${input.transcriptText}`,
          },
        ],
      }),
    });
  } catch (err) {
    throw new Error(`Could not reach the extraction model: ${(err as Error).message}`);
  }

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    if (/anthropic-workspace-id is required/i.test(detail)) {
      throw new Error(
        "This Anthropic key is identity-linked and needs a workspace id. Copy the wrkspc_… value from https://platform.claude.com/settings/workspaces into ANTHROPIC_WORKSPACE_ID in .env.local and restart the API.",
      );
    }
    throw new Error(
      `Extraction model returned ${response.status}${detail ? `: ${detail.slice(0, 200)}` : "."}`,
    );
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };
  const text = payload.content?.find((block) => block.type === "text")?.text;
  if (!text) {
    throw new Error("Extraction response was not valid JSON.");
  }

  const parsed = parseExtractionJson(text);
  const extractions: TranscriptExtraction[] = parsed.commitments.map((c) => ({
    text: c.text,
    transcriptLine: c.transcriptLine,
    suggestedOwnerId: matchKnownUser(c.speakerName, input.knownUsers),
    requesterId: matchKnownUser(c.requesterName, input.knownUsers),
  }));

  return { summary: parsed.summary, extractions };
}
