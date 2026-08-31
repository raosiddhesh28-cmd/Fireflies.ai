# End-to-End Flow Validation

**Product:** Fireflies.ai commitment ownership, follow-through, and honest resolution  
**Review stance:** Senior PM / Principal UX / UX QA  
**Verdict:** **FLOW INCOMPLETE — do not approve**

**Source of truth used in this review**

1. Product principles, personas, and five core capabilities in the review brief.
2. The existing screen catalog from the prior prototype memo (`SCREEN_3`, `6`, `8`, `9`, `13`, `16`, `17`, `33`–`37`).

**What was not available**

No wireframes, prototype link, screenshots, or step-level specs for screens `1–2`, `4–5`, `7`, `10–12`, `14–15`, `18–32`, or any AskFred Owner surface. Numbering implies a ~37-frame file; only **12 frames** are described. Undescribed frames are treated as **undocumented**, not as proven complete.

This review does **not** invent a new product. It maps what is defined, then closes only the gaps that leave a journey without a next step or an honest end state.

---

# 1. Overall Flow Health Assessment

| Metric | Value |
|---|---|
| **Overall Flow Completeness Score** | **3.5 / 10** |
| Complete flows (entry → intentional end, both personas, no stranded state) | **2** (Owner mark complete; Owner decline-from-active, local only) |
| Missing flows | **11** |
| Dead ends | **9** |
| Missing states | **7** |
| Orphan / undocumented screens | **~25 undescribed frames + 1 dual-purpose collision (`SCREEN_36`)** |
| Required screen additions (true new surfaces) | **3** |
| Required existing-screen or modal modifications | **9** |

**Why 3.5, not the prior 7.5:** Happy-path Owner accept/complete/decline is sketched. Ownership handoff, no-response, requester visibility, resurfacing decay, AskFred Owner + boundaries, and AI-error recovery are not closed systems. A screen existing is not a flow.

**Complete flows (narrow definition)**

1. Proposed owner is on `SCREEN_37` → Accept → (claimed) Dashboard → later `SCREEN_34` → Mark complete → `SCREEN_33` → History.
2. Owner on `SCREEN_34` → Decline → `SCREEN_17` → `SCREEN_16` (with undo). Requester side of this flow is **not** complete.

---

# 2. Complete Persona Flow Maps

Reconstructed from the current catalog. **MISSING FLOW** marks a branch with no defined destination.

---

## Commitment Owner

### Flow A — Detection / Acceptance Tap

**TRIGGER:** AI extracts a commitment from a meeting transcript and proposes this user as owner.

↓

**SCREEN / STATE:** Commitment Detected — Default (`SCREEN_37`)

**USER CAN (documented):**

- Accept
- Redirect
- Edit wording

**USER CANNOT (capability required, not on this screen):**

- Decline (capability 2 + 3)
- Clarify meaning vs. merely edit text (capability 2)
- Dismiss / skip / “not a commitment”
- Do nothing (no timeout path)

**DECISION POINT:** Does this person confirm ownership of this wording?

**IF Accept:**

→ System: capture commitment; set this user as owner.  
→ Next: described as “Success Redirect (`SCREEN_36`) → Dashboard.”  
→ End of this step: Owner has an owned open commitment (assumed).  
→ **Issue:** `SCREEN_36` is also the Redirect search UI. Destination after success is unnamed. Requester visibility of “acknowledged” is undefined.

**IF Redirect:**

→ System: open search-owner UI (`SCREEN_36`).  
→ User picks a person (assumed).  
→ Next for **current user:** back to Dashboard (claimed).  
→ Next for **target:** **MISSING FLOW** — no received/accept surface.  
→ State of commitment after send: **ambiguous** (owned by sender? pending? unowned?).

**IF Edit wording:**

→ `SCREEN_35` Edit State → Save → `SCREEN_37` or `SCREEN_34` or Dashboard (catalog contradicts itself: Save → Dashboard **and** `SCREEN_37`/`34`).  
→ Whether Save implies Accept is **undefined**.  
→ Cancel/Back from edit: **MISSING FLOW**.

**IF Decline (required, not present):**

→ **MISSING FLOW**

**IF Dismiss / close / no response:**

→ **MISSING FLOW** — item must not vanish (Loose-Ends principle) and must not auto-assign.

**IF “this is not a commitment” / AI wrong:**

→ **MISSING FLOW** (not the same as Decline-as-outcome of a real commitment).

**INTENTIONAL END STATES for this trigger:** none until Accept is confirmed **and** both personas can find the record.

---

### Flow B — Resolve an owned commitment

**TRIGGER:** Owner opens an active commitment (from Dashboard, History, resurfacing, or AskFred — AskFred Owner **not documented**).

↓

**SCREEN / STATE:** Active Commitment View (`SCREEN_34`)

**USER CAN (documented):**

- Mark Complete → Success (`SCREEN_33`) → History
- Decline → Confirmation (`SCREEN_17`) → Success (`SCREEN_16`)
- Reassign → **MISSING FLOW** (no confirmation, no recipient accept, no pending state)

**USER CAN (capability 3, not documented here):**

- Keep Open
- Needs Ownership (release to bucket without declining the work’s validity)

**IF Mark Complete:**

→ System: terminal Completed.  
→ Owner: History.  
→ Requester: **MISSING HANDOFF** — no defined visibility.

**IF Decline:**

→ Modal `SCREEN_17` (copy unknown: punitive vs. honest?).  
→ Confirm → `SCREEN_16` with Undo (recoverability exists **only here** in the catalog).  
→ After undo window: **undefined**.  
→ Requester: **MISSING HANDOFF**.

**IF Reassign:**

→ **MISSING FLOW** for picker, consent, pending, timeout, and requester.

**IF Keep Open from active (not only from resurfacing):**

→ **MISSING FLOW**

---

### Flow C — Recurring resurfacing

**TRIGGER:** Unresolved owned (or unowned?) commitment matches a later meeting/context.

↓

**SCREEN / STATE:** Resurface (`SCREEN_13`)

**USER CAN (documented):**

- Keep open → suppress reminder **for this meeting**; stay on same screen

**USER CAN (capability 4, not documented):**

- Complete / Reassign / Decline / Needs Ownership
- Stop resurfacing / “no longer relevant” (decay)

**IF Keep open:**

→ Suppress this meeting only.  
→ Next meeting: likely resurfaces again.  
→ **MISSING FLOW:** graceful stop; max resurface count; what Requester sees; private vs. public.

**IF user ignores resurfacing card:**

→ **MISSING FLOW** (must not shame; must not loop forever).

---

### Flow D — Loose-Ends as Owner-to-be (claim)

**TRIGGER:** Owner (or any participant) sees unowned item on Home (`SCREEN_9`).

↓

**SCREEN / STATE:** Loose-Ends list (`SCREEN_9`) → detail (`SCREEN_8` / `SCREEN_6`)

**USER CAN (documented):**

- Claim it → becomes Owner → `SCREEN_34`
- Reassign from bucket → **MISSING FLOW** (same handoff hole)

**USER CAN (not documented):**

- Open detail then Back / Next item (prior memo flagged this)
- “I don’t know” / add context without claiming
- Leave it (correct: bucket remains)

**IF Claim:**

→ Owned/Open. Consent is implicit in Claim — **aligned with principle**.  
→ Requester: **MISSING HANDOFF**.

---

### Flow E — AskFred (Owner)

**TRIGGER:** Owner asks “What do I own / agree to / remains open?”

↓

**SCREEN / STATE:** **NOT IN CATALOG**

**MISSING FLOW** for Owner AskFred, empty answers, low confidence, and permission.

---

## Commitment Requester / Stakeholder

### Flow F — Status via AskFred

**TRIGGER:** Needs to know if something they are waiting on is acknowledged or resolved.

↓

**SCREEN / STATE:** AskFred — Requester Query (`SCREEN_3`)

**USER CAN (documented):**

- View status (neutral)
- Follow-up: Reassign / Leave open

**DECISION POINT:** Follow-up actions on `SCREEN_3` conflict with “visibility without a mechanism to police.”

**IF View status:**

→ Neutral copy (good in principle).  
→ What fields are shown (owner name, latency, private notes): **undefined**.  
→ Next: conversation stays on `SCREEN_3` (acceptable pull-based end).

**IF Follow-up Reassign:**

→ Requester initiating reassignment **is a control action**, not visibility.  
→ Destination / consent of new owner: **MISSING FLOW**.  
→ **Product-principle risk:** policing.

**IF Leave open:**

→ Whose Keep Open? Requester cannot keep the Owner’s item open without becoming a nag. Meaning **undefined**.

**IF AskFred is wrong / cannot answer / no permission:**

→ **MISSING FLOW**

---

### Flow G — Loose-Ends (shared awareness)

Same `SCREEN_9` / `8` / `6` as Owner. Requester can Claim (then they become Owner — persona switch, **junction**) or Reassign (**MISSING**).

**No documented Requester-only read path** that is not the shared bucket or AskFred. If the item is owned, Requester may have **nowhere** except AskFred — and Owner AskFred vs Requester AskFred boundaries are unspecified.

---

### Flow H — After Owner resolves

**TRIGGER:** Owner completes, declines, reassigns, or claims.

↓

**SCREEN / STATE:** **NONE DEFINED for Requester**

Pull-based AskFred *could* be the only surface (aligned with no notification spam) **if** AskFred is specified to return the new state. It is not.

**MISSING FLOW:** Requester next action after honest decline (accept the decline, re-request in a future meeting, or claim themselves).

---

# 3. Action-to-Outcome Validation Table

| Screen/State | User Action | Expected System Response | Next State | Defined? | Issue |
|---|---|---|---|---|---|
| `SCREEN_37` | Accept | Confirm ownership; item owned/open | Dashboard (unnamed) via `SCREEN_36` success | Partial | `SCREEN_36` overloaded; requester unaware; undo undocumented |
| `SCREEN_37` | Redirect | Propose different owner; do **not** auto-assign | Pending handoff for target | **No** | Target has no screen; state after send unknown |
| `SCREEN_37` | Edit wording | Open editor | `SCREEN_35` | Yes | |
| `SCREEN_37` | Decline | Honest resolution or release to Needs Ownership | Declined **or** Needs Ownership | **No** | **MISSING FLOW** vs capabilities 2–3 |
| `SCREEN_37` | Close / Dismiss / Skip | Must not auto-assign; must not disappear | Needs Ownership / Bucket | **No** | Vanishing or silent assign both violate principles |
| `SCREEN_37` | No response (time passes) | Shared awareness, not a failure list | Needs Ownership / Bucket | **No** | **MISSING FLOW** |
| `SCREEN_37` | Not a commitment / AI wrong | Remove or correct extraction; not “Declined” | Dropped / corrected | **No** | Distinct from Decline-as-outcome |
| `SCREEN_36` | Search + pick owner | Start consentful handoff | Handoff pending | **No** | Sender returns to Dashboard; receiver dead end |
| `SCREEN_36` | Cancel search | Return without changing owner | `SCREEN_37` | **No** | Cancel undocumented |
| `SCREEN_36` | (Success after Accept) | Confirmation | Dashboard | Collision | Same ID as Redirect UI — **broken IA** |
| `SCREEN_35` | Save | Update text | `37` / `34` / Dashboard | Contradictory | Three destinations in the memo |
| `SCREEN_35` | Save | Does Save = Accept? | Owned vs still proposed | **No** | Silent assignment risk |
| `SCREEN_35` | Cancel / Back | Discard edits | `SCREEN_37` | **No** | |
| `SCREEN_34` | Mark Complete | Terminal complete | `SCREEN_33` → History | Yes (Owner) | Requester visibility **No**; reverse after History **No** |
| `SCREEN_34` | Decline | Confirm then record honest decline | `SCREEN_17` → `SCREEN_16` | Yes (Owner) | Requester **No**; tone of modal unknown |
| `SCREEN_34` | Reassign | Consentful handoff | Pending → new owner | **No** | **MISSING FLOW** |
| `SCREEN_34` | Keep Open / Needs Ownership | Stay open or release | Open / Bucket | **No** | Outcomes listed in brief, not on screen |
| `SCREEN_17` | Confirm decline | Persist Declined | `SCREEN_16` | Yes | |
| `SCREEN_17` | Cancel modal | No state change | `SCREEN_34` | **No** | Assumed, not specified |
| `SCREEN_16` | Undo | Restore prior owned/open | `SCREEN_34` | Partial | Window length, then lock, requester during undo: **No** |
| `SCREEN_16` | Dismiss success | — | History or Dashboard | **No** | Exit unspecified |
| `SCREEN_33` | Continue | — | History | Partial | History screen undescribed (empty, filters, requester?) |
| `SCREEN_13` | Keep open | Suppress this meeting’s resurface | Same screen; still Open | Partial | Infinite resurface; no decay; no Complete/Decline on this frame |
| `SCREEN_13` | Complete / Decline / Reassign | Same as `SCREEN_34` | Terminal or pending | **No** | Resurface without resolution actions |
| `SCREEN_13` | Ignore card | Neutral; no shame | Decay or next relevant context | **No** | |
| `SCREEN_9` | Claim | User becomes owner | `SCREEN_34` | Yes | Requester/others’ view **No**; accidental claim undo **No** |
| `SCREEN_9` | Reassign | Handoff | Pending | **No** | Same as Redirect black hole |
| `SCREEN_9` | Tap row | Open detail | `SCREEN_8`/`6` | Partial | Back / next item undocumented |
| `SCREEN_9` | Empty bucket | Reassurance, not shame | Stay / AskFred | **No** | Empty state missing |
| `SCREEN_8`/`6` | Claim / Reassign | Same as list | `SCREEN_34` / pending | Partial | Reassign hole; Back hole |
| `SCREEN_8`/`6` | Close | Return to `SCREEN_9` | `SCREEN_9` | **No** | Prior dead-end |
| `SCREEN_3` | Ask status | Persona-safe answer | Stay in AskFred | Partial | Boundaries, confidence, permissions **No** |
| `SCREEN_3` | Follow-up Reassign | Must not police Owner | — | Conflict | Action contradicts Requester principle |
| `SCREEN_3` | Leave open | Unclear actor | — | **No** | |
| (none) | Owner AskFred | Pull list of owned/open | AskFred Owner | **No** | Capability 5 missing |
| (none) | Recipient of Redirect | Accept / Redirect / Decline / Clarify | Owned / pending / bucket | **No** | **Critical dead end** |

---

# 4. Missing Flows and Dead Ends

## Critical

### DEAD END 1 — Redirect / Reassign has no receiving journey

**Where:** `SCREEN_36` (and `SCREEN_34` Reassign, `SCREEN_9` Reassign)  
**Persona:** Redirect target (future Owner); also original sender (false “done”); Requester  
**Trigger:** Pick another person as owner.  
**Why dead end:** Commitment leaves the sender’s proposed list. No screen for the target to Accept / Redirect / Decline / Clarify. State is not Pending. Item may be invisible to both, or silently assigned (forbidden).  
**User impact:** False ownership, lost work, or silent assignment.  
**Severity:** Critical  
**Fix:** Handoff-pending state + reuse Acceptance Tap for the **recipient** (modify `SCREEN_37`, do not only add a notification). Timeout → Loose-Ends, never a shame list.  
**Required:** State `Handoff pending` + recipient `SCREEN_37` variant (modification) + sender/requester pull status in AskFred.

### DEAD END 2 — No-response after proposal

**Where:** After `SCREEN_37` shown (or never opened)  
**Persona:** Proposed owner, Requester, meeting group  
**Trigger:** User dismisses, skips, or never opens.  
**Why:** Item cannot auto-assign; cannot disappear. Bucket path is a capability, not wired from this decision.  
**User impact:** Lost commitments or illegal auto-ownership.  
**Severity:** Critical  
**Fix:** Dismiss/timeout → `Needs Ownership` in Loose-Ends with **neutral** copy (unowned, not “failed to act”).  
**Required:** Modification of `SCREEN_37` (Dismiss) + system rule; not a new monitoring feed.

### MISSING FLOW 3 — Decline not on Acceptance Tap

**Where:** `SCREEN_37`  
**Persona:** Proposed owner  
**Trigger:** “This shouldn’t be mine / I won’t take this.”  
**Why:** Capabilities 2–3 require Decline where appropriate. Only Decline on `SCREEN_34` (already owned) is specified. Declining a **proposal** vs declining an **accepted** commitment are different junctions.  
**Severity:** Critical  
**Fix:** Add Decline on `SCREEN_37` with outcome **Needs Ownership** (default) vs **Not a commitment** (extraction error). Do not use failure styling (`SCREEN_17` must be reviewed).

### MISSING FLOW 4 — Requester never sees Owner outcomes

**Where:** After Complete / Decline / Claim / Handoff  
**Persona:** Requester  
**Trigger:** Any Owner resolution.  
**Why:** Requester need is “acknowledged or resolved without chasing.” No screen, AskFred contract, or dashboard widget is specified. Push notifications would violate “not notification-heavy”; **pull** must be specified.  
**Severity:** Critical  
**Fix:** AskFred Requester (`SCREEN_3`) must return state + timestamp + **whether ownership is confirmed**, without owner activity feeds. Optional: Requester “waiting on” list (read-only), not a nag CTA.

---

## High

### DEAD END 5 — Resurface without decay or resolution actions

**Where:** `SCREEN_13`  
**Persona:** Owner (and anyone who sees the card)  
**Trigger:** Keep open, or ignore.  
**Why:** Capability 4 forbids indefinite resurfacing and a second backlog. Keep open only suppresses **this meeting**. No stop, no “no longer relevant,” no Complete/Decline on the card.  
**User impact:** Recurring public reminder ≈ shame + backlog.  
**Severity:** High  
**Fix:** Same resolution set as `SCREEN_34` on the resurface card; decay after N relevant contexts or Owner “drop as no longer relevant”; never a public streak.

### DEAD END 6 — Reassignment not accepted

**Where:** After Redirect/Reassign sent  
**Persona:** Sender, intended owner, Requester  
**Trigger:** Target ignores or declines.  
**Why:** No timeout, no return to bucket, no restore to sender as **proposed** (not assigned).  
**Severity:** High  
**Fix:** Target Decline / timeout → `Needs Ownership`. Sender is not silently re-bound. AskFred: “ownership not confirmed.”

### DEAD END 7 — AI wrong vs Decline-as-outcome conflated

**Where:** Should be on `SCREEN_37` / `SCREEN_35`  
**Persona:** Proposed owner  
**Trigger:** Extraction is not a commitment, or wrong person/text.  
**Why:** Treating false positives as “Declined” pollutes Requester view and shames.  
**Severity:** High  
**Fix:** `SCREEN_35` + “Not a commitment” / “Wrong person” actions; Dropped/corrected is not Declined.

### DEAD END 8 — Loose-end detail has no exit

**Where:** `SCREEN_9` → `SCREEN_8`/`6`  
**Persona:** Any  
**Trigger:** Open a row.  
**Why:** No Back, Next, or close. User trapped or force-exits the app.  
**Severity:** High (was Medium; trapping a shared surface is a real break)  
**Fix:** Standard close to `SCREEN_9`; optional Next unowned item.

### MISSING FLOW 9 — Owner AskFred

**Where:** Capability 5  
**Persona:** Owner  
**Trigger:** Pull “what did I agree to?”  
**Severity:** High  
**Fix:** Same AskFred shell as `SCREEN_3` with **Owner-scoped** answers; not a task list product.

---

## Medium

### DEAD END 9 — `SCREEN_36` identity collision

**Where:** Accept success vs Redirect search  
**Persona:** Owner  
**Why:** Two destinations, one ID → broken transitions and QA.  
**Severity:** Medium  
**Fix:** Split frames or states; success is a toast on Dashboard, not a second meaning of Redirect.

### MISSING FLOW 10 — Save-on-edit assignment ambiguity

**Where:** `SCREEN_35`  
**Severity:** Medium  
**Fix:** Save edits without accepting; Accept remains explicit on `SCREEN_37`.

### MISSING FLOW 11 — Accidental Claim / Complete / Decline recovery

**Where:** `SCREEN_9` Claim; `SCREEN_33`; History  
**Why:** Undo only on `SCREEN_16`.  
**Severity:** Medium  
**Fix:** Same short undo pattern as `SCREEN_16` on Claim and Complete; not a workflow engine.

### MISSING FLOW 12 — Duplicate mentions across meetings

**Where:** Detection  
**Severity:** Medium  
**Fix:** Link/merge into one commitment; resurface as same ID; no duplicate bucket rows.

### MISSING FLOW 13 — Requester “Follow-up Reassign” on AskFred

**Where:** `SCREEN_3`  
**Severity:** Medium (principle break)  
**Fix:** Remove Reassign from Requester AskFred. Offer “Has this been acknowledged?” only. If work is unowned, point to Loose-Ends **claim** (consent), not assign-others.

---

## Low

### MISSING FLOW 14 — Empty / error / invalid search

Dashboard empty, bucket empty, AskFred no matches, owner search zero results, network error: none specified.

### MISSING FLOW 15 — History as a product surface

`SCREEN_33` lands on History with no actions, filters, or Requester access rules.

---

# 5. Missing Screens / Required Modifications

Preference order: **A modify → B modal → C new**.

| Gap | Type | Solution |
|---|---|---|
| Recipient of Redirect/Reassign | **A** | `SCREEN_37` variant: “Proposed to you by [Name] from [Meeting]” + Accept / Redirect / Clarify / Decline |
| Handoff waiting | **B** | Dashboard/AskFred status chip “Ownership not confirmed yet” — not a chase notification |
| Timeout / dismiss from proposal | **A** | `SCREEN_37` Dismiss; system → Loose-Ends |
| Decline on proposal | **A** | `SCREEN_37` Decline → Needs Ownership **or** Not a commitment |
| AI correction | **A** | `SCREEN_35` + “Not a commitment” |
| Resurface decay + actions | **A** | `SCREEN_13` = compact `SCREEN_34` + “Don’t bring this up again” |
| Detail Back | **A** | `SCREEN_8`/`6` close → `SCREEN_9` |
| `SCREEN_36` split | **A** | Redirect picker only; Accept success = toast |
| Save ≠ Accept | **A** | `SCREEN_35` |
| Requester visibility | **A** | `SCREEN_3` contracts; optional read-only “Waiting on” |
| Owner AskFred | **A** | Same shell, Owner scope (`SCREEN_3` sibling state) |
| Mutual non-ownership / stalemate | **B** | Bucket copy: “No confirmed owner yet” — never names who ignored |
| Owner left team / Requester left | **B** | Auto Needs Ownership; AskFred: “No current owner” |
| Blocked / partial | **B** | Optional note on `SCREEN_34`: Keep Open + “blocked by…” without becoming a PM tool |
| Meeting cancelled before resurface | **A** | Resurface scheduler: next **relevant** remaining context or decay |
| Permission denied / low confidence AskFred | **B** | Inline AskFred states |
| Undo Claim/Complete | **B** | Toast undo like `SCREEN_16` |
| True new: Handoff if `SCREEN_37` cannot show “from person” | **C** | Only if variant is unreadable — see NEW SCREEN below |
| True new: Stalemate resolution when two people Redirect to each other | **C** | Only if bucket claim is insufficient — prefer bucket |
| True new: Decay confirmation | **B** | “We’ll stop bringing this up. It stays findable in AskFred as dropped.” |

---

### NEW SCREEN: Commitment proposed to you (only if `SCREEN_37` cannot carry provenance)

**Purpose:** Close Redirect/Reassign consent. System proposes; **this user** confirms.  
**Entry:** Handoff targeting this user (in-product card on next relevant meeting or Home — **not** a reminder storm).  
**Persona:** Proposed Owner.  
**Information displayed:**

- Commitment text + meeting excerpt  
- Who redirected and why (optional one line)  
- This is a proposal, not an assignment  
- Status: ownership not confirmed  

**Primary actions:** Accept · Redirect · Clarify · Decline (to bucket or not-a-commitment)  
**Secondary:** Dismiss (→ bucket, neutral)  
**Decision points:** Same as Acceptance Tap.  
**Outcomes:** Owned · Handoff pending (new target) · Needs Ownership · Dropped  
**System response:** Never assign without Accept. AskFred Requester: “Proposed to [Name]; not confirmed.” No public ignore counter.  
**Exit:** Home / next proposed item / AskFred.  
**Closes:** Dead End 1 and 6.

---

### MODAL: Stop resurfacing / no longer relevant

**Purpose:** Graceful decay (capability 4).  
**Entry:** `SCREEN_13` or `SCREEN_34`.  
**Persona:** Owner (Requester does **not** get this as a nudge tool).  
**Displayed:** Item stays searchable as Dropped; will not appear in future meetings.  
**Actions:** Confirm stop · Cancel  
**Outcomes:** Dropped / No Longer Relevant (terminal) vs remain Open.  
**Closes:** Dead End 5.

---

### ASKFred STATES (modify `SCREEN_3`, do not add a second chatbot)

**Owner mode:** my open / agreed / remaining.  
**Requester mode:** waiting-on status; acknowledged yes/no; resolved outcome; **not** Owner’s private keep-open notes; **not** Reassign.  
**Low confidence:** “I’m not sure this is the same item” + link to transcript excerpt.  
**No permission:** “You don’t have access to that commitment.”  
**Empty:** “Nothing open that you’re waiting on.”

---

# 6. Junction and Handoff Review

| Junction | Cause | Before → After | Who sees | Notified? | Next persona informed? | Consent? | Ambiguous ownership? | Handoff |
|---|---|---|---|---|---|---|---|---|
| Detected → Ownership Proposed | AI | Detected → Needs confirmation | Proposed owner | Unknown | Requester unknown | N/A | Proposed ≠ owned — **must be explicit** | Partial (`SCREEN_37`) |
| Proposed → Accepted | Accept | Proposed → Owned/Open | Owner; Requester **undefined** | Unknown | **No** | Yes | Clear if Accept only | **Missing Requester** |
| Proposed → Redirected | Redirect | Should be Handoff pending | Sender thinks done; target **none** | Unknown | **No** | **Required, missing** | **Yes — critical** | **Missing** |
| Proposed → Declined | Decline on tap | Should be Needs Ownership or Dropped | Bucket | No spam | Requester via pull | N/A | Decline ≠ failure | **Missing on `37`** |
| Unowned → Bucket | Dismiss/timeout/no owner | Needs Ownership | Shared, **neutral** | No | Group via bucket | No assign | Clear unowned | **Not wired** |
| Bucket → Claimed | Claim | Unowned → Owned | Owner; others **undefined** | No | **No** | Yes (self) | Clear | **Missing Requester** |
| Claimed → Open | Same as claim | Open | Owner | — | — | — | — | OK locally |
| Open → Complete | Mark complete | Completed | Owner History; Requester **no** | Must not spam | **No** | Owner control | Clear | **Missing** |
| Open → Reassigned | Reassign | Should be pending | — | — | **No** | **Missing** | **Yes** | **Missing** |
| Open → Declined | Decline | Declined | Owner success; Requester **no** | — | **No** | Owner control | Clear if honest | **Missing Requester** |
| Open → Resurfaced | Scheduler | Open + meeting context | Card `13` | In-meeting only (good) | Risk of public shame if copy is accusatory | — | Still owned | Decay **missing** |
| Resurfaced → Resolved | Actions missing on `13` | Terminal | — | — | **No** | — | — | **Broken** |
| Resurfaced → Keep Open | Keep open | Open, suppress 1 meeting | Same | No | Requester: **nothing defined** | Owner | Still owned | Weak |
| Owner action → Requester | Any | State change | Pull only **unspecified** | Must stay pull | **No** | — | — | **Missing all** |
| Requester AskFred Reassign | Follow-up | Would seize control | — | — | Policing | Violates consent | — | **Remove** |
| Two Redirects to each other | Both refuse | Should stay unowned | Bucket | No | Both see unowned | — | Must not ping-pong | **Missing** (use bucket) |
| New owner never accepts | Timeout | Pending → Bucket | Shared | No | “Not confirmed” | — | Clear unowned | **Missing** |

**Notification rule (principle):** No chase pings. Visibility = Loose-Ends + AskFred pull + in-meeting resurface with decay. Any “notify new owner” must be **at most** an in-product Home card, not a reminder system.

---

# 7. Commitment State Machine

## States required (current catalog is insufficient)

| State | How entered | Actions | Visible to | Leave via | Terminal? |
|---|---|---|---|---|---|
| **Detected** | AI extraction | (system only) | None yet | → Needs confirmation or Dropped (invalid) | No |
| **Needs confirmation** | Proposed to a person | Accept, Redirect, Clarify, Decline, Dismiss | Proposed owner; Requester: “not confirmed” only | → Open, Handoff pending, Needs ownership, Dropped | No |
| **Needs clarification** | Owner edits or flags wording | Save, Accept, Discard edits | Proposed/current owner | → Needs confirmation or Open | No |
| **Handoff pending** | Redirect/Reassign sent | Target: same as Needs confirmation; Sender: no further ownership | Target; others: “proposed, not confirmed” | Target Accept → Open; else timeout/decline → Needs ownership | No — **missing today; stranded** |
| **Needs ownership** | No owner, dismiss, decline-proposal, failed handoff, owner left | Claim, Redirect (consent), add context | Shared bucket — **not a failure roster** | Claim → Open; Redirect → Handoff pending | No |
| **Open** (Accepted/Owned) | Accept or Claim | Complete, Decline, Reassign, Keep open, Drop relevant | Owner; Requester: status only | → Completed, Declined, Handoff pending, Dropped, Resurfaced (overlay) | No |
| **Resurfaced** | Overlay on Open when context matches | Same as Open + Stop resurfacing | Meeting context, neutral | → Open, terminal, Dropped | No (overlay) |
| **Completed** | Mark complete | Undo (short); else archive | Owner History; Requester: resolved | None after undo window | Yes |
| **Declined** | Honest decline of **real** work | Undo short | Requester: declined (neutral) | None after undo | Yes |
| **Dropped / not a commitment / no longer relevant** | AI reject or decay | None | AskFred: not open; not in bucket as failure | None | Yes |
| **Blocked** (optional note on Open) | Owner marks blocked | Keep open; does not create task graph | Owner; Requester: “still open” not a blocker dashboard | → Open/terminal | No |

**Illegal / do not add:** Assigned-without-accept, Public-ignored, Reminder-count, Surveillance timestamps of “last seen.”

## Transitions (target)

```
Detected
  → Needs confirmation | Dropped (invalid extraction)

Needs confirmation
  → Open (Accept)
  → Handoff pending (Redirect)
  → Needs clarification (Clarify)
  → Needs ownership (Decline-as-not-mine / Dismiss)
  → Dropped (not a commitment)

Handoff pending
  → Open (target Accept)
  → Handoff pending (target Redirect)
  → Needs ownership (target Decline / timeout)

Needs ownership
  → Open (Claim)
  → Handoff pending (Redirect with consent)
  → Dropped (group: no longer relevant — rare, guarded)

Open
  → Completed | Declined | Handoff pending | Dropped | Resurfaced (overlay)

Resurfaced
  → (same as Open) | Open (Keep open this context) | Dropped (stop)

Completed | Declined | Dropped
  → (undo to Open / Needs confirmation only within window)
```

**Stranded today:** Redirected, Reassigned, Handoff pending, Needs confirmation after no-response, Resurfaced-without-decay.

---

# 8. Edge Case Coverage

| Edge Case | Handled? | Existing Flow/Screen | Gap | Required Solution |
|---|---|---|---|---|
| 1. AI detects incorrectly | No | `SCREEN_35` is edit-only | No “not a commitment” | **A:** Dropped action on `35`/`37` |
| 2. Owner rejects interpretation | Partial | Edit wording | Save vs Accept; no reject | **A:** Clarify then explicit Accept; reject → Dropped |
| 3. Two people think the other owns it | No | Redirect both ways | Ping-pong / double unowned | Bucket “no confirmed owner”; block infinite Redirect without Claim |
| 4. No identifiable owner | Partial | Loose-Ends `9`/`8`/`6` | How item **enters** bucket from detection | Wire Detected → Needs ownership if no proposee |
| 5. Owner does not respond | No | — | Silent drop or auto-assign | Dismiss/timeout → bucket |
| 6. No longer relevant | No | Keep open only | Infinite resurface | **B:** Stop resurfacing → Dropped |
| 7. Owner declines | Partial | `34`→`17`→`16` | Not on proposal; Requester blind; modal tone unknown | **A:** Decline on `37`; **A:** AskFred Requester; audit `17` copy |
| 8. Reassign, new owner doesn’t accept | No | Redirect | Dead End 1/6 | Handoff pending + timeout → bucket |
| 9. Meeting cancelled before resurface | No | `SCREEN_13` | Orphaned scheduler | Next relevant context or decay; don’t resurrect cancelled meeting |
| 10. Same commitment in multiple meetings | No | New detect each time | Duplicates | Merge/link IDs |
| 11. Partially completed | No | Complete is binary | Fake complete or stuck open | **B:** Keep open + optional note; no subtask system |
| 12. Requester no longer involved | No | — | Status leaks or stuck waiting-on | Drop requester from wait-list; Owner still owns; AskFred respects ACL |
| 13. Owner leaves team | No | — | Ghost owner | Needs ownership; don’t name “failed” |
| 14. Blocked by dependency | No | — | Stuck Open | Keep open + note; not a dependency tracker |
| 15. Empty state | No | `9`, AskFred, History | Blank/shame | Neutral empty copy |
| 16. AskFred cannot answer | No | `SCREEN_3` | Hallucinated status | Low-confidence + transcript link |
| 17. No permission to view | No | — | Leak via AskFred/bucket | ACL empty/deny copy |

---

# 9. Flow Smoothness Score

| Criterion | Score | If < 4 |
|---|---|---|
| **A. Continuity** | **2** | Redirect, Reassign, dismiss, resurface, and Requester aftermath do not lead to a next step. |
| **B. Predictability** | **2** | `SCREEN_36` dual meaning; Save may accept; Reassign “sends” with no defined effect. |
| **C. Recoverability** | **2** | Undo only on `SCREEN_16`. Claim/Complete/Redirect not reversible. |
| **D. Discoverability** | **3** | Bucket + AskFred Requester exist; Owner AskFred missing; History opaque; pending handoffs unfindable. |
| **E. Closure** | **2** | Complete/Decline locally yes; Needs Ownership, Dropped, decay, failed handoff not closable honestly. |
| **F. Minimal Friction** | **4** | Happy-path Accept/Complete is light. Do **not** add notification settings or extra confirms except Decline (already has modal) and Stop-resurface. |
| **G. Trust** | **3** | Intent is right (neutral Keep open, Decline as outcome, pull AskFred). Gaps: Requester Reassign on `SCREEN_3`, bucket as potential failure list, resurface without decay, any implied notify-on-redirect. |
| **H. Persona Boundaries** | **2** | Requester Follow-up Reassign/Leave open; no ACL; Owner/Requester AskFred not split; visibility of Owner after Claim unspecified. |

---

# 10. FINAL FLOW QA CHECKLIST

| Check | Y/N | Exact gap if NO |
|---|---|---|
| Every **described** screen has a clear purpose | **NO** | `SCREEN_36` two purposes; `SCREEN_8` vs `6` undifferentiated |
| Every screen has an entry point | **NO** | ~25 numbered frames undescribed; Owner AskFred none |
| Every screen has an exit or next action | **NO** | `SCREEN_8`/`6`; `SCREEN_16` after undo; `SCREEN_13` ignore |
| Every primary action has a system response | **NO** | Redirect, Reassign, Dismiss, AskFred follow-ups |
| Every decision has all meaningful branches | **NO** | Decline/Clarify/No-response/AI-wrong on proposal |
| Cancel, Back, Close, Skip, No response handled | **NO** | Across `35`, `36`, `37`, `8`, `13` |
| Every non-terminal state can move forward | **NO** | Redirected / Reassigned / Pending / ignored proposal |
| All terminal states intentional | **NO** | Items can vanish; or stay Open forever via Keep open |
| Both personas understand the other’s action | **NO** | No Requester contract after Owner acts |
| Ownership changes explicitly handled | **NO** | Pending vs owned vs unowned not modeled |
| Reassignment acceptance loops handled | **NO** | Critical |
| Unowned commitments recoverable | **PARTIAL** | Bucket exists; not fed by dismiss/timeout/failed handoff |
| Recover from AI extraction errors | **NO** | Edit ≠ reject |
| Graceful ending for resurfacing | **NO** | Keep open = one meeting only |
| AskFred information boundaries preserved | **NO** | One Requester screen; Owner missing; Reassign CTA |
| Orphaned screens | **YES — issue** | Undocumented `1–32` except listed; `36` collision |
| Dead ends | **YES — issue** | Nine documented above |

**FLOW IS NOT COMPLETE.** Do not mark approved.

---

## What is already directionally right (not a completeness claim)

- Propose ≠ assign (`SCREEN_37` Accept).
- Unowned items have a shared bucket (`SCREEN_9`) rather than a private void.
- Decline exists as a first-class Owner action (`SCREEN_17`/`16`) with Undo.
- Resurface is in-context (`SCREEN_13`), not a separate task backlog — **until** it loops forever.
- AskFred as pull (`SCREEN_3`) matches anti-surveillance **if** Requester control actions are removed.

---

## Implementation priority (flow closure only)

1. Model **Handoff pending** + recipient Acceptance Tap; timeout to Loose-Ends.  
2. Wire **Dismiss / no-response / no proposee** → Loose-Ends.  
3. **Decline** and **Not a commitment** on proposal; Requester pull status.  
4. **Resurface** resolution actions + decay.  
5. AskFred Owner + ACL + remove Requester Reassign.  
6. Split `SCREEN_36`; Back on bucket detail; Save ≠ Accept; undo on Claim/Complete.

---

*End of validation. Completeness score 3.5/10. Primary failure mode: ownership can be sent, ignored, or resolved without a defined next state for the other persona or for the commitment record itself.*
