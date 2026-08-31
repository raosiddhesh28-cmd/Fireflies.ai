import { isPendingConsent, isResolved, type Commitment, type Persona } from "./types.js";

export interface AskFredQuery {
  userId: string;
  persona: Persona;
  query: string;
}

export interface AskFredAnswer {
  text: string;
  items: Array<{
    id: string;
    text: string;
    status: string;
    acknowledged: boolean;
    meetingId: string;
  }>;
  confidence: "high" | "low";
}

export function answerAskFred(
  query: AskFredQuery,
  commitments: Commitment[],
): AskFredAnswer {
  if (query.persona === "manager") {
    return {
      text: "I can only discuss team-level resolution on the rollup. I will not list people or individual commitments.",
      items: [],
      confidence: "high",
    };
  }

  const q = query.query.toLowerCase();
  const scoped = scopeForPersona(query, commitments);

  if (q.includes("permission") || q.includes("someone else's")) {
    return {
      text: "You don’t have access to that commitment.",
      items: [],
      confidence: "high",
    };
  }

  if (scoped.length === 0) {
    return {
      text:
        query.persona === "owner"
          ? "You have no open or proposed commitments right now."
          : "You are not waiting on any tracked commitments right now.",
      items: [],
      confidence: "high",
    };
  }

  const wantsOpen = /open|remain|waiting|waiting on|unresolved|pending/.test(q);
  const wantsResolved = /resolved|complete|declined|done/.test(q);
  const wantsMine = /i (have|own|agree)|what did i|my commitment/.test(q);

  let filtered = scoped;
  if (wantsResolved && !wantsOpen) {
    filtered = scoped.filter((c) => isResolved(c.state));
  } else if (wantsOpen || wantsMine || query.persona === "requester") {
    filtered = scoped.filter((c) => !isResolved(c.state));
  }

  if (filtered.length === 0 && scoped.length > 0 && /not sure|same item|which/.test(q)) {
    return {
      text: "I’m not sure this is the same item. Open the transcript line from the meeting instead of guessing.",
      items: [],
      confidence: "low",
    };
  }

  const lines = filtered.slice(0, 8).map((c) => serialize(c, query.persona));
  const intro =
    query.persona === "owner"
      ? introOwner(q, filtered)
      : introRequester(q, filtered);

  return {
    text: intro,
    items: lines,
    confidence: "high",
  };
}

function scopeForPersona(query: AskFredQuery, commitments: Commitment[]): Commitment[] {
  if (query.persona === "owner") {
    return commitments.filter(
      (c) => c.ownerId === query.userId || c.proposedOwnerId === query.userId,
    );
  }
  return commitments.filter((c) => c.requesterId === query.userId);
}

function serialize(c: Commitment, persona: Persona) {
  const acknowledged = Boolean(c.ownerId) && c.state === "open";
  const status =
    persona === "requester"
      ? requesterSafeStatus(c)
      : c.state;
  return {
    id: c.id,
    text: c.text,
    status,
    acknowledged,
    meetingId: c.meetingId,
  };
}

function requesterSafeStatus(c: Commitment): string {
  if (c.state === "open") return "acknowledged, still open";
  if (c.state === "completed") return "completed";
  if (c.state === "declined") return "declined";
  if (c.state === "dropped") return "no longer tracked";
  if (isPendingConsent(c.state)) return "ownership not confirmed";
  if (c.state === "needs_ownership") return "needs ownership";
  return c.state;
}

function introOwner(q: string, items: ReturnType<typeof serialize>[]): string {
  if (/agree/.test(q)) {
    return `You agreed to ${items.length} commitment${items.length === 1 ? "" : "s"} that still need you.`;
  }
  return `You have ${items.length} commitment${items.length === 1 ? "" : "s"} in your ownership loop.`;
}

function introRequester(q: string, items: ReturnType<typeof serialize>[]): string {
  if (/resolved/.test(q)) {
    return items.length
      ? "Here is the resolution status for what you are waiting on."
      : "Nothing you requested has a resolution recorded yet.";
  }
  return `You are waiting on ${items.length} item${items.length === 1 ? "" : "s"}. Ownership is shown only as confirmed or not — not as a chase list.`;
}
