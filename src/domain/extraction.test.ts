import { afterEach, describe, expect, it, vi } from "vitest";
import { extractFromTranscript, matchKnownUser } from "./extraction.js";
import { USERS } from "./seed.js";

function anthropicOk(text: string) {
  return {
    ok: true,
    status: 200,
    json: async () => ({ content: [{ type: "text", text }] }),
    text: async () => "",
  };
}

describe("extractFromTranscript", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps valid JSON into correctly shaped extractions", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        anthropicOk(
          JSON.stringify({
            summary: "The team planned the changelog and SSO follow-up.",
            commitments: [
              {
                text: "Alex will publish the Q3 changelog before the webinar.",
                transcriptLine: "Alex: I'll own the Q3 changelog before the webinar.",
                speakerName: "Alex Chen",
                requesterName: "Blair",
              },
            ],
          }),
        ),
      ),
    );

    const result = await extractFromTranscript({
      transcriptText: "Alex: I'll own the Q3 changelog before the webinar.",
      meetingTitle: "Weekly Product Sync",
      knownUsers: USERS,
    });

    expect(result.summary).toContain("changelog");
    expect(result.extractions).toHaveLength(1);
    expect(result.extractions[0].text).toContain("changelog");
    expect(result.extractions[0].transcriptLine).toContain("I'll own");
    expect(result.extractions[0].suggestedOwnerId).toBe("alex");
    expect(result.extractions[0].requesterId).toBe("blair");
    expect(vi.mocked(fetch).mock.calls[0][0]).toBe("https://api.anthropic.com/v1/messages");
    const init = vi.mocked(fetch).mock.calls[0][1] as RequestInit;
    const headers = init.headers as Record<string, string>;
    expect(headers["anthropic-workspace-id"]).toBeUndefined();
    const body = JSON.parse(String(init.body));
    expect(body.model).toBe("claude-sonnet-4-6");
  });

  it("sends anthropic-workspace-id when ANTHROPIC_WORKSPACE_ID is set", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    process.env.ANTHROPIC_WORKSPACE_ID = "wrkspc_01TestWorkspaceId000000000";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(anthropicOk(JSON.stringify({ summary: "s", commitments: [] }))),
    );

    await extractFromTranscript({
      transcriptText: "Alex: I'll do it.",
      meetingTitle: "Weekly Product Sync",
      knownUsers: USERS,
    });

    const sent = vi.mocked(fetch).mock.calls[0][1]?.headers as Record<string, string>;
    expect(sent["anthropic-workspace-id"]).toBe("wrkspc_01TestWorkspaceId000000000");
    delete process.env.ANTHROPIC_WORKSPACE_ID;
  });

  it("leaves suggestedOwnerId null when the speaker does not match a known user", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        anthropicOk(
          JSON.stringify({
            summary: "Someone offered to help.",
            commitments: [
              {
                text: "Jordan will send the vendor recap.",
                transcriptLine: "Jordan: I'll send the vendor recap.",
                speakerName: "Jordan Does-Not-Exist",
                requesterName: null,
              },
            ],
          }),
        ),
      ),
    );

    const result = await extractFromTranscript({
      transcriptText: "Jordan: I'll send the vendor recap.",
      meetingTitle: "Ad hoc",
      knownUsers: USERS,
    });

    expect(result.extractions[0].suggestedOwnerId).toBeNull();
    expect(result.extractions[0].requesterId).toBeNull();
    expect(() => matchKnownUser("Jordan Does-Not-Exist", USERS)).not.toThrow();
  });

  it("throws a clear error on malformed non-JSON instead of crashing", async () => {
    process.env.ANTHROPIC_API_KEY = "test-key";
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(anthropicOk("Here are the commitments: not json at all")),
    );

    await expect(
      extractFromTranscript({
        transcriptText: "Alex: I'll do it.",
        meetingTitle: "Weekly Product Sync",
        knownUsers: USERS,
      }),
    ).rejects.toThrow(/not valid JSON/i);
  });
});
