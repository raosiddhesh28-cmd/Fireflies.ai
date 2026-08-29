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

export type StatusCategory =
  | "not_accepted"
  | "wrong_owner"
  | "not_started"
  | "competing_priorities"
  | "dependency_missing"
  | "dependency_delayed"
  | "partial_completion"
  | "quality_failure"
  | "rework"
  | "requirement_changed"
  | "resource_unavailable"
  | "communication_failure"
  | "deadline_missed";

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
  statusCategory: StatusCategory;
  verificationHold: boolean;
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
  const body = await res.json();
  if (!res.ok) throw new Error(body.error ?? "Request failed");
  return body as T;
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
  act: (id: string, action: string, body: Record<string, string>) =>
    json<{ commitment: Commitment }>(`/api/commitments/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
};
