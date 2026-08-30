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
  fromExtraction,
  keepOpen,
  redirect,
  stopResurfacing,
  ConsentError,
  TransitionError,
} from "../domain/stateMachine.js";
import { applyResurfaceVisit, unresolvedForRecurringMeeting } from "../domain/resurfacing.js";
import { answerAskFred } from "../domain/askFred.js";
import { assertPrivacyLock, computeManagerRollup } from "../domain/privacyLock.js";
import { extractFromTranscript } from "../domain/extraction.js";
import type { ExtractionRecord, Meeting, Persona } from "../domain/types.js";

export function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json({ limit: "2mb" }));

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

  app.post("/api/meetings/upload", async (req, res) => {
    const title = String(req.body?.title ?? "").trim();
    const transcriptText = String(req.body?.transcriptText ?? "").trim();
    const seriesId =
      req.body?.seriesId === null || req.body?.seriesId === undefined || req.body?.seriesId === ""
        ? null
        : String(req.body.seriesId);

    if (!title || !transcriptText) {
      res.status(400).json({ error: "title and transcriptText are required." });
      return;
    }

    let extracted: Awaited<ReturnType<typeof extractFromTranscript>>;
    try {
      extracted = await extractFromTranscript({
        transcriptText,
        meetingTitle: title,
        knownUsers: store.users,
      });
    } catch (err) {
      res.status(502).json({
        error: (err as Error).message || "Commitment extraction failed.",
      });
      return;
    }

    const meeting: Meeting = {
      id: `mtg-${crypto.randomUUID()}`,
      title,
      seriesId,
      startsAt: store.now.toISOString(),
      cancelled: false,
    };
    store.addMeeting(meeting);

    const now = store.now;
    const commitments = extracted.extractions.map((row, index) => {
      const record: ExtractionRecord = {
        id: `ext-${meeting.id}-${index}`,
        meetingId: meeting.id,
        text: row.text,
        transcriptLine: row.transcriptLine,
        suggestedOwnerId: row.suggestedOwnerId,
        requesterId: row.requesterId ?? "",
        extractedAt: now.toISOString(),
      };
      return fromExtraction({ ...record, seriesId: meeting.seriesId }, now);
    });
    store.commitments = [...store.commitments, ...commitments];
    res.json({ meeting, summary: extracted.summary, commitments });
  });

  app.get("/api/meetings/:id/resurface", (req, res) => {
    const meeting = store.meeting(req.params.id);
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
      const before = store.get(req.params.id);
      const next = fn(actorId);
      store.replace(next);
      res.json({ commitment: next, before: before.state, after: next.state });
    } catch (err) {
      const status = err instanceof ConsentError || err instanceof TransitionError ? 409 : 400;
      res.status(status).json({ error: (err as Error).message });
    }
  }

  app.post("/api/commitments/:id/accept", (req, res) =>
    act(req, res, (actorId) => accept(store.get(req.params.id), actorId, store.now)),
  );
  app.post("/api/commitments/:id/dismiss", (req, res) =>
    act(req, res, (actorId) => dismissToBucket(store.get(req.params.id), actorId, store.now)),
  );
  app.post("/api/commitments/:id/redirect", (req, res) =>
    act(req, res, (actorId) =>
      redirect(store.get(req.params.id), actorId, String(req.body.targetUserId ?? ""), store.now),
    ),
  );
  app.post("/api/commitments/:id/claim", (req, res) =>
    act(req, res, (actorId) => claim(store.get(req.params.id), actorId, store.now)),
  );
  app.post("/api/commitments/:id/complete", (req, res) =>
    act(req, res, (actorId) => complete(store.get(req.params.id), actorId, store.now)),
  );
  app.post("/api/commitments/:id/decline", (req, res) =>
    act(req, res, (actorId) => decline(store.get(req.params.id), actorId, store.now)),
  );
  app.post("/api/commitments/:id/drop", (req, res) =>
    act(req, res, (actorId) => drop(store.get(req.params.id), actorId, store.now)),
  );
  app.post("/api/commitments/:id/clarify", (req, res) =>
    act(req, res, (actorId) =>
      clarify(store.get(req.params.id), actorId, String(req.body.text ?? ""), store.now),
    ),
  );
  app.post("/api/commitments/:id/keep-open", (req, res) =>
    act(req, res, (actorId) =>
      keepOpen(store.get(req.params.id), actorId, String(req.body.meetingId ?? ""), store.now),
    ),
  );
  app.post("/api/commitments/:id/stop-resurface", (req, res) =>
    act(req, res, (actorId) => stopResurfacing(store.get(req.params.id), actorId, store.now)),
  );

  return app;
}
