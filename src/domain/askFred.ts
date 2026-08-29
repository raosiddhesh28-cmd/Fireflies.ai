import { isPendingConsent, isResolved, type Commitment, type Persona } from "./types.js";
import { statusLabel } from "./statusCategories.js";

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

  const wantsBlocked =
    /resource unavailable|dependency delayed|dependency missing|blocked/.test(q);

  let filtered = scoped;
  if (wantsBlocked) {
    filtered = scoped.filter((c) => {
      if (c.state === "completed" || c.state === "declined" || c.state === "dropped") return false;
      if (/resource unavailable/.test(q)) return c.statusCategory === "resource_unavailable";
      if (/dependency delayed/.test(q)) return c.statusCategory === "dependency_delayed";
      if (/dependency missing/.test(q)) return c.statusCategory === "dependency_missing";
      return (
        c.statusCategory === "resource_unavailable" ||
        c.statusCategory === "dependency_delayed" ||
        c.statusCategory === "dependency_missing"
      );
    });
  } else if (wantsResolved && !wantsOpen) {
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
      ? introOwner(q, filtered.length)
      : introRequester(q, filtered.length);

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
  const category = statusLabel(c.statusCategory);
  const status =
    persona === "requester"
      ? requesterSafeStatus(c)
      : category
        ? `${c.state} · ${category}`
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
  const category = statusLabel(c.statusCategory);
  if (c.state === "open") {
    return category ? `acknowledged, still open · ${category}` : "acknowledged, still open";
  }
  if (c.state === "completed") return "completed";
  if (c.state === "declined") return category ? `declined · ${category}` : "declined";
  if (c.state === "dropped") return "no longer tracked";
  if (isPendingConsent(c.state)) return category ?? "ownership not confirmed";
  if (c.state === "needs_ownership") return category ?? "needs ownership";
  return c.state;
}

function introOwner(q: string, count: number): string {
  if (/resource unavailable|dependency delayed|dependency missing|blocked/.test(q)) {
    return count
      ? `Found ${count} commitment${count === 1 ? "" : "s"} matching that blocker state.`
      : "Nothing currently flagged with that blocker.";
  }
  if (/agree/.test(q)) {
    return `You agreed to ${count} commitment${count === 1 ? "" : "s"} that still need you.`;
  }
  return `You have ${count} commitment${count === 1 ? "" : "s"} in your ownership loop.`;
}

function introRequester(q: string, count: number): string {
  if (/resolved/.test(q)) {
    return count
      ? "Here is the resolution status for what you are waiting on."
      : "Nothing you requested has a resolution recorded yet.";
  }
  return `You are waiting on ${count} item${count === 1 ? "" : "s"}. Ownership is shown only as confirmed or not — not as a chase list.`;
}
