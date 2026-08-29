import { describe, expect, it } from "vitest";
import {
  accept,
  claim,
  complete,
  decline,
  dismissToBucket,
  drop,
  expireProposal,
  fromExtraction,
  redirect,
} from "./stateMachine.js";
import { ConsentError } from "./stateMachine.js";
import { PROPOSAL_TTL_MS } from "./types.js";
import { unresolvedForRecurringMeeting, applyResurfaceVisit } from "./resurfacing.js";
import { answerAskFred } from "./askFred.js";
import { assertPrivacyLock, computeManagerRollup } from "./privacyLock.js";
import { seedCommitments, MEETINGS, demoNow } from "./seed.js";
import type { Commitment } from "./types.js";

const now = demoNow();

function proposed(): Commitment {
  return fromExtraction(
    {
      id: "c1",
      meetingId: "mtg-sync-prev",
      text: "Do the thing",
      transcriptLine: "Alex: I'll do the thing.",
      suggestedOwnerId: "alex",
      requesterId: "blair",
      extractedAt: now.toISOString(),
      seriesId: "series-product-sync",
    },
    now,
  );
}

describe("ownership consent", () => {
  it("never assigns from extraction alone", () => {
    const c = proposed();
    expect(c.ownerId).toBeNull();
    expect(c.state).toBe("needs_confirmation");
  });

  it("lands in the loose-ends bucket when extraction has no owner", () => {
    const c = fromExtraction(
      {
        id: "c2",
        meetingId: "m",
        text: "Decide SSO",
        transcriptLine: "Can someone confirm SSO?",
        suggestedOwnerId: null,
        requesterId: "blair",
        extractedAt: now.toISOString(),
        seriesId: "series-product-sync",
      },
      now,
    );
    expect(c.state).toBe("needs_ownership");
  });

  it("rejects accept from anyone except the proposed person", () => {
    expect(() => accept(proposed(), "blair", now)).toThrow(ConsentError);
  });

  it("accept is explicit opt-in", () => {
    const next = accept(proposed(), "alex", now);
    expect(next.state).toBe("open");
    expect(next.ownerId).toBe("alex");
  });

  it("redirect proposes without assigning", () => {
    const next = redirect(proposed(), "alex", "casey", now);
    expect(next.state).toBe("handoff_pending");
    expect(next.ownerId).toBeNull();
    expect(next.proposedOwnerId).toBe("casey");
  });

  it("expired proposals become unowned, not silently assigned", () => {
    const stale = {
      ...proposed(),
      updatedAt: new Date(now.getTime() - PROPOSAL_TTL_MS - 1).toISOString(),
    };
    const next = expireProposal(stale, now);
    expect(next.state).toBe("needs_ownership");
    expect(next.ownerId).toBeNull();
    expect(next.proposedOwnerId).toBeNull();
  });
});

describe("decline and drop as resolution", () => {
  it("decline of an accepted item is a closed resolved state", () => {
    const owned = accept(proposed(), "alex", now);
    const next = decline(owned, "alex", now);
    expect(next.state).toBe("declined");
    expect(next.resolvedAt).toBeTruthy();
  });

  it("decline of a proposal is a tracked closed outcome, not a penalty flag", () => {
    const next = decline(proposed(), "alex", now);
    expect(next.state).toBe("declined");
    expect(next.resolvedAt).toBeTruthy();
  });

  it("drop is a legitimate resolution for not-a-commitment", () => {
    const next = drop(proposed(), "alex", now);
    expect(next.state).toBe("dropped");
  });

  it("complete requires confirmed ownership", () => {
    expect(() => complete(proposed(), "alex", now)).toThrow();
    const owned = accept(proposed(), "alex", now);
    expect(complete(owned, "alex", now).state).toBe("completed");
  });
});

describe("loose-ends claim", () => {
  it("claim is opt-in ownership from the bucket", () => {
    const bucket = dismissToBucket(proposed(), "alex", now);
    const claimed = claim(bucket, "casey", now);
    expect(claimed.ownerId).toBe("casey");
    expect(claimed.state).toBe("open");
  });
});

describe("resurfacing", () => {
  it("only surfaces open items for the same recurring series", () => {
    const owned = {
      ...accept(proposed(), "alex", now),
      meetingId: "mtg-sync-prev",
      seriesId: "series-product-sync",
    };
    const nextMeeting = MEETINGS.find((m) => m.id === "mtg-sync-next")!;
    const list = unresolvedForRecurringMeeting([owned], nextMeeting);
    expect(list).toHaveLength(1);
  });

  it("does not resurface into a cancelled meeting", () => {
    const owned = {
      ...accept(proposed(), "alex", now),
      seriesId: "series-product-sync",
    };
    const cancelled = MEETINGS.find((m) => m.id === "mtg-cancelled")!;
    expect(unresolvedForRecurringMeeting([owned], cancelled)).toHaveLength(0);
  });

  it("decays after the max resurface visits", () => {
    const nextMeeting = MEETINGS.find((m) => m.id === "mtg-sync-next")!;
    let items: Commitment[] = [
      {
        ...accept(proposed(), "alex", now),
        meetingId: "mtg-sync-prev",
        seriesId: "series-product-sync",
        resurfaceCount: 3,
      },
    ];
    items = applyResurfaceVisit(items, nextMeeting, now);
    expect(items[0].state).toBe("dropped");
  });
});

describe("AskFred", () => {
  it("keeps requester answers free of policing actions", () => {
    const owned = accept(proposed(), "alex", now);
    const answer = answerAskFred(
      { userId: "blair", persona: "requester", query: "What am I waiting on?" },
      [owned],
    );
    expect(answer.items[0].status).toContain("acknowledged");
    expect(answer.text.toLowerCase()).not.toContain("reassign");
  });

  it("does not let a manager enumerate people", () => {
    const answer = answerAskFred(
      { userId: "dana", persona: "manager", query: "Who is behind?" },
      seedCommitments(now),
    );
    expect(answer.items).toHaveLength(0);
  });
});

describe("manager privacy lock", () => {
  it("returns only aggregates", () => {
    const rollup = computeManagerRollup(seedCommitments(now), now);
    expect(rollup.currentRate).toBeGreaterThanOrEqual(0);
    expect(rollup.targetRate).toBe(0.45);
    expect(() => assertPrivacyLock(rollup)).not.toThrow();
  });

  it("rejects individual drill-down payloads", () => {
    expect(() =>
      assertPrivacyLock({ currentRate: 0.4, users: [{ name: "Alex" }] }),
    ).toThrow(/Privacy lock/);
  });
});
