import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  api,
  type AskFredAnswer,
  type Commitment,
  type ManagerRollup,
  type Meeting,
  type User,
} from "./api";
import {
  DECLINE_REASONS,
  DEPENDENCY_FLAGS,
  QUALITY_FLAGS,
  STATUS_META,
  isResurfacePriority,
  type StatusCategory,
} from "../domain/statusCategories";

type Tab = "home" | "bucket" | "meeting" | "askfred" | "manager";

export function App() {
  const [users, setUsers] = useState<User[]>([]);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [userId, setUserId] = useState("alex");
  const [tab, setTab] = useState<Tab>("home");
  const [proposed, setProposed] = useState<Commitment[]>([]);
  const [owned, setOwned] = useState<Commitment[]>([]);
  const [bucket, setBucket] = useState<Commitment[]>([]);
  const [waiting, setWaiting] = useState<Commitment[]>([]);
  const [active, setActive] = useState<Commitment | null>(null);
  const [redirectFor, setRedirectFor] = useState<Commitment | null>(null);
  const [clarifyFor, setClarifyFor] = useState<Commitment | null>(null);
  const [clarifyText, setClarifyText] = useState("");
  const [declineFor, setDeclineFor] = useState<Commitment | null>(null);
  const [completeFor, setCompleteFor] = useState<Commitment | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resurface, setResurface] = useState<Commitment[]>([]);
  const [askQuery, setAskQuery] = useState("What remains open?");
  const [askPersona, setAskPersona] = useState<"owner" | "requester">("owner");
  const [askAnswer, setAskAnswer] = useState<AskFredAnswer | null>(null);
  const [rollup, setRollup] = useState<ManagerRollup | null>(null);

  const nextMeeting = meetings.find((m) => m.id === "mtg-sync-next");

  const refresh = useCallback(async () => {
    const [p, o, b, w] = await Promise.all([
      api.commitments(userId, "proposed"),
      api.commitments(userId, "owned"),
      api.commitments(userId, "loose-ends"),
      api.commitments(userId, "waiting"),
    ]);
    setProposed(p.commitments);
    setOwned(o.commitments);
    setBucket(b.commitments);
    setWaiting(w.commitments);
    setActive((cur) => (cur ? [...p.commitments, ...o.commitments, ...b.commitments, ...w.commitments].find((c) => c.id === cur.id) ?? cur : cur));
  }, [userId]);

  useEffect(() => {
    api.session().then((s) => {
      setUsers(s.users);
      setMeetings(s.meetings);
    });
  }, []);

  useEffect(() => {
    refresh().catch((e) => setError(e.message));
  }, [refresh]);

  useEffect(() => {
    if (tab === "meeting" && nextMeeting) {
      api.resurface(nextMeeting.id).then((r) => setResurface(r.commitments));
    }
    if (tab === "manager") {
      api.rollup().then(setRollup);
    }
  }, [tab, nextMeeting, userId]);

  const nameOf = useMemo(() => {
    const map = Object.fromEntries(users.map((u) => [u.id, u.name]));
    return (id: string | null) => (id ? map[id] ?? id : "Unowned");
  }, [users]);

  async function act(id: string, action: string, extra: Record<string, string> = {}) {
    setError(null);
    try {
      const result = await api.act(id, action, { actorId: userId, ...extra });
      setToast(successCopy(action, result.commitment));
      setRedirectFor(null);
      setClarifyFor(null);
      setDeclineFor(null);
      setCompleteFor(null);
      await refresh();
      if (tab === "meeting" && nextMeeting) {
        const r = await api.resurface(nextMeeting.id);
        setResurface(r.commitments);
      }
      if (tab === "manager") setRollup(await api.rollup());
    } catch (e) {
      setError((e as Error).message);
    }
  }

  async function ask() {
    const answer = await api.askFred(userId, askPersona, askQuery);
    setAskAnswer(answer);
  }

  return (
    <div className="shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">Fireflies.ai · in-product</p>
          <h1>Commitments</h1>
        </div>
        <label className="persona">
          Viewing as
          <select
            value={userId}
            onChange={(e) => {
              setUserId(e.target.value);
              setAskAnswer(null);
              setActive(null);
            }}
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
                {u.role === "manager" ? " (manager)" : ""}
              </option>
            ))}
          </select>
        </label>
      </header>

      <nav className="tabs">
        {(
          [
            ["home", "Home"],
            ["bucket", "Loose ends"],
            ["meeting", "Next meeting"],
            ["askfred", "AskFred"],
            ["manager", "Team rollup"],
          ] as const
        ).map(([id, label]) => (
          <button key={id} className={tab === id ? "active" : ""} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </nav>

      {toast && (
        <div className="toast" role="status">
          {toast}
          <button onClick={() => setToast(null)}>Dismiss</button>
        </div>
      )}
      {error && <div className="error">{error}</div>}

      {tab === "home" && (
        <Home
          proposed={proposed}
          owned={owned}
          waiting={waiting}
          nameOf={nameOf}
          onOpen={setActive}
          onAccept={(c) => act(c.id, "accept")}
          onDecline={setDeclineFor}
          onRedirect={setRedirectFor}
        />
      )}

      {tab === "bucket" && (
        <LooseEnds
          items={bucket}
          nameOf={nameOf}
          onOpen={setActive}
          onClaim={(c) => act(c.id, "claim")}
          onRedirect={setRedirectFor}
        />
      )}

      {tab === "meeting" && nextMeeting && (
        <MeetingSurface
          meeting={nextMeeting}
          items={resurface}
          nameOf={nameOf}
          userId={userId}
          onComplete={setCompleteFor}
          onDecline={setDeclineFor}
          onKeepOpen={(c) => act(c.id, "keep-open", { meetingId: nextMeeting.id })}
          onStop={(c) => act(c.id, "stop-resurface")}
        />
      )}

      {tab === "askfred" && (
        <AskFred
          query={askQuery}
          setQuery={setAskQuery}
          answer={askAnswer}
          onAsk={ask}
          askPersona={askPersona}
          setAskPersona={setAskPersona}
        />
      )}

      {tab === "manager" && rollup && <ManagerView rollup={rollup} />}

      {active && (
        <Detail
          item={active}
          nameOf={nameOf}
          meetings={meetings}
          userId={userId}
          onClose={() => setActive(null)}
          onAccept={() => act(active.id, "accept")}
          onDecline={() => setDeclineFor(active)}
          onComplete={() => setCompleteFor(active)}
          onDismiss={() => act(active.id, "dismiss")}
          onDrop={() => act(active.id, "drop")}
          onClaim={() => act(active.id, "claim")}
          onRedirect={() => setRedirectFor(active)}
          onFlag={(category) => act(active.id, "flag", { category })}
          onClarify={() => {
            setClarifyText(active.text);
            setClarifyFor(active);
          }}
        />
      )}

      {redirectFor && (
        <Modal title="Redirect — propose, don’t assign" onClose={() => setRedirectFor(null)}>
          <p>The next person still has to accept. This will not force ownership.</p>
          <div className="stack">
            {users
              .filter((u) => u.id !== userId && u.role !== "manager")
              .map((u) => (
                <button key={u.id} className="secondary" onClick={() => act(redirectFor.id, "redirect", { targetUserId: u.id })}>
                  Propose {u.name}
                </button>
              ))}
          </div>
        </Modal>
      )}

      {declineFor && (
        <Modal title="Decline — choose a legitimate reason" onClose={() => setDeclineFor(null)}>
          <p>Declining is an honest close. Categorize it so the record stays useful, not punitive.</p>
          <div className="stack">
            {DECLINE_REASONS.map((reason) => (
              <button
                key={reason}
                className="secondary"
                onClick={() => act(declineFor.id, "decline", { reason })}
              >
                {STATUS_META[reason].label}
              </button>
            ))}
          </div>
        </Modal>
      )}

      {completeFor && (
        <Modal title="Verify before archiving" onClose={() => setCompleteFor(null)}>
          <p>If this is only partly done, failed quality, or needs rework, flag it. It stays open.</p>
          <div className="stack">
            {QUALITY_FLAGS.map((flag) => (
              <button
                key={flag}
                className="secondary"
                onClick={() => act(completeFor.id, "complete", { verification: flag })}
              >
                {STATUS_META[flag].label} — keep open
              </button>
            ))}
            <button className="secondary" onClick={() => act(completeFor.id, "complete")}>Archive as complete</button>
          </div>
        </Modal>
      )}

      {clarifyFor && (
        <Modal title="Clarify the commitment" onClose={() => setClarifyFor(null)}>
          <textarea value={clarifyText} onChange={(e) => setClarifyText(e.target.value)} />
          <button onClick={() => act(clarifyFor.id, "clarify", { text: clarifyText })}>Save wording</button>
        </Modal>
      )}
    </div>
  );
}

function Home(props: {
  proposed: Commitment[];
  owned: Commitment[];
  waiting: Commitment[];
  nameOf: (id: string | null) => string;
  onOpen: (c: Commitment) => void;
  onAccept: (c: Commitment) => void;
  onDecline: (c: Commitment) => void;
  onRedirect: (c: Commitment) => void;
}) {
  return (
    <main className="layout">
      <section>
        <h2>Acceptance tap</h2>
        <p className="lede">The system proposed you. Nothing is yours until you opt in.</p>
        {props.proposed.length === 0 && <Empty text="No proposals waiting on you." />}
        {props.proposed.map((c) => (
          <article key={c.id} className="card tap">
            <StatusChip state={c.state} category={c.statusCategory} />
            <h3>{c.text}</h3>
            <blockquote>“{c.transcriptLine}”</blockquote>
            <p className="meta">Requested in meeting context · {c.redirectedBy ? `Proposed after redirect` : "Proposed from extraction"}</p>
            <div className="actions">
              <button className="secondary" onClick={() => props.onAccept(c)}>Accept</button>
              <button className="secondary" onClick={() => props.onRedirect(c)}>
                Redirect
              </button>
              <button className="ghost" onClick={() => props.onDecline(c)}>
                Decline
              </button>
              <button className="ghost" onClick={() => props.onOpen(c)}>
                Details
              </button>
            </div>
          </article>
        ))}
      </section>
      <section>
        <h2>You own</h2>
        {props.owned.length === 0 && <Empty text="No accepted open commitments." />}
        {props.owned.map((c) => (
          <button key={c.id} className="row" onClick={() => props.onOpen(c)}>
            <span>{c.text}</span>
            <StatusChip state={c.state} category={c.statusCategory} />
          </button>
        ))}
        <h2>You’re waiting on</h2>
        <p className="lede">Status only — no chase or assign controls.</p>
        {props.waiting.filter((c) => c.state !== "completed" && c.state !== "declined" && c.state !== "dropped").length === 0 && (
          <Empty text="Nothing open that you requested." />
        )}
        {props.waiting
          .filter((c) => c.state !== "completed" && c.state !== "declined" && c.state !== "dropped")
          .map((c) => (
            <button key={c.id} className="row" onClick={() => props.onOpen(c)}>
              <span>{c.text}</span>
              <StatusChip state={c.state} category={c.statusCategory} audience="requester" />
            </button>
          ))}
      </section>
    </main>
  );
}

function LooseEnds(props: {
  items: Commitment[];
  nameOf: (id: string | null) => string;
  onOpen: (c: Commitment) => void;
  onClaim: (c: Commitment) => void;
  onRedirect: (c: Commitment) => void;
}) {
  return (
    <main className="layout">
      <section>
        <h2>Loose-ends bucket</h2>
        <p className="lede">Shared awareness, not a failure list. Unowned extractions start as Not accepted.</p>
        {props.items.length === 0 && <Empty text="The bucket is clear." />}
        {props.items.map((c) => (
          <article key={c.id} className="card">
            <StatusChip state={c.state} category={c.statusCategory} />
            <h3>{c.text}</h3>
            <blockquote>“{c.transcriptLine}”</blockquote>
            <div className="actions">
              <button className="secondary" onClick={() => props.onClaim(c)}>Claim it</button>
              <button className="secondary" onClick={() => props.onRedirect(c)}>
                Propose someone
              </button>
              <button className="ghost" onClick={() => props.onOpen(c)}>
                Details
              </button>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}

function MeetingSurface(props: {
  meeting: Meeting;
  items: Commitment[];
  nameOf: (id: string | null) => string;
  userId: string;
  onComplete: (c: Commitment) => void;
  onDecline: (c: Commitment) => void;
  onKeepOpen: (c: Commitment) => void;
  onStop: (c: Commitment) => void;
}) {
  return (
    <main className="layout">
      <section>
        <p className="eyebrow">{new Date(props.meeting.startsAt).toUTCString()}</p>
        <h2>{props.meeting.title}</h2>
        <p className="lede">
          Unresolved items for this recurring group. Not started, deadline missed, and communication failure are listed first.
        </p>
        {props.items.length === 0 && <Empty text="Nothing from this series needs to come up today." />}
        {props.items.map((c) => (
          <article key={c.id} className={`card resurface${isResurfacePriority(c.statusCategory) ? " priority" : ""}`}>
            <StatusChip state={c.state} category={c.statusCategory} />
            <h3>{c.text}</h3>
            <blockquote>“{c.transcriptLine}”</blockquote>
            <p className="meta">
              Owner {props.nameOf(c.ownerId)} · resurfaced {c.resurfaceCount} of 2
            </p>
            {c.ownerId === props.userId ? (
              <div className="actions">
                <button className="secondary" onClick={() => props.onComplete(c)}>Complete</button>
                <button className="ghost" onClick={() => props.onDecline(c)}>
                  Decline
                </button>
                <button className="secondary" onClick={() => props.onKeepOpen(c)}>
                  Keep open
                </button>
                <button className="ghost" onClick={() => props.onStop(c)}>
                  Don’t bring this up again
                </button>
              </div>
            ) : (
              <p className="meta">Visible for context. Only the owner can resolve it.</p>
            )}
          </article>
        ))}
      </section>
    </main>
  );
}

function AskFred(props: {
  query: string;
  setQuery: (v: string) => string | void;
  answer: AskFredAnswer | null;
  onAsk: () => void;
  askPersona: "owner" | "requester";
  setAskPersona: (v: "owner" | "requester") => void;
}) {
  return (
    <main className="layout">
      <section className="card">
        <h2>AskFred</h2>
        <p className="lede">Pull-based. Ask what you own, what you are waiting on, or what is blocked by a delayed dependency or unavailable resource.</p>
        <div className="ask-row">
          <label className="persona">
            Persona
            <select
              value={props.askPersona}
              onChange={(e) => props.setAskPersona(e.target.value as "owner" | "requester")}
            >
              <option value="owner">Owner</option>
              <option value="requester">Requester</option>
            </select>
          </label>
          <textarea value={props.query} onChange={(e) => props.setQuery(e.target.value)} />
        </div>
        <button onClick={props.onAsk}>Ask</button>
        {props.answer && (
          <div className="answer">
            <p>{props.answer.text}</p>
            <p className="meta">Confidence: {props.answer.confidence}</p>
            <ul>
              {props.answer.items.map((item) => (
                <li key={item.id}>
                  {item.text} — {item.status}
                  {item.acknowledged ? " · acknowledged" : ""}
                </li>
              ))}
            </ul>
          </div>
        )}
      </section>
    </main>
  );
}

function ManagerView({ rollup }: { rollup: ManagerRollup }) {
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  return (
    <main className="layout">
      <section>
        <h2>Team resolution</h2>
        <p className="lede">
          14-day team rate only. Individual drill-down is architecturally disabled (privacy lock).
        </p>
        <div className="metrics">
          <div className="metric">
            <span>Current</span>
            <strong>{pct(rollup.currentRate)}</strong>
          </div>
          <div className="metric">
            <span>Baseline</span>
            <strong>{pct(rollup.baselineRate)}</strong>
          </div>
          <div className="metric">
            <span>Target</span>
            <strong>{pct(rollup.targetRate)}</strong>
          </div>
        </div>
        <p className="meta">
          {rollup.resolvedInWindow} resolved of {rollup.createdInWindow} created in {rollup.windowDays} days
          · completed {rollup.byOutcome.completed} · declined {rollup.byOutcome.declined} · dropped {rollup.byOutcome.dropped}
        </p>
        <div className="bars">
          {rollup.trend.map((t) => (
            <div key={t.period} className="bar">
              <div style={{ height: `${Math.max(6, t.rate * 140)}px` }} />
              <span>
                {t.period}
                <br />
                {pct(t.rate)}
              </span>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

function Detail(props: {
  item: Commitment;
  nameOf: (id: string | null) => string;
  meetings: Meeting[];
  userId: string;
  onClose: () => void;
  onAccept: () => void;
  onDecline: () => void;
  onComplete: () => void;
  onDismiss: () => void;
  onDrop: () => void;
  onClaim: () => void;
  onRedirect: () => void;
  onClarify: () => void;
  onFlag: (category: string) => void;
}) {
  const c = props.item;
  const proposedToMe = c.proposedOwnerId === props.userId;
  const isOwner = c.ownerId === props.userId;
  return (
    <Modal title="Commitment" onClose={props.onClose}>
      <StatusChip state={c.state} category={c.statusCategory} />
      {c.verificationHold && <p className="meta">Held at quality gate — not archived.</p>}
      <h3>{c.text}</h3>
      <blockquote>“{c.transcriptLine}”</blockquote>
      <p className="meta">Requester {props.nameOf(c.requesterId)} · proposed {props.nameOf(c.proposedOwnerId)}</p>
      <div className="actions">
        {proposedToMe && (c.state === "needs_confirmation" || c.state === "handoff_pending") && (
          <>
            <button className="secondary" onClick={props.onAccept}>Accept</button>
            <button className="secondary" onClick={props.onRedirect}>
              Redirect
            </button>
            <button className="ghost" onClick={props.onClarify}>
              Clarify
            </button>
            <button className="ghost" onClick={props.onDecline}>
              Decline
            </button>
            <button className="ghost" onClick={props.onDismiss}>
              Send to loose ends
            </button>
            <button className="ghost" onClick={props.onDrop}>
              Not a commitment
            </button>
          </>
        )}
        {isOwner && c.state === "open" && (
          <>
            <button className="secondary" onClick={props.onComplete}>Complete</button>
            <button className="ghost" onClick={props.onDecline}>
              Decline
            </button>
            <button className="secondary" onClick={props.onRedirect}>
              Redirect
            </button>
            <button className="ghost" onClick={props.onDrop}>
              No longer relevant
            </button>
          </>
        )}
        {c.state === "needs_ownership" && (
          <>
            <button className="secondary" onClick={props.onClaim}>Claim it</button>
            <button className="secondary" onClick={props.onRedirect}>
              Propose someone
            </button>
          </>
        )}
      </div>
      {isOwner && c.state === "open" && (
        <div className="flag-block">
          <p className="meta">Dependencies (stay open — not a failed commitment)</p>
          <div className="actions">
            {DEPENDENCY_FLAGS.map((flag) => (
              <button key={flag} className="ghost" onClick={() => props.onFlag(flag)}>
                {STATUS_META[flag].label}
              </button>
            ))}
          </div>
          <p className="meta">Execution signals</p>
          <div className="actions">
            {(["not_started", "competing_priorities", "deadline_missed", "communication_failure", "resource_unavailable"] as const).map(
              (flag) => (
                <button key={flag} className="ghost" onClick={() => props.onFlag(flag)}>
                  {STATUS_META[flag].label}
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </Modal>
  );
}

function Modal(props: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="overlay" onClick={props.onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} role="dialog">
        <div className="modal-head">
          <h2>{props.title}</h2>
          <button className="ghost" onClick={props.onClose}>
            Close
          </button>
        </div>
        {props.children}
      </div>
    </div>
  );
}

function StatusChip({
  state,
  audience = "owner",
  category,
}: {
  state: string;
  audience?: "owner" | "requester";
  category?: StatusCategory | null;
}) {
  return (
    <span className={`chip ${state} ${category ?? ""}`}>
      {label(state, audience)}
      {category ? ` · ${STATUS_META[category].label}` : ""}
    </span>
  );
}

function Empty({ text }: { text: string }) {
  return <p className="empty">{text}</p>;
}

function label(state: string, audience: "owner" | "requester" = "owner") {
  if (audience === "requester") {
    const requester: Record<string, string> = {
      needs_confirmation: "Ownership not confirmed",
      handoff_pending: "Ownership not confirmed",
      needs_ownership: "Needs ownership",
      open: "Acknowledged, open",
      completed: "Completed",
      declined: "Declined",
      dropped: "Dropped",
    };
    return requester[state] ?? state;
  }
  const map: Record<string, string> = {
    needs_confirmation: "Needs your opt-in",
    handoff_pending: "Proposed to you",
    needs_ownership: "Needs ownership",
    open: "Open",
    completed: "Completed",
    declined: "Declined",
    dropped: "Dropped",
  };
  return map[state] ?? state;
}

function successCopy(action: string, c: Commitment): string {
  if (action === "accept") return "You accepted ownership. It is now yours to resolve.";
  if (action === "redirect") return "Proposed to someone else. They still have to accept — it is not assigned.";
  if (action === "decline") return "Recorded as declined. That is a legitimate resolution, not a failure.";
  if (action === "complete") {
    return c.verificationHold
      ? `Held at quality gate (${STATUS_META[c.statusCategory].label}). Not archived.`
      : "Marked complete.";
  }
  if (action === "flag") return `Flagged ${STATUS_META[c.statusCategory].label}. Commitment stays open.`;
  if (action === "claim") return "You claimed this from the loose-ends bucket.";
  if (action === "dismiss") return "Moved to the loose-ends bucket. Still visible, still unowned.";
  if (action === "drop") return "Dropped. Tracked as no longer relevant / not a commitment.";
  if (action === "keep-open") return "Kept open. It will not resurface in this meeting again.";
  if (action === "stop-resurface") return "Stopped resurfacing. Recorded as dropped, not as a performance miss.";
  return `Updated · ${c.state}`;
}
