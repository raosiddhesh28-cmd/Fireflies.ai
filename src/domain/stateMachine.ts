import {
  MAX_RESURFACES,
  PROPOSAL_TTL_MS,
  type Commitment,
  type CommitmentState,
} from "./types.js";
import {
  isDeclineReason,
  isExecutionFlag,
  isQualityFlag,
  type DeclineReason,
  type ExecutionFlag,
} from "./statusCategories.js";

export class ConsentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConsentError";
  }
}

export class TransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TransitionError";
  }
}

function stamp(commitment: Commitment, now: Date, patch: Partial<Commitment>): Commitment {
  return { ...commitment, ...patch, updatedAt: now.toISOString() };
}

export function fromExtraction(
  extraction: {
    id: string;
    meetingId: string;
    text: string;
    transcriptLine: string;
    suggestedOwnerId: string | null;
    requesterId: string;
    extractedAt: string;
    seriesId: string | null;
  },
  now: Date,
): Commitment {
  const proposed = extraction.suggestedOwnerId;
  return {
    id: extraction.id,
    text: extraction.text,
    transcriptLine: extraction.transcriptLine,
    meetingId: extraction.meetingId,
    seriesId: extraction.seriesId,
    requesterId: extraction.requesterId,
    ownerId: null,
    proposedOwnerId: proposed,
    redirectedBy: null,
    state: proposed ? "needs_confirmation" : "needs_ownership",
    extractedAt: extraction.extractedAt,
    updatedAt: now.toISOString(),
    acceptedAt: null,
    resolvedAt: null,
    resurfaceCount: 0,
    suppressMeetingId: null,
    lastResurfacedMeetingId: null,
    clarification: null,
    statusCategory: "not_accepted",
    verificationHold: false,
  };
}

export function expireProposal(commitment: Commitment, now: Date): Commitment {
  if (commitment.state !== "needs_confirmation" && commitment.state !== "handoff_pending") {
    return commitment;
  }
  const proposedAt = new Date(commitment.updatedAt).getTime();
  if (now.getTime() - proposedAt < PROPOSAL_TTL_MS) {
    return commitment;
  }
  return stamp(commitment, now, {
    state: "needs_ownership",
    proposedOwnerId: null,
    ownerId: null,
    statusCategory: "not_accepted",
  });
}

export function accept(commitment: Commitment, actorId: string, now: Date): Commitment {
  if (commitment.state !== "needs_confirmation" && commitment.state !== "handoff_pending") {
    throw new TransitionError("Only proposed commitments can be accepted.");
  }
  if (commitment.proposedOwnerId !== actorId) {
    throw new ConsentError("Ownership requires an explicit opt-in by the proposed person.");
  }
  return stamp(commitment, now, {
    state: "open",
    ownerId: actorId,
    proposedOwnerId: actorId,
    acceptedAt: now.toISOString(),
    redirectedBy: null,
    statusCategory: "not_started",
    verificationHold: false,
  });
}

export function dismissToBucket(commitment: Commitment, actorId: string, now: Date): Commitment {
  if (commitment.state !== "needs_confirmation" && commitment.state !== "handoff_pending") {
    throw new TransitionError("Only a proposal can be dismissed into the Loose-Ends bucket.");
  }
  if (commitment.proposedOwnerId !== actorId) {
    throw new ConsentError("Only the proposed person can dismiss their own proposal.");
  }
  return stamp(commitment, now, {
    state: "needs_ownership",
    proposedOwnerId: null,
    ownerId: null,
    statusCategory: "not_accepted",
  });
}

export function redirect(
  commitment: Commitment,
  actorId: string,
  targetUserId: string,
  now: Date,
): Commitment {
  if (!targetUserId || targetUserId === actorId) {
    throw new TransitionError("Redirect must name a different person.");
  }
  const canRedirect =
    commitment.proposedOwnerId === actorId ||
    commitment.ownerId === actorId ||
    commitment.state === "needs_ownership";
  if (!canRedirect) {
    throw new ConsentError("You can only redirect a proposal you were offered, an item you own, or an unowned loose end.");
  }
  return stamp(commitment, now, {
    state: "handoff_pending",
    ownerId: null,
    proposedOwnerId: targetUserId,
    redirectedBy: actorId,
    acceptedAt: null,
    resolvedAt: null,
    statusCategory: "not_accepted",
    verificationHold: false,
  });
}

export function claim(commitment: Commitment, actorId: string, now: Date): Commitment {
  if (commitment.state !== "needs_ownership") {
    throw new TransitionError("Only unowned loose ends can be claimed.");
  }
  return stamp(commitment, now, {
    state: "open",
    ownerId: actorId,
    proposedOwnerId: actorId,
    acceptedAt: now.toISOString(),
    statusCategory: "not_started",
    verificationHold: false,
  });
}

export function clarify(
  commitment: Commitment,
  actorId: string,
  text: string,
  now: Date,
): Commitment {
  const allowed =
    commitment.proposedOwnerId === actorId || commitment.ownerId === actorId;
  if (!allowed) {
    throw new ConsentError("Only the proposed or confirmed owner can clarify wording.");
  }
  const nextText = text.trim();
  if (!nextText) {
    throw new TransitionError("Clarification cannot be empty.");
  }
  return stamp(commitment, now, {
    text: nextText,
    clarification: nextText,
  });
}

export function complete(
  commitment: Commitment,
  actorId: string,
  now: Date,
  verification?: string,
): Commitment {
  if (commitment.state !== "open") {
    throw new TransitionError("Only an accepted open commitment can be completed.");
  }
  if (commitment.ownerId !== actorId) {
    throw new ConsentError("Only the confirmed owner can resolve this commitment.");
  }
  if (verification) {
    if (!isQualityFlag(verification)) {
      throw new TransitionError("Unknown verification flag.");
    }
    return stamp(commitment, now, {
      statusCategory: verification,
      verificationHold: true,
      resolvedAt: null,
    });
  }
  return stamp(commitment, now, {
    state: "completed",
    resolvedAt: now.toISOString(),
    verificationHold: false,
  });
}

export function decline(
  commitment: Commitment,
  actorId: string,
  now: Date,
  reason: string,
): Commitment {
  if (!isDeclineReason(reason)) {
    throw new TransitionError(
      "Decline requires a reason: wrong owner, competing priorities, requirement changed, or resource unavailable.",
    );
  }
  const category: DeclineReason = reason;
  if (isPendingConsentState(commitment.state) && commitment.proposedOwnerId === actorId) {
    return stamp(commitment, now, {
      state: "declined",
      ownerId: null,
      proposedOwnerId: actorId,
      resolvedAt: now.toISOString(),
      statusCategory: category,
    });
  }
  if (commitment.state !== "open") {
    throw new TransitionError("Only an accepted open commitment can be resolved this way.");
  }
  if (commitment.ownerId !== actorId) {
    throw new ConsentError("Only the confirmed owner can resolve this commitment.");
  }
  return stamp(commitment, now, {
    state: "declined",
    resolvedAt: now.toISOString(),
    statusCategory: category,
  });
}

export function flagExecution(
  commitment: Commitment,
  actorId: string,
  now: Date,
  category: string,
): Commitment {
  if (commitment.state !== "open") {
    throw new TransitionError("Only an open commitment can carry an execution or dependency flag.");
  }
  if (commitment.ownerId !== actorId) {
    throw new ConsentError("Only the confirmed owner can flag a blocker.");
  }
  if (!isExecutionFlag(category)) {
    throw new TransitionError("Unknown execution flag.");
  }
  const flag: ExecutionFlag = category;
  return stamp(commitment, now, {
    statusCategory: flag,
    verificationHold: false,
  });
}

export function drop(commitment: Commitment, actorId: string, now: Date): Commitment {
  const canDrop =
    commitment.proposedOwnerId === actorId ||
    commitment.ownerId === actorId ||
    commitment.requesterId === actorId ||
    commitment.state === "needs_ownership";
  if (!canDrop) {
    throw new ConsentError("Not allowed to mark this as not a commitment / no longer relevant.");
  }
  return stamp(commitment, now, {
    state: "dropped",
    ownerId: commitment.ownerId,
    resolvedAt: now.toISOString(),
  });
}

export function keepOpen(commitment: Commitment, actorId: string, meetingId: string, now: Date): Commitment {
  if (commitment.state !== "open") {
    throw new TransitionError("Only open commitments can be kept open.");
  }
  if (commitment.ownerId !== actorId) {
    throw new ConsentError("Only the confirmed owner can keep a commitment open.");
  }
  return stamp(commitment, now, {
    suppressMeetingId: meetingId,
  });
}

export function stopResurfacing(commitment: Commitment, actorId: string, now: Date): Commitment {
  if (commitment.ownerId !== actorId) {
    throw new ConsentError("Only the confirmed owner can stop resurfacing.");
  }
  return stamp(commitment, now, {
    state: "dropped",
    resolvedAt: now.toISOString(),
  });
}

export function markResurfaced(commitment: Commitment, meetingId: string, now: Date): Commitment {
  if (commitment.state !== "open") return commitment;
  if (commitment.suppressMeetingId === meetingId) return commitment;
  if (commitment.lastResurfacedMeetingId === meetingId) return commitment;
  if (commitment.resurfaceCount >= MAX_RESURFACES) {
    return stamp(commitment, now, {
      state: "needs_ownership",
      ownerId: null,
      proposedOwnerId: null,
      resolvedAt: null,
    });
  }
  return stamp(commitment, now, {
    resurfaceCount: commitment.resurfaceCount + 1,
    lastResurfacedMeetingId: meetingId,
  });
}

function isPendingConsentState(state: CommitmentState): boolean {
  return state === "needs_confirmation" || state === "handoff_pending";
}