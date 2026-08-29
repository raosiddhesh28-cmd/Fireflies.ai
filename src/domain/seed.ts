import type { Commitment, ExtractionRecord, Meeting, User } from "./types.js";
import { fromExtraction } from "./stateMachine.js";

export function demoNow(): Date {
  return new Date("2026-08-29T18:00:00.000Z");
}

export const USERS: User[] = [
  { id: "alex", name: "Alex Chen", role: "member" },
  { id: "blair", name: "Blair Okonkwo", role: "member" },
  { id: "casey", name: "Casey Singh", role: "member" },
  { id: "dana", name: "Dana Park", role: "manager" },
];

export const MEETINGS: Meeting[] = [
  {
    id: "mtg-sync-prev",
    title: "Weekly Product Sync",
    seriesId: "series-product-sync",
    startsAt: "2026-08-22T16:00:00.000Z",
    cancelled: false,
  },
  {
    id: "mtg-sync-next",
    title: "Weekly Product Sync",
    seriesId: "series-product-sync",
    startsAt: "2026-08-29T16:00:00.000Z",
    cancelled: false,
  },
  {
    id: "mtg-cancelled",
    title: "Weekly Product Sync",
    seriesId: "series-product-sync",
    startsAt: "2026-08-15T16:00:00.000Z",
    cancelled: true,
  },
  {
    id: "mtg-design",
    title: "Design critique",
    seriesId: null,
    startsAt: "2026-08-27T19:00:00.000Z",
    cancelled: false,
  },
];

export const EXTRACTIONS: ExtractionRecord[] = [
  {
    id: "ext-1",
    meetingId: "mtg-sync-prev",
    text: "Publish the Q3 integration changelog before the customer webinar.",
    transcriptLine:
      "Alex: I'll own the Q3 integration changelog and have it up before the webinar.",
    suggestedOwnerId: "alex",
    requesterId: "blair",
    extractedAt: "2026-08-22T16:48:00.000Z",
  },
  {
    id: "ext-2",
    meetingId: "mtg-sync-prev",
    text: "Confirm SSO timeline with the identity vendor.",
    transcriptLine: "Blair: Can someone confirm the SSO timeline with the vendor this week?",
    suggestedOwnerId: null,
    requesterId: "blair",
    extractedAt: "2026-08-22T16:51:00.000Z",
  },
  {
    id: "ext-3",
    meetingId: "mtg-design",
    text: "Tighten empty-state copy on the recap page.",
    transcriptLine: "Casey: I can tighten the empty-state copy on recap.",
    suggestedOwnerId: "casey",
    requesterId: "alex",
    extractedAt: "2026-08-27T19:22:00.000Z",
  },
  {
    id: "ext-4",
    meetingId: "mtg-sync-prev",
    text: "Share the usage clip with CS for the webinar.",
    transcriptLine: "Alex: I’ll send CS a usage clip they can use.",
    suggestedOwnerId: "alex",
    requesterId: "blair",
    extractedAt: "2026-08-22T16:55:00.000Z",
  },
  {
    id: "ext-5",
    meetingId: "mtg-sync-prev",
    text: "Decide whether to keep the legacy recorder flag.",
    transcriptLine: "Someone should decide if we keep the legacy recorder flag.",
    suggestedOwnerId: null,
    requesterId: "blair",
    extractedAt: "2026-08-22T17:02:00.000Z",
  },
  {
    id: "ext-6",
    meetingId: "mtg-sync-prev",
    text: "Ping legal about the DPA redlines.",
    transcriptLine: "We should ping legal about the DPA redlines.",
    suggestedOwnerId: "casey",
    requesterId: "blair",
    extractedAt: "2026-08-27T16:40:00.000Z",
  },
  {
    id: "ext-7",
    meetingId: "mtg-sync-prev",
    text: "Ship the mute-button hotfix.",
    transcriptLine: "Alex: I already shipped the mute-button hotfix yesterday.",
    suggestedOwnerId: "alex",
    requesterId: "blair",
    extractedAt: "2026-08-20T16:10:00.000Z",
  },
  {
    id: "ext-8",
    meetingId: "mtg-design",
    text: "Rebuild the onboarding illustration.",
    transcriptLine: "Casey: I won't take the illustration this cycle.",
    suggestedOwnerId: "casey",
    requesterId: "alex",
    extractedAt: "2026-08-21T19:30:00.000Z",
  },
];

export function seedCommitments(now: Date): Commitment[] {
  const series = (meetingId: string) =>
    MEETINGS.find((m) => m.id === meetingId)?.seriesId ?? null;

  const items = EXTRACTIONS.map((e) =>
    fromExtraction({ ...e, seriesId: series(e.meetingId) }, now),
  );

  return items.map((c) => {
    if (c.id === "ext-4") {
      return {
        ...c,
        state: "open",
        ownerId: "alex",
        proposedOwnerId: "alex",
        acceptedAt: "2026-08-22T17:10:00.000Z",
        resurfaceCount: 1,
      };
    }
    if (c.id === "ext-6") {
      return {
        ...c,
        state: "handoff_pending",
        proposedOwnerId: "casey",
        redirectedBy: "alex",
      };
    }
    if (c.id === "ext-7") {
      return {
        ...c,
        state: "completed",
        ownerId: "alex",
        proposedOwnerId: "alex",
        acceptedAt: "2026-08-20T16:40:00.000Z",
        resolvedAt: "2026-08-21T12:00:00.000Z",
      };
    }
    if (c.id === "ext-8") {
      return {
        ...c,
        state: "declined",
        ownerId: "casey",
        proposedOwnerId: "casey",
        acceptedAt: "2026-08-21T19:40:00.000Z",
        resolvedAt: "2026-08-21T19:44:00.000Z",
      };
    }
    return c;
  });
}
