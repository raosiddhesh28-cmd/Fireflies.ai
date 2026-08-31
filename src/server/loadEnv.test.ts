import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { loadServerEnv } from "./loadEnv.js";

describe("loadServerEnv", () => {
  const previousKey = process.env.ANTHROPIC_API_KEY;

  afterEach(() => {
    if (previousKey === undefined) delete process.env.ANTHROPIC_API_KEY;
    else process.env.ANTHROPIC_API_KEY = previousKey;
  });

  it("lets .env.local override an empty ANTHROPIC_API_KEY from .env", () => {
    delete process.env.ANTHROPIC_API_KEY;
    const dir = mkdtempSync(join(tmpdir(), "load-env-"));
    writeFileSync(join(dir, ".env"), "ANTHROPIC_API_KEY=\n");
    writeFileSync(join(dir, ".env.development"), "ANTHROPIC_API_KEY=from-development\n");
    writeFileSync(join(dir, ".env.local"), "ANTHROPIC_API_KEY=from-local\n");

    const loaded = loadServerEnv(dir);

    expect(loaded).toEqual([".env", ".env.development", ".env.local"]);
    expect(process.env.ANTHROPIC_API_KEY).toBe("from-local");
  });

  it("does not override a key already set in the process environment", () => {
    process.env.ANTHROPIC_API_KEY = "from-shell";
    const dir = mkdtempSync(join(tmpdir(), "load-env-"));
    writeFileSync(join(dir, ".env.local"), "ANTHROPIC_API_KEY=from-local\n");

    loadServerEnv(dir);

    expect(process.env.ANTHROPIC_API_KEY).toBe("from-shell");
  });

  it("treats an empty shell ANTHROPIC_API_KEY as unset so .env.local can win", () => {
    process.env.ANTHROPIC_API_KEY = "";
    const dir = mkdtempSync(join(tmpdir(), "load-env-"));
    writeFileSync(join(dir, ".env.local"), "ANTHROPIC_API_KEY=from-local\n");

    loadServerEnv(dir);

    expect(process.env.ANTHROPIC_API_KEY).toBe("from-local");
  });

  it("skips missing files", () => {
    delete process.env.ANTHROPIC_API_KEY;
    const dir = mkdtempSync(join(tmpdir(), "load-env-"));
    writeFileSync(join(dir, ".env"), "ANTHROPIC_API_KEY=from-env\n");

    const loaded = loadServerEnv(dir);

    expect(loaded).toEqual([".env"]);
    expect(process.env.ANTHROPIC_API_KEY).toBe("from-env");
  });
});
