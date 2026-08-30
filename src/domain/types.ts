import type { StatusCategory } from "./statusCategories.js";

export const PROPOSAL_TTL_MS = 3 * 24 * 60 * 60 * 1000;
export const MAX_RESURFACES = 2;
export const RESOLUTION_WINDOW_DAYS = 14;
export const BASELINE_RESOLUTION_RATE = 0.28;
export const TARGET_RESOLUTION_RATE = 0.45;

export type CommitmentState =
  | "needs_confirmation"
  | "handoff_pending"
  | "needs_ownership"
  | "open"
  | "completed"
  | "declined"
  | "dropped";

export type Persona = "owner" | "requester" | "manager";

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

export interface ExtractionRecord {
  id: string;
  meetingId: string;
  text: string;
  transcriptLine: string;
  suggestedOwnerId: string | null;
  requesterId: string;
  extractedAt: string;
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
  updatedAt: string;
  acceptedAt: string | null;
  resolvedAt: string | null;
  resurfaceCount: number;
  suppressMeetingId: string | null;
  lastResurfacedMeetingId: string | null;
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
  byOutcome: {
    completed: number;
    declined: number;
    dropped: number;
  };
  trend: Array<{
    period: string;
    created: number;
    resolved: number;
    rate: number;
  }>;
}

export const TERMINAL_STATES: CommitmentState[] = [
  "completed",
  "declined",
  "dropped",
];

export function isResolved(state: CommitmentState): boolean {
  return TERMINAL_STATES.includes(state);
}

export function isPendingConsent(state: CommitmentState): boolean {
  return state === "needs_confirmation" || state === "handoff_pending";
}
