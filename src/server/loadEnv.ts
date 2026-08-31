import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

/** Later files override earlier ones. Shell env still wins. */
export const SERVER_ENV_FILES = [".env", ".env.development", ".env.local"] as const;

export function loadServerEnv(cwd = process.cwd()): string[] {
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
    if (value !== undefined) process.env[key] = value;
  }
  return loaded;
}
