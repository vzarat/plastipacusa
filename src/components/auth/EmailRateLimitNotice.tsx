import { AlertTriangle } from "lucide-react";
import { EMAIL_RATE_LIMIT_MESSAGE } from "@/lib/auth/email-rate-limit";

export function EmailRateLimitNotice({ minutesLeft }: { minutesLeft: number }) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-950"
    >
      <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
      <div>
        <strong className="mb-1 block font-bold text-amber-950">
          Please wait {minutesLeft} {minutesLeft === 1 ? "minute" : "minutes"} before trying again
        </strong>
        <span className="font-medium leading-relaxed">{EMAIL_RATE_LIMIT_MESSAGE}</span>
      </div>
    </div>
  );
}
