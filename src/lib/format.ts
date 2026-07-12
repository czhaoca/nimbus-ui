/**
 * Shared display formatters (#34). Unknown is always the em-dash — never a
 * fabricated $0 or "Invalid Date" (honest-degradation rule).
 */

const EM_DASH = "—";

export function formatCost(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value)) return EM_DASH;
  return `$${value.toFixed(2)}`;
}

// UTC-pinned on purpose: the inline `toLocaleString()` idiom this replaces
// renders differently per machine TZ, which unit tests and the hermetic e2e
// text asserts can't tolerate. The zone is shown so the pin stays honest.
const TIMESTAMP_FORMAT = new Intl.DateTimeFormat("en-US", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "UTC",
});

export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return EM_DASH;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return EM_DASH;
  // ICU ≥72 emits U+202F before AM/PM; normalize so text asserts can use
  // plain spaces.
  const text = TIMESTAMP_FORMAT.format(date).replace(/[  ]/g, " ");
  return `${text} UTC`;
}
