import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** Later files override earlier ones. A non-empty shell value still wins. */
export const SERVER_ENV_FILES = [".env", ".env.development", ".env.local"] as const;

/** Repo root (`src/server/loadEnv.ts` → `../..`), so cwd cannot hide `.env.local`. */
export function envFilesRoot(): string {
  return resolve(dirname(fileURLToPath(import.meta.url)), "../..");
}

export function loadServerEnv(cwd = envFilesRoot()): string[] {
  let config: (opts: { path: string; override: boolean }) => void;
  try {
    config = createRequire(import.meta.url)("dotenv").config;
  } catch (err) {
    console.warn(
      "[server] dotenv not loaded; set ANTHROPIC_API_KEY in the environment.",
      err instanceof Error ? err.message : err,
    );
    return [];
  }

  const preset = { ...process.env };
  const loaded: string[] = [];
  for (const name of SERVER_ENV_FILES) {
    const path = resolve(cwd, name);
    if (!existsSync(path)) continue;
    config({ path, override: true });
    loaded.push(name);
  }
  for (const [key, value] of Object.entries(preset)) {
    // Empty shell/export ANTHROPIC_API_KEY= must not wipe `.env.local`.
    if (value !== undefined && value !== "") process.env[key] = value;
  }
  return loaded;
}
