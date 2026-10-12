import { stagingQuotesNote } from "@/lib/shipping/config";

/** Visible only in local development while WARP_ENV is staging. */
export function StagingQuotesNote() {
  const note = stagingQuotesNote();
  if (!note) return null;

  return (
    <p className="mb-4 text-xs font-medium text-amber-800">{note}</p>
  );
}
