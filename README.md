# Fireflies.ai commitment layer

In-product ownership and resolution for AI-extracted meeting commitments. No new email notifications. No new transcription NLP. No individual scoreboards.

**Target metric:** 14-day commitment resolution rate from 28% baseline toward 45%. Completed, declined, and dropped all count as honest resolutions.

## Rules

1. Never force assignments. Ownership is opt-in (`accept` or `claim` only).
2. Declined and dropped are first-class closed states.
3. Manager view is aggregate-only. Privacy lock rejects individual fields.
4. Surfaces are in-product: Acceptance Tap, Loose-Ends, meeting resurfacing, AskFred, team rollup.

## Run

```bash
npm install
npm test
npm run dev
```

- Web: http://127.0.0.1:5173
- API: http://127.0.0.1:3001

Demo users: Alex (proposed owner), Blair (requester), Casey (redirect target), Dana (manager).

## State machine

`needs_confirmation` / `handoff_pending` → `open` (accept) · `needs_ownership` (dismiss/timeout) · `declined` · `dropped`

`needs_ownership` → `open` (claim) · `handoff_pending` (propose)

`open` → `completed` · `declined` · `dropped` · resurface overlay (max 3, same recurring series)

Redirect never sets `ownerId`. The target must accept.
