import express, { type Request, type Response } from "express";
import cors from "cors";
import { store } from "../domain/store.js";
import {
  accept,
  claim,
  clarify,
  complete,
  decline,
  dismissToBucket,
  drop,
  flagExecution,
  keepOpen,
  redirect,
  stopResurfacing,
  ConsentError,
  TransitionError,
} from "../domain/stateMachine.js";
import { applyResurfaceVisit, unresolvedForRecurringMeeting } from "../domain/resurfacing.js";
import { answerAskFred } from "../domain/askFred.js";
import { assertPrivacyLock, computeManagerRollup } from "../domain/privacyLock.js";
import type { Persona } from "../domain/types.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get("/api/session", (_req, res) => {
    store.applyExpirations();
    res.json({
      users: store.users,
      meetings: store.meetings,
      now: store.now.toISOString(),
    });
  });

  app.post("/api/reset", (_req, res) => {
    store.reset();
    res.json({ ok: true });
  });

  app.get("/api/commitments", (req, res) => {
    store.applyExpirations();
    const userId = String(req.query.userId ?? "");
    const view = String(req.query.view ?? "all");
    let items = store.commitments;
    if (view === "proposed") {
      items = items.filter(
        (c) =>
          (c.state === "needs_confirmation" || c.state === "handoff_pending") &&
          c.proposedOwnerId === userId,
      );
    } else if (view === "owned") {
      items = items.filter((c) => c.ownerId === userId && c.state === "open");
    } else if (view === "loose-ends") {
      items = items.filter((c) => c.state === "needs_ownership");
    } else if (view === "waiting") {
      items = items.filter((c) => c.requesterId === userId);
    }
    res.json({ commitments: items });
  });

  app.get("/api/meetings/:id/resurface", (req, res) => {
    const meeting = store.meeting(String(req.params.id));
    store.commitments = applyResurfaceVisit(store.commitments, meeting, store.now);
    const items = unresolvedForRecurringMeeting(store.commitments, meeting);
    res.json({ meeting, commitments: items });
  });

  app.post("/api/askfred", (req, res) => {
    const { userId, persona, query } = req.body as {
      userId: string;
      persona: Persona;
      query: string;
    };
    const answer = answerAskFred({ userId, persona, query }, store.commitments);
    res.json(answer);
  });

  app.get("/api/manager/rollup", (_req, res) => {
    const rollup = computeManagerRollup(store.commitments, store.now);
    try {
      assertPrivacyLock(rollup);
    } catch (err) {
      res.status(500).json({ error: (err as Error).message });
      return;
    }
    res.json(rollup);
  });

  function act(req: Request, res: Response, fn: (actorId: string) => ReturnType<typeof accept>) {
    try {
      const actorId = String(req.body.actorId ?? "");
      if (!actorId) {
        res.status(400).json({ error: "actorId is required." });
        return;
      }
      const before = store.get(String(req.params.id));
      const next = fn(actorId);
      store.replace(next);
      res.json({ commitment: next, before: before.state, after: next.state });
    } catch (err) {
      const status = err instanceof ConsentError || err instanceof TransitionError ? 409 : 400;
      res.status(status).json({ error: (err as Error).message });
    }
  }

  app.post("/api/commitments/:id/accept", (req, res) =>
    act(req, res, (actorId) => accept(store.get(String(req.params.id)), actorId, store.now)),
  );
  app.post("/api/commitments/:id/dismiss", (req, res) =>
    act(req, res, (actorId) => dismissToBucket(store.get(String(req.params.id)), actorId, store.now)),
  );
  app.post("/api/commitments/:id/redirect", (req, res) =>
    act(req, res, (actorId) =>
      redirect(store.get(String(req.params.id)), actorId, String(req.body.targetUserId ?? ""), store.now),
    ),
  );
  app.post("/api/commitments/:id/claim", (req, res) =>
    act(req, res, (actorId) => claim(store.get(String(req.params.id)), actorId, store.now)),
  );
  app.post("/api/commitments/:id/complete", (req, res) =>
    act(req, res, (actorId) =>
      complete(
        store.get(String(req.params.id)),
        actorId,
        store.now,
        req.body.verification ? String(req.body.verification) : undefined,
      ),
    ),
  );
  app.post("/api/commitments/:id/decline", (req, res) =>
    act(req, res, (actorId) =>
      decline(store.get(String(req.params.id)), actorId, store.now, String(req.body.reason ?? "")),
    ),
  );
  app.post("/api/commitments/:id/flag", (req, res) =>
    act(req, res, (actorId) =>
      flagExecution(store.get(String(req.params.id)), actorId, store.now, String(req.body.category ?? "")),
    ),
  );
  app.post("/api/commitments/:id/drop", (req, res) =>
    act(req, res, (actorId) => drop(store.get(String(req.params.id)), actorId, store.now)),
  );
  app.post("/api/commitments/:id/clarify", (req, res) =>
    act(req, res, (actorId) =>
      clarify(store.get(String(req.params.id)), actorId, String(req.body.text ?? ""), store.now),
    ),
  );
  app.post("/api/commitments/:id/keep-open", (req, res) =>
    act(req, res, (actorId) =>
      keepOpen(store.get(String(req.params.id)), actorId, String(req.body.meetingId ?? ""), store.now),
    ),
  );
  app.post("/api/commitments/:id/stop-resurface", (req, res) =>
    act(req, res, (actorId) => stopResurfacing(store.get(String(req.params.id)), actorId, store.now)),
  );

  return app;
}
