import type { Commitment, Meeting } from "./types.js";
import { MAX_RESURFACES } from "./types.js";
import { markResurfaced } from "./stateMachine.js";
import { isResurfacePriority } from "./statusCategories.js";

export function unresolvedForRecurringMeeting(
  commitments: Commitment[],
  meeting: Meeting,
): Commitment[] {
  if (!meeting.seriesId || meeting.cancelled) return [];
  return commitments
    .filter((c) => eligible(c, meeting) && c.resurfaceCount < MAX_RESURFACES)
    .sort((a, b) => Number(isResurfacePriority(b.statusCategory)) - Number(isResurfacePriority(a.statusCategory)));
}

export function applyResurfaceVisit(
  commitments: Commitment[],
  meeting: Meeting,
  now: Date,
): Commitment[] {
  if (!meeting.seriesId || meeting.cancelled) return commitments;
  return commitments.map((c) => {
    if (!eligible(c, meeting)) return c;
    return markResurfaced(c, meeting.id, now);
  });
}

function eligible(c: Commitment, meeting: Meeting): boolean {
  return (
    c.seriesId === meeting.seriesId &&
    c.state === "open" &&
    c.meetingId !== meeting.id &&
    c.suppressMeetingId !== meeting.id
  );
}
