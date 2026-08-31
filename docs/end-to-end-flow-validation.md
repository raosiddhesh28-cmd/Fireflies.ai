# End-to-End Flow Validation (implemented product)

**Product:** Fireflies.ai in-product commitment ownership, follow-through, and honest resolution  
**Review stance:** Senior PM / Principal UX / UX QA  
**Date:** 2026-08-31  
**Verdict:** **FLOW INCOMPLETE — do not approve for production**

**Source of truth used in this review**

1. Product principles, personas, and five core capabilities in the original review brief (opt-in ownership, Loose-Ends, Decline-as-outcome, resurfacing with decay, pull-based AskFred, no surveillance).
2. The **running product** restored from the archived agent lineage (`src/ui/App.tsx`, `src/domain/stateMachine.ts`, AskFred, resurfacing, privacy lock, upload extraction, demo seed).
3. The prior catalog review (`docs/end-to-end-flow-validation-catalog.md`, completeness **3.5/10**) as a baseline of what was missing on paper.

**What this unarchive review is not**

This is not a redesign. It maps the **connected system that now exists**, then flags remaining journeys with no next step or no honest end state. SCREEN_* numbers from the old prototype memo are mapped to product surfaces; undescribed Figma frames are no longer treated as the live source of truth.

---

# 1. Overall Flow Health Assessment

| Metric | Catalog (2026-08-29) | Implemented (this review) |
|---|---|---|
| **Overall Flow Completeness Score** | **3.5 / 10** | **6.8 / 10** |
| Complete flows (entry → intentional end, both personas where required) | 2 | **9** |
| Missing flows | 11 | **7** |
| Dead ends | 9 | **5** |
| Missing states | 7 | **2** (History / undo window; blocked-or-partial note) |
| Orphan screens | ~25 undescribed frames | **1** (Upload result cards have no actions) |
| Required screen additions | 3 | **2** (Owner/Requester History; post-upload Acceptance Tap handoff) |
| Required existing-screen or modal modifications | 9 | **6** |

**Why 6.8, not 9:** The original critical holes — **Handoff pending**, **dismiss/timeout → Loose-Ends**, **Decline and Not-a-commitment on the proposal**, **recipient Acceptance Tap**, **resurface decay (max 2 → bucket)**, **AskFred Owner vs Requester split**, **no requester Reassign** — are implemented in the state machine and on the corresponding surfaces. Completeness is no longer blocked by an unmodeled ownership send.

**Why not approve:** Requester **cannot see terminal outcomes on Home** (completed / declined / dropped are filtered out of “You’re waiting on”). Owner has **no History**. **Undo does not exist**. Keep Open / stop-resurface live **only** on Next meeting, not on the owned-item detail. Hitting the resurface cap **strips `ownerId` and dumps the item in Loose-Ends** with no owner-facing explanation. Detail for a requester still **names the proposed person**. Those are still connected-system failures.

**Complete flows (narrow definition: defined destination + honest state)**

1. Proposed owner on Home Acceptance Tap → Accept → You own → Details → Mark complete (Owner local end).
2. Same → Decline from proposal or from owned detail (Owner local end; copy treats decline as legitimate).
3. Redirect → `handoff_pending` → target sees Acceptance Tap → Accept or Decline or Send to loose ends.
4. Dismiss / 3-day TTL → `needs_ownership` → Loose-Ends → Claim.
5. Extraction with no suggested owner → Loose-Ends.
6. Next meeting resurface (owner) → Complete / Decline / Keep open (this meeting) / Don’t bring this up again (`dropped`).
7. AskFred Owner: open/proposed items, pull-only, no assign CTA.
8. AskFred Requester: waiting items with “ownership not confirmed” vs “acknowledged”, no Reassign.
9. Manager Team rollup: aggregate rates only; privacy lock rejects individual fields.

---

# 2. Complete Persona Flow Maps

Surfaces in this product (catalog mapping):

| Product surface | Catalog analogue |
|---|---|
| Home · Acceptance tap | `SCREEN_37` |
| Home · You own | Dashboard / `SCREEN_34` list |
| Home · You’re waiting on | Requester visibility (was missing) |
| Details modal | `SCREEN_34` / `35` combined |
| Redirect modal | `SCREEN_36` (search/propose only — collision **fixed**) |
| Clarify modal | `SCREEN_35` |
| Loose ends tab | `SCREEN_9` / `8` / `6` |
| Next meeting | `SCREEN_13` |
| AskFred tab | `SCREEN_3` + Owner surface (**was missing**) |
| Team rollup | Manager (not in original 37-frame catalog) |
| Upload | New entry (not in catalog) |

---

## Commitment Owner

### Flow A — Detection / Acceptance Tap

**TRIGGER:** AI extraction (`fromExtraction`) proposes this user, or another user redirects to them (`handoff_pending`).

↓

**SCREEN / STATE:** Home → Acceptance tap (`needs_confirmation` or `handoff_pending`)

**USER CAN:**

- Accept
- Redirect
- Decline
- Details → Clarify, Send to loose ends, Not a commitment

**USER CANNOT on the card (must open Details):** Clarify, Dismiss, Not a commitment. Acceptable if Details is obvious; **Discoverability issue:** those three are one extra click with no hint on the card.

**DECISION POINT:** Does this person confirm ownership of this wording?

**IF Accept:**

→ System: `ownerId = actor`, `state = open`.  
→ Next: toast; item moves to **You own**.  
→ Requester Home: “Acknowledged, open” **if still unfiltered** — yes for `open`.  
→ End of step: owned open commitment. **OK.**

**IF Redirect:**

→ Modal: “propose, don’t assign.” Target list excludes self and manager.  
→ System: `handoff_pending`, `ownerId = null`, `proposedOwnerId = target`.  
→ Current user: card leaves their tap.  
→ Target: Acceptance tap. **OK — this was Critical in the catalog review.**  
→ If target never acts: `expireProposal` after `PROPOSAL_TTL_MS` (3 days) → Loose-Ends. **OK in domain; no UI countdown.**

**IF Decline (on card or Details):**

→ System: `declined` (proposal path does not require prior `open`).  
→ Toast: legitimate resolution.  
→ Requester Home: item **disappears** (terminal states filtered). **MISSING HANDOFF for Requester.**

**IF Details → Send to loose ends:**

→ `needs_ownership`, proposed owner cleared. **OK.**

**IF Details → Not a commitment:**

→ `dropped`. **OK for AI-wrong.** Requester still cannot find it on Home.

**IF Clarify:**

→ Save wording only; does **not** imply Accept. Cancel/Close on modal. **OK vs catalog ambiguity.**  
→ Empty text rejected by API. **OK.**

**IF No response:**

→ Still on Home until TTL. No silent auto-assign. **OK.** TTL is invisible.

**IF Close Details / overlay click:**

→ Returns to Home. **OK.**

---

### Flow B — Resolve an owned commitment

**TRIGGER:** Owner opens an item from You own.

↓

**SCREEN / STATE:** Details (`open`)

**USER CAN:** Complete, Decline, Redirect, No longer relevant.

**USER CANNOT here:** Keep Open, Stop resurfacing (those exist only on Next meeting). **MISSING FLOW on this surface.**

**IF Mark Complete:**

→ `completed`. Item vanishes from You own. **No History. DEAD END for later lookup.**  
→ Requester Home: vanished. AskFred Requester with a “resolved” query can still see it. **Handoff exists only if Requester knows to ask AskFred.**

**IF Decline:**

→ No confirmation modal (catalog `SCREEN_17` was dropped). One click, toast, gone. **Recoverability gap (no undo).** Honest copy: OK.

**IF Redirect from owned:**

→ Same handoff_pending as Flow A. Owner loses `ownerId` immediately. **OK consent; abrupt for Owner if they mis-tap (no undo).**

**IF No longer relevant:**

→ `dropped`. Same History/Requester Home gap.

---

### Flow C — Resurfacing

**TRIGGER:** Owner (or anyone) opens **Next meeting**. `GET /api/meetings/:id/resurface` **mutates** `resurfaceCount` via `applyResurfaceVisit`.

↓

**SCREEN / STATE:** Next meeting cards (forced chip `open`)

**IF Owner:** Complete, Decline, Keep open, Don’t bring this up again.

**IF Not owner:** “Visible for context. Only the owner can resolve it.” **OK — not a public shame list of inaction, but owner **name** is shown.** Neutral-ish.

**IF Keep open:** `suppressMeetingId` for this meeting only. Will still appear in a later meeting. **Decay is not this control; cap is.**

**IF Don’t bring this up again:** `dropped` (not a performance miss in toast). **OK graceful stop.**

**IF ignore the tab:** Count still increments because **opening the tab visits the endpoint**. A curious Requester or Manager viewing Next meeting burns a resurface for the Owner. **Broken junction.**

**IF `resurfaceCount >= MAX_RESURFACES` (2):** `markResurfaced` sets `needs_ownership` and **clears ownerId**. Item leaves You own and appears in Loose-Ends. Owner is not told why. **This is a silent ownership revocation — High severity, anti-trust if it feels like punishment.**

**IF meeting.cancelled:** resurface list empty; no resurrection. **OK (edge 9).**

---

### Flow D — AskFred (Owner)

**TRIGGER:** AskFred tab, persona = Owner (independent of “Viewing as”).

**USER CAN:** Type a question, Ask.

**USER CANNOT:** Navigate to a commitment from the answer list (IDs are inert). **MISSING FLOW.**  
**USER CAN:** Set persona to Requester while still “Viewing as” Alex — cross-persona leak by **self-service toggle**, not ACL. Demo-acceptable; production **must bind persona to the signed-in user**.

---

## Commitment Requester / Stakeholder

### Flow E — Waiting on

**TRIGGER:** Home as the person in `requesterId`.

↓

**SCREEN / STATE:** You’re waiting on — **status only, no chase controls.** Matches principle.

**USER CAN:** Open Details (read). Chip: Ownership not confirmed / Needs ownership / Acknowledged, open.

**USER CANNOT:** Reassign, nudge, Accept for someone else. **OK.**

**IF Owner completes / declines / drops:**

→ Filter `state !== completed && !== declined && !== dropped` **removes the row**. Requester’s question “has this been resolved?” is **unanswered on Home**. **MISSING FLOW (same critical gap as catalog, only AskFred can fill it).**

**IF Owner accepts:**

→ “Acknowledged, open”. **OK.**

**IF Details as requester of an `open` item:**

→ No owner-resolution buttons (not proposed-to-me, not owner). Close only. **OK.**  
→ Meta still shows **“proposed {name}”** even when requester should only see confirmed vs not. **Persona boundary leak.**

---

### Flow F — Loose-Ends (shared)

**TRIGGER:** Loose ends tab. **Not scoped to the viewer** — every `needs_ownership` item is listed for every user, including manager Dana.

**USER CAN:** Claim it, Propose someone, Details.

**IF Claim:** opt-in `open`. **OK.**  
**IF Propose:** handoff_pending. **OK.**  
**Principle risk:** a global bucket can become “who failed to accept.” Copy says it is not a failure list; **no names of people who dismissed** are shown — good. Items are still org-wide.

**Drop from bucket:** Details for `needs_ownership` does **not** offer “no longer relevant.” Only Claim / Propose. Requester cannot close a stale unowned item. **MISSING FLOW (edge 6/12).**

---

### Flow G — AskFred (Requester)

No Reassign. Status vocabulary is non-policing. Empty: “You are not waiting on any tracked commitments.” **OK.**  
Resolved query path exists in `answerAskFred` if the user asks about resolved/complete/declined. **Not discoverable from Home.**

---

## Manager

### Flow H — Team rollup

14-day rate, baseline 28%, target 45%, completed/declined/dropped all count. Privacy lock on individual keys. AskFred manager persona (API-only) refuses people lists. **OK for anti-surveillance.**  
No path from rollup into a person. **Intentional.**

---

## Upload (new entry)

**TRIGGER:** Upload tab → Process meeting.

**IF success:** Summary + extracted cards with status chip, **no Accept/Redirect**. User must infer Home. **Orphan result list / missing next step.**  
**IF video/audio file:** inline note, do not process. **OK.**  
**IF extraction 502:** error string. **OK.**  
**IF `requesterId` null from model:** stored as `""`; waiting view never shows it. **Broken requester handoff for that item.**

---

# 3. Action-to-Outcome Validation Table

| Screen/State | User Action | Expected System Response | Next State | Defined? | Issue |
|---|---|---|---|---|---|
| Acceptance tap | Accept | Opt-in owner | `open` on You own | **Yes** | — |
| Acceptance tap | Redirect | Propose other | `handoff_pending` on target Home | **Yes** | No TTL shown |
| Acceptance tap | Decline | Terminal declined | `declined` | **Yes** | No confirm; Requester Home hides it |
| Details (proposal) | Clarify save | Text only | Same consent state | **Yes** | Card does not advertise Clarify |
| Details (proposal) | Send to loose ends | Unowned | `needs_ownership` | **Yes** | — |
| Details (proposal) | Not a commitment | Dropped | `dropped` | **Yes** | Requester Home hides it |
| Details (open) | Complete | Terminal | `completed` | **Partial** | No History; no undo |
| Details (open) | Decline | Terminal | `declined` | **Partial** | No `SCREEN_17`; no undo |
| Details (open) | Redirect | Handoff | `handoff_pending` | **Yes** | No undo if mis-tap |
| Details (open) | Keep open | Suppress meeting | still `open` | **No on this screen** | Only Next meeting |
| Next meeting | Keep open | Suppress this meeting | `open` | **Yes** | One meeting only (documented) |
| Next meeting | Don’t bring up again | Stop | `dropped` | **Yes** | — |
| Next meeting | Open tab | Increment count | may cap → bucket | **Yes, harmful** | Visit = consume; any persona |
| Cap after 2 | (system) | Strip owner | `needs_ownership` | **Yes** | No explanation; feels punitive |
| Loose ends | Claim | Opt-in | `open` | **Yes** | — |
| Loose ends | Propose someone | Handoff | `handoff_pending` | **Yes** | Infinite redirect hops allowed |
| You’re waiting on | Open details | Read | same | **Partial** | Proposed name shown |
| You’re waiting on | (owner resolved) | See outcome | — | **No** | Row deleted |
| AskFred | Ask | Answer + items | stay | **Partial** | Items not clickable; persona toggle unbound |
| Upload results | (none) | — | Home (unstated) | **No** | Orphan cards |
| Toast | Dismiss | Hide toast | stay | **Yes** | — |
| Modal | Close / overlay | Dismiss | parent | **Yes** | Overlay-click is easy mis-cancel |
| Proposal TTL | time passes | Bucket | `needs_ownership` | **Yes domain** | No surface |

---

# 4. Missing Flows and Dead Ends

## Critical

### DEAD END 1 — Requester cannot see resolution on Home

**Where:** Home → You’re waiting on (`App.tsx` filter).  
**Persona:** Requester.  
**Trigger:** Owner Complete / Decline / Drop / proposal Decline.  
**Why:** The row is removed. The Requester need was “has this been acknowledged **or resolved**.”  
**Impact:** Forces chase or a lucky AskFred query. Violates the Requester contract.  
**Severity:** Critical  
**Fix:** **A.** Keep terminal items on Home under “Recently resolved” (status only, no chase). Do not add nag CTAs.

### DEAD END 2 — Owner has no History

**Where:** You own lists `view=owned` (`state === open` only).  
**Persona:** Owner.  
**Trigger:** Complete / Decline / Drop / stop-resurface.  
**Why:** The record is unfindable in-product except AskFred resolved queries.  
**Impact:** “Did I already close this?” has no place to look.  
**Severity:** Critical  
**Fix:** **C.** History section (Owner) — catalog `SCREEN_33`. Read-only terminals.

## High

### DEAD END 3 — Resurface cap silently un-owns

**Where:** `markResurfaced` when `resurfaceCount >= MAX_RESURFACES`.  
**Persona:** Owner (and Requester who still thinks it is acknowledged).  
**Trigger:** Two Next-meeting visits (including non-owner visits).  
**Why:** Consent was given; system revokes it into a shared bucket without an Owner confirmation.  
**Impact:** Looks like a failure list; Owner loses control.  
**Severity:** High  
**Fix:** **A.** Keep `ownerId`; overlay state `resurfaced_exhausted` **or** require Owner “release to Loose-Ends.” Do **not** auto-clear consent. Visiting the tab must not increment for non-owners.

### DEAD END 4 — Upload results do not enter the ownership loop

**Where:** Upload success list.  
**Persona:** Proposed owner (often the uploader, not necessarily).  
**Trigger:** Process meeting.  
**Why:** Cards have no actions; no “Go to Acceptance tap.”  
**Severity:** High  
**Fix:** **A.** Same Accept/Redirect/Decline actions as Home, or auto-switch tab to Home with toast.

### MISSING FLOW 5 — Keep Open / decay controls missing on owned detail

**Where:** Details for `open`.  
**Severity:** High  
**Fix:** **A.** Add Keep open (needs a meeting context picker) and Don’t bring this up again, or a single “Stop resurfacing” that does not require opening Next meeting.

## Medium

### DEAD END 6 — No undo / Decline confirm

Catalog `SCREEN_17`/`16` Undo is gone. Mis-tap Complete/Decline/Redirect is permanent.  
**Fix:** **B.** Short undo toast (already have toast infrastructure) restoring previous state.

### MISSING FLOW 7 — Stale Loose-End cannot be dropped by requester

**Fix:** **A.** Guarded “No longer relevant” on bucket Details for requester (not a public shame control).

### MISSING FLOW 8 — AskFred answers are not a junction

Items do not open Details.  
**Fix:** **A.** Click item → Details.

## Low

- Infinite redirect ping-pong (no hop cap; both can Redirect forever). Prefer hop limit then bucket.
- No UI for 3-day proposal TTL.
- Overlay click closes Redirect/Clarify (easy abort). Prefer Close button only for destructive-adjacent modals.
- Partial completion / blocked: only Keep open, no note field.
- Owner leaves team: no admin release-to-bucket.
- Duplicate detections across meetings: no merge (`seriesId` helps resurface, not identity).
- `requesterId ?? ""` on upload.

---

# 5. Missing Screens / Required Modifications

Prefer A → B → C.

### A. Home — Recently resolved (Requester + Owner)

**Purpose:** Close Dead Ends 1–2 without a task-manager.  
**Entry:** Same Home.  
**Show:** Terminal status chips only.  
**Actions:** None for Requester; Owner optional “Undo” in a short window.  
**Closes:** Cross-persona resolution visibility.

### A. Next meeting — do not mutate on GET for observers; do not strip owner on cap

**Purpose:** Decay without punishment.  
**Change:** Idempotent read vs explicit “shown in this meeting” write; cap → Owner prompt, not auto-unowned.

### A. Upload results — attach Acceptance Tap actions

### A. Details (open) — resurfacing controls

### A. Details (requester) — hide proposed person name

Show “Ownership not confirmed” without a name until Accept/Claim.

### A. Bind AskFred persona to the signed-in user

Remove the Owner/Requester dropdown in production; keep for demo with a banner.

### B. Undo toast after Complete / Decline / Redirect / Drop

### B. Decline confirmation (restore catalog honesty check, one sentence, not punitive)

### C. NEW SCREEN: History

Only if Home cannot hold terminals without clutter. Catalog already specified `SCREEN_33`.

### Do not add

- Reminder settings, email nudges, personal scoreboards, Requester Reassign, auto-assign on timeout.

---

# 6. Junction and Handoff Review

| Junction | Cause | Before | After | Who sees | Notified | Next persona knows? | Consent? | Ambiguous ownership? | Status |
|---|---|---|---|---|---|---|---|---|---|
| Detected → Proposed | Extraction with suggest | — | `needs_confirmation` | Proposed Home | In-product only | Yes | Required next | No | **OK** |
| Detected → Bucket | No suggest | — | `needs_ownership` | Shared tab | No | Yes | Claim later | No | **OK** |
| Proposed → Accepted | Accept | pending | `open` | Owner You own; Requester acknowledged | No ping | Yes | Yes | No | **OK** |
| Proposed → Redirected | Redirect | pending | `handoff_pending` | Target tap | No ping | Target yes; Requester still “not confirmed” | Target must accept | No | **OK** |
| Proposed → Declined | Decline | pending | `declined` | Owner gone; Requester **gone** | No | **No** | Owner | Clear declined, **hidden** | **Missing Requester** |
| Proposed → Bucket | Dismiss / TTL | pending | `needs_ownership` | Bucket | No | Requester “Needs ownership” | — | Clear unowned | **OK** |
| Bucket → Claimed | Claim | unowned | `open` | Owner; Requester acknowledged | No | Yes | Yes | No | **OK** |
| Open → Complete | Complete | open | `completed` | Neither Home list | No | **No** | Owner | Clear, **hidden** | **Missing** |
| Open → Reassigned | Redirect | open | `handoff_pending` | Target | No | Requester “not confirmed” again | Target | Brief unowned | **OK** |
| Open → Declined | Decline | open | `declined` | Hidden | No | **No** | Owner | Hidden | **Missing Requester** |
| Open → Resurfaced | GET visit | open | count++ | Meeting tab | In-meeting | Context yes | Owner resolve | Still owned until cap | **Visit side-effect** |
| Resurfaced → Keep Open | Keep open | open | suppress meeting | Same | No | Requester unchanged | Owner | Still owned | **OK weak** |
| Cap → Bucket | 2 visits | open owned | unowned | Bucket | No | Requester needs ownership; Owner **surprised** | **Revoked** | **Yes** | **Broken** |
| Owner action → Requester | Any terminal | — | hidden | AskFred only | Must stay pull | **Only if they ask** | — | — | **Partial** |
| AskFred Requester Reassign | — | — | — | — | — | — | Would violate | — | **Removed (OK)** |
| Cancelled meeting | series cancelled | — | no list | — | No | — | — | — | **OK** |
| Manager rollup | open tab | — | aggregates | Manager | No | No people | — | — | **OK** |

**Notification rule:** Still no chase pings. Keep it that way. Visibility holes must be filled with **pull surfaces** (Home resolved, History, AskFred), not reminders.

---

# 7. Commitment State Machine

Implemented states: `needs_confirmation` | `handoff_pending` | `needs_ownership` | `open` | `completed` | `declined` | `dropped`.

Resurfaced is an **overlay** on `open` (plus counters), not its own state — acceptable if cap does not steal ownership.

```
Detected (extraction, not stored)
  → needs_confirmation | needs_ownership | dropped (user)

needs_confirmation / handoff_pending
  → open (accept)
  → handoff_pending (redirect)
  → needs_ownership (dismiss / TTL)
  → declined | dropped
  (clarify stays in place)

needs_ownership
  → open (claim)
  → handoff_pending (propose)
  → dropped  **not offered in UI**

open
  → completed | declined | dropped | handoff_pending
  → overlay resurface
  → needs_ownership **on cap — should not**

completed | declined | dropped
  → none (no undo)  **stranded for lookup**
```

**Still stranded for humans:** terminals (no History); open items after cap (ownership stranded in bucket).  
**Illegal states still avoided:** assigned-without-accept; timeout auto-own.

---

# 8. Edge Case Coverage

| Edge Case | Handled? | Existing Flow/Screen | Gap | Required Solution |
|---|---|---|---|---|
| 1. AI detects incorrectly | **Yes** | Details → Not a commitment | Requester Home hides drop | **A.** Recently resolved |
| 2. Owner rejects interpretation | **Yes** | Clarify ≠ Accept; Decline / Drop | — | Keep split |
| 3. Two people think the other owns it | **Partial** | Dual Redirect → pending/bucket | Hop ping-pong | Hop cap → bucket |
| 4. No identifiable owner | **Yes** | Extraction → Loose-Ends | — | — |
| 5. Owner does not respond | **Yes** | TTL → bucket | Invisible timer | Meta “propose expires” |
| 6. No longer relevant | **Partial** | Drop / stop-resurface | Bucket has no drop | **A.** Drop on bucket Details |
| 7. Owner declines | **Yes** | Decline + honest toast | No confirm; Requester blind | **B.** Confirm; **A.** Resolved list |
| 8. Reassign, new owner doesn’t accept | **Yes** | `handoff_pending` + TTL | — | — |
| 9. Meeting cancelled before resurface | **Yes** | `cancelled` → empty list | — | — |
| 10. Same commitment in multiple meetings | **No** | New extraction rows | Duplicates | Merge/link IDs (not a task graph) |
| 11. Partially completed | **Partial** | Keep open | No note | **B.** Optional note; still not subtasks |
| 12. Requester no longer involved | **No** | — | Stuck on waiting | Drop requester link; Owner keeps item |
| 13. Owner leaves the team | **No** | Cap-to-bucket is a crude proxy | Wrong mechanism | Explicit release to Loose-Ends |
| 14. Blocked by dependency | **No** | — | — | Keep open + note only |
| 15. Empty state | **Yes** | Neutral empty copy on lists / AskFred | — | — |
| 16. AskFred cannot answer | **Partial** | Low-confidence branch is narrow regex | Many queries still “high” | Broader low-confidence + no invented status |
| 17. No permission to view | **Partial** | AskFred scopes by persona; magic phrase | Toggle bypass; Detail names | Bind persona; ACL copy without names |

---

# 9. Flow Smoothness Score

| Criterion | Catalog | Now | If < 4 |
|---|---|---|---|
| **A. Continuity** | 2 | **4** | Upload → Home and Complete → nowhere still break the chain. |
| **B. Predictability** | 2 | **3** | Cap-to-bucket and GET-on-tab-visit are surprising. TTL invisible. |
| **C. Recoverability** | 2 | **2** | Undo removed vs catalog. Overlay-click cancel. |
| **D. Discoverability** | 3 | **4** | Bucket, AskFred Owner, waiting list exist; History/terminals/AskFred-click missing. |
| **E. Closure** | 2 | **4** | Honest terminals exist in the machine; humans cannot find them. |
| **F. Minimal Friction** | 4 | **4** | Happy path is still light. Do not add reminder chrome. Do add undo toast and one Decline sentence. |
| **G. Trust** | 3 | **3** | Opt-in and no requester police are right. Auto-unown on cap and global bucket for managers undermine trust. |
| **H. Persona Boundaries** | 2 | **4** | AskFred split and no Reassign are right. Proposed-name leak and persona dropdown are not. |

---

# 10. FINAL FLOW QA CHECKLIST

| Check | Y/N | Exact gap if NO |
|---|---|---|
| Every screen has a clear purpose | **YES** for product tabs | Upload result cards have purpose (review) but no action |
| Every screen has an entry point | **YES** | — |
| Every screen has an exit or next action | **NO** | Upload results; post-complete Owner |
| Every primary action has a system response | **YES** | Toasts exist; some responses are the wrong state (cap) |
| Every decision has all meaningful branches | **PARTIAL** | Proposal is complete; owned Keep-open not on detail |
| Cancel, Back, Close, Skip, No response handled | **PARTIAL** | Close yes; skip = TTL; overlay-click too eager |
| Every non-terminal state can move forward | **YES** | Domain yes |
| All terminal states intentional | **PARTIAL** | States are honest; hiding them is not |
| Both personas understand the other’s action | **NO** | Requester Home hides terminals |
| Ownership changes explicitly handled | **YES** | Pending vs owned vs unowned modeled |
| Reassignment acceptance loops handled | **YES** | Critical catalog gap **closed** |
| Unowned commitments recoverable | **YES** | Bucket fed by dismiss/TTL/no-proposee; cap feed is the wrong kind of recovery |
| Recover from AI extraction errors | **YES** | Drop + Clarify |
| Graceful ending for resurfacing | **PARTIAL** | Stop exists; cap-unown is not graceful |
| AskFred information boundaries preserved | **PARTIAL** | No Reassign; persona toggle + names |
| Orphaned screens | **YES — issue** | Upload result list |
| Dead ends | **YES — issue** | History/Requester resolved; cap-unown |

**FLOW IS NOT COMPLETE.** Do not mark approved.

The catalog review was correct that a screen is not a flow. The implementation **did** close the ownership-send system. It has not closed **shared memory after resolution** or **consent-preserving decay**.

---

## What is already directionally right

- Propose ≠ assign (`accept` / `claim` only; redirect never sets `ownerId`).
- Unowned items land in Loose-Ends instead of vanishing.
- Decline and dropped are first-class closed states with non-punitive toasts.
- Resurface is in-meeting, not a second backlog; cancelled meetings do not resurrect.
- AskFred is pull-based; Requester cannot reassign; manager rollup is aggregate-only.
- Clarify does not silently accept.
- Demo seed includes handoff, completed, declined, and unowned items — the machine is exercisable.

---

## Implementation priority (flow closure only)

1. **Recently resolved / History** for both personas (pull, no chase).  
2. **Stop stripping owners at resurface cap**; stop mutating resurface on observer GET.  
3. **Undo toast** + Decline one-liner confirm.  
4. **Upload → Acceptance Tap** actions.  
5. **Hide proposed names from Requesters**; bind AskFred persona to the user.  
6. Keep Open / stop-resurface on owned Details; hop-limit Redirect.

---

## Catalog vs product (unarchive note)

The archived agent chat (`bc-cfeff67b-1154-4af6-8d8f-9c75cf1b7869`, PR #1) reviewed a 12-frame SCREEN catalog at **3.5/10**. Follow-up turns on that same chat **built this layer** (PRs #2–#9). Cursor cannot literally re-open that UI thread from here; this document is the continuation of that validation against the restored code.

Original paper review: `docs/end-to-end-flow-validation-catalog.md`.

---

*End of validation. Completeness score 6.8/10. Primary remaining failure mode: honest terminal states exist but are hidden from the other persona (and from the Owner after the fact), and resurfacing decay currently revokes consent instead of ending visibility.*
