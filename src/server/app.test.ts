import { afterAll, beforeAll, describe, expect, it } from "vitest";
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
});
