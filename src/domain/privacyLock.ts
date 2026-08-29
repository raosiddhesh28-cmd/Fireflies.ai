import {
  BASELINE_RESOLUTION_RATE,
  RESOLUTION_WINDOW_DAYS,
  TARGET_RESOLUTION_RATE,
  type Commitment,
  type ManagerRollup,
} from "./types.js";
import { isResolved } from "./types.js";

const INDIVIDUAL_KEYS = new Set([
  "userId",
  "ownerId",
  "proposedOwnerId",
  "requesterId",
  "email",
  "name",
  "owner",
  "assignee",
  "people",
  "users",
  "commitments",
  "drilldown",
]);

export function computeManagerRollup(
  commitments: Commitment[],
  now: Date,
): ManagerRollup {
  const windowMs = RESOLUTION_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  const windowStart = now.getTime() - windowMs;
  const inWindow = commitments.filter(
    (c) => new Date(c.extractedAt).getTime() >= windowStart,
  );
  const resolved = inWindow.filter((c) => isResolved(c.state));
  const created = inWindow.length;
  const currentRate = created === 0 ? 0 : resolved.length / created;

  const byOutcome = {
    completed: inWindow.filter((c) => c.state === "completed").length,
    declined: inWindow.filter((c) => c.state === "declined").length,
    dropped: inWindow.filter((c) => c.state === "dropped").length,
  };

  const trend = buildTrend(inWindow, now);

  return {
    windowDays: RESOLUTION_WINDOW_DAYS,
    baselineRate: BASELINE_RESOLUTION_RATE,
    targetRate: TARGET_RESOLUTION_RATE,
    currentRate,
    createdInWindow: created,
    resolvedInWindow: resolved.length,
    stillOpen: inWindow.filter((c) => c.state === "open").length,
    needsOwnership: inWindow.filter((c) => c.state === "needs_ownership").length,
    pendingAcceptance: inWindow.filter(
      (c) => c.state === "needs_confirmation" || c.state === "handoff_pending",
    ).length,
    byOutcome,
    trend,
  };
}

function buildTrend(inWindow: Commitment[], now: Date): ManagerRollup["trend"] {
  const periods: ManagerRollup["trend"] = [];
  for (let i = 3; i >= 0; i -= 1) {
    const end = new Date(now.getTime() - i * 7 * 24 * 60 * 60 * 1000);
    const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
    const slice = inWindow.filter((c) => {
      const t = new Date(c.extractedAt).getTime();
      return t >= start.getTime() && t < end.getTime() + (i === 0 ? 1 : 0);
    });
    const created = slice.length;
    const resolved = slice.filter((c) => isResolved(c.state)).length;
    periods.push({
      period: `Week ${4 - i}`,
      created,
      resolved,
      rate: created === 0 ? 0 : resolved / created,
    });
  }
  return periods;
}

export function assertPrivacyLock(payload: unknown): void {
  walk(payload, []);
}

function walk(value: unknown, path: string[]): void {
  if (Array.isArray(value)) {
    value.forEach((item, i) => walk(item, [...path, String(i)]));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, nested] of Object.entries(value)) {
      if (INDIVIDUAL_KEYS.has(key)) {
        throw new Error(
          `Privacy lock: manager rollup must not include individual field "${key}" at ${path.join(".") || "root"}.`,
        );
      }
      walk(nested, [...path, key]);
    }
  }
}
