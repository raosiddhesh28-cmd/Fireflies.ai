import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { createApp } from "./app.js";
import type { Server } from "node:http";
import { AddressInfo } from "node:net";

describe("manager rollup API", () => {
  let server: Server;
  let base: string;

  beforeAll(async () => {
    const app = createApp();
    server = app.listen(0, "127.0.0.1");
    await new Promise<void>((resolve) => server.once("listening", () => resolve()));
    const { port } = server.address() as AddressInfo;
    base = `http://127.0.0.1:${port}`;
  });

  afterAll(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("never returns individual people or commitments", async () => {
    const res = await fetch(`${base}/api/manager/rollup`);
    const body = await res.json();
    expect(res.ok).toBe(true);
    const raw = JSON.stringify(body);
    expect(raw).not.toMatch(/alex|blair|casey|ownerId|email/i);
    expect(body.users).toBeUndefined();
    expect(body.commitments).toBeUndefined();
    expect(typeof body.currentRate).toBe("number");
  });

  it("accept is refused without the proposed user", async () => {
    const res = await fetch(`${base}/api/commitments/ext-1/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ actorId: "blair" }),
    });
    expect(res.status).toBe(409);
  });

  describe("POST /api/meetings/upload", () => {
    const previousKey = process.env.ANTHROPIC_API_KEY;

    afterEach(() => {
      if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
      else process.env.ANTHROPIC_API_KEY = previousKey;
      vi.unstubAllGlobals();
    });

    it("returns 400 when title or transcript is missing", async () => {
      const res = await fetch(`${base}/api/meetings/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "", transcriptText: "", seriesId: null }),
      });
      expect(res.status).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/required/i);
    });

    it("returns 502 JSON when ANTHROPIC_API_KEY is missing", async () => {
      delete process.env.ANTHROPIC_API_KEY;
      const res = await fetch(`${base}/api/meetings/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Weekly Product Sync",
          transcriptText: "Alex: I'll send the recap.",
          seriesId: null,
        }),
      });
      expect(res.status).toBe(502);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/ANTHROPIC_API_KEY/);
    });

    it("returns 200 when extraction succeeds", async () => {
      process.env.ANTHROPIC_API_KEY = "test-key";
      const realFetch = globalThis.fetch;
      vi.stubGlobal("fetch", async (input: RequestInfo | URL, init?: RequestInit) => {
        if (String(input).includes("api.anthropic.com")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              content: [
                {
                  type: "text",
                  text: JSON.stringify({
                    summary: "Alex will send the recap.",
                    commitments: [
                      {
                        text: "Alex will send the recap.",
                        transcriptLine: "Alex: I'll send the recap.",
                        speakerName: "Alex Chen",
                        requesterName: "Blair",
                      },
                    ],
                  }),
                },
              ],
            }),
            text: async () => "",
          } as Response;
        }
        return realFetch(input as RequestInfo, init);
      });

      const res = await fetch(`${base}/api/meetings/upload`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "Weekly Product Sync",
          transcriptText: "Alex: I'll send the recap.",
          seriesId: null,
        }),
      });
      const body = (await res.json()) as {
        summary: string;
        commitments: unknown[];
        meeting: { title: string };
      };
      expect(res.status).toBe(200);
      expect(body.summary).toContain("recap");
      expect(body.commitments).toHaveLength(1);
      expect(body.meeting.title).toBe("Weekly Product Sync");
    });
  });
});
