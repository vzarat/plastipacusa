export type StripeSideEffect =
  | { kind: "pending_notice"; label: "payment_failed" | "canceled" }
  | { kind: "review"; reason: string }
  | { kind: "other" };

/** Failed and canceled payments stay pending. Refunds and disputes are flagged. Stock is not changed here. */
export function stripeEventSideEffect(type: string): StripeSideEffect {
  if (type === "payment_intent.payment_failed") return { kind: "pending_notice", label: "payment_failed" };
  if (type === "payment_intent.canceled") return { kind: "pending_notice", label: "canceled" };
  if (type === "charge.refunded") return { kind: "review", reason: "Charge refunded." };
  if (type === "charge.dispute.created") return { kind: "review", reason: "Charge disputed." };
  return { kind: "other" };
}

export async function runIdempotentSideEffect(input: {
  alreadyProcessed: boolean;
  apply: () => Promise<"ok" | "failed">;
  record: () => Promise<void>;
}): Promise<"duplicate" | "done" | "failed"> {
  if (input.alreadyProcessed) return "duplicate";
  if ((await input.apply()) === "failed") return "failed";
  await input.record();
  return "done";
}
