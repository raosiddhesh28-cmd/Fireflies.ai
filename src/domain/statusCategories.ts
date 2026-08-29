export const STATUS_CATEGORIES = [
  "not_accepted",
  "wrong_owner",
  "not_started",
  "competing_priorities",
  "dependency_missing",
  "dependency_delayed",
  "partial_completion",
  "quality_failure",
  "rework",
  "requirement_changed",
  "resource_unavailable",
  "communication_failure",
  "deadline_missed",
] as const;

export type StatusCategory = (typeof STATUS_CATEGORIES)[number];

export type StatusGroup =
  | "pre_acceptance"
  | "execution_delay"
  | "dependency"
  | "completion_quality"
  | "external_blocker"
  | "time_bound";

export const DECLINE_REASONS = [
  "wrong_owner",
  "competing_priorities",
  "requirement_changed",
  "resource_unavailable",
] as const;

export type DeclineReason = (typeof DECLINE_REASONS)[number];

export const DEPENDENCY_FLAGS = ["dependency_missing", "dependency_delayed"] as const;
export type DependencyFlag = (typeof DEPENDENCY_FLAGS)[number];

export const QUALITY_FLAGS = ["partial_completion", "quality_failure", "rework"] as const;
export type QualityFlag = (typeof QUALITY_FLAGS)[number];

export const EXECUTION_FLAGS = [
  "not_started",
  "competing_priorities",
  "dependency_missing",
  "dependency_delayed",
  "deadline_missed",
  "communication_failure",
  "resource_unavailable",
] as const;

export type ExecutionFlag = (typeof EXECUTION_FLAGS)[number];

export const RESURFACE_PRIORITY = [
  "not_started",
  "deadline_missed",
  "communication_failure",
] as const;

export type ResurfacePriority = (typeof RESURFACE_PRIORITY)[number];

export const STATUS_META: Record<
  StatusCategory,
  { label: string; group: StatusGroup; closesCommitment: boolean; blocksWithoutFailing: boolean }
> = {
  not_accepted: {
    label: "Not accepted",
    group: "pre_acceptance",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
  wrong_owner: {
    label: "Wrong owner",
    group: "pre_acceptance",
    closesCommitment: true,
    blocksWithoutFailing: false,
  },
  not_started: {
    label: "Not started",
    group: "execution_delay",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
  competing_priorities: {
    label: "Competing priorities",
    group: "execution_delay",
    closesCommitment: true,
    blocksWithoutFailing: false,
  },
  dependency_missing: {
    label: "Dependency missing",
    group: "dependency",
    closesCommitment: false,
    blocksWithoutFailing: true,
  },
  dependency_delayed: {
    label: "Dependency delayed",
    group: "dependency",
    closesCommitment: false,
    blocksWithoutFailing: true,
  },
  partial_completion: {
    label: "Partial completion",
    group: "completion_quality",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
  quality_failure: {
    label: "Quality failure",
    group: "completion_quality",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
  rework: {
    label: "Rework",
    group: "completion_quality",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
  requirement_changed: {
    label: "Requirement changed",
    group: "external_blocker",
    closesCommitment: true,
    blocksWithoutFailing: false,
  },
  resource_unavailable: {
    label: "Resource unavailable",
    group: "external_blocker",
    closesCommitment: true,
    blocksWithoutFailing: false,
  },
  communication_failure: {
    label: "Communication failure",
    group: "external_blocker",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
  deadline_missed: {
    label: "Deadline missed",
    group: "time_bound",
    closesCommitment: false,
    blocksWithoutFailing: false,
  },
};

export function isDeclineReason(value: string): value is DeclineReason {
  return (DECLINE_REASONS as readonly string[]).includes(value);
}

export function isExecutionFlag(value: string): value is ExecutionFlag {
  return (EXECUTION_FLAGS as readonly string[]).includes(value);
}

export function isQualityFlag(value: string): value is QualityFlag {
  return (QUALITY_FLAGS as readonly string[]).includes(value);
}

export function isResurfacePriority(category: StatusCategory | null): boolean {
  return Boolean(category && (RESURFACE_PRIORITY as readonly string[]).includes(category));
}

export function statusLabel(category: StatusCategory | null): string | null {
  return category ? STATUS_META[category].label : null;
}
