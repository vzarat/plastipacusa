/** Shared credit timeline status types/constants (safe for client + server imports). */

export type CreditApplicationStatus =
  | "pending"
  | "verifying_references"
  | "action_required"
  | "approved"
  | "rejected";

export type ReferenceVerifyStatus = "pending_check" | "verified" | "unreachable";

export const CREDIT_APPLICATION_STATUSES = [
  "pending",
  "verifying_references",
  "action_required",
  "approved",
  "rejected",
] as const satisfies ReadonlyArray<CreditApplicationStatus>;

export const REFERENCE_VERIFY_STATUSES = [
  "pending_check",
  "verified",
  "unreachable",
] as const satisfies ReadonlyArray<ReferenceVerifyStatus>;
