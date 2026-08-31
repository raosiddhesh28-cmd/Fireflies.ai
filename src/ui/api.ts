export type CommitmentState =
  | "needs_confirmation"
  | "handoff_pending"
  | "needs_ownership"
  | "open"
  | "completed"
  | "declined"
  | "dropped";

export interface User {
  id: string;
  name: string;
  role: "member" | "manager";
}

export interface Meeting {
  id: string;
  title: string;
  seriesId: string | null;
  startsAt: string;
  cancelled: boolean;
}

export interface Commitment {
  id: string;
  text: string;
  transcriptLine: string;
  meetingId: string;
  seriesId: string | null;
  requesterId: string;
  ownerId: string | null;
  proposedOwnerId: string | null;
  redirectedBy: string | null;
  state: CommitmentState;
  extractedAt: string;
  resurfaceCount: number;
  clarification: string | null;
}

export interface ManagerRollup {
  windowDays: number;
  baselineRate: number;
  targetRate: number;
  currentRate: number;
  createdInWindow: number;
  resolvedInWindow: number;
  stillOpen: number;
  needsOwnership: number;
  pendingAcceptance: number;
  byOutcome: { completed: number; declined: number; dropped: number };
  trend: Array<{ period: string; created: number; resolved: number; rate: number }>;
}

export interface AskFredAnswer {
  text: string;
  confidence: "high" | "low";
  items: Array<{
    id: string;
    text: string;
    status: string;
    acknowledged: boolean;
    meetingId: string;
  }>;
}

async function json<T>(input: RequestInfo, init?: RequestInit): Promise<T> {
  const res = await fetch(input, {
    ...init,
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
  });
  const raw = await res.text();
  let data: { error?: string } | null;
  try {
    data = raw ? (JSON.parse(raw) as { error?: string }) : null;
  } catch {
    throw new Error(
      `Server returned an unreadable response (status ${res.status}). Check the server terminal for a crash log.`,
    );
  }
  if (!res.ok || !data) {
    throw new Error(data?.error || `Request failed with status ${res.status}.`);
  }
  return data as T;
}

export const api = {
  session: () => json<{ users: User[]; meetings: Meeting[]; now: string }>("/api/session"),
  reset: () => json("/api/reset", { method: "POST" }),
  commitments: (userId: string, view: string) =>
    json<{ commitments: Commitment[] }>(`/api/commitments?userId=${userId}&view=${view}`),
  resurface: (meetingId: string) =>
    json<{ meeting: Meeting; commitments: Commitment[] }>(`/api/meetings/${meetingId}/resurface`),
  askFred: (userId: string, persona: string, query: string) =>
    json<AskFredAnswer>("/api/askfred", {
      method: "POST",
      body: JSON.stringify({ userId, persona, query }),
    }),
  rollup: () => json<ManagerRollup>("/api/manager/rollup"),
  uploadMeeting: (body: { title: string; transcriptText: string; seriesId: string | null }) =>
    json<{ meeting: Meeting; summary: string; commitments: Commitment[] }>("/api/meetings/upload", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  act: (id: string, action: string, body: Record<string, string>) =>
    json<{ commitment: Commitment }>(`/api/commitments/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
