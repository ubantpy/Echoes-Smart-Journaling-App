import { Entry } from "./types";
import { formatDateString } from "./dateUtils";

export const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export const MONTH_NAMES_SHORT = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];

/** Maps sentiment label to theme mood colour */
export const MOOD_COLOURS: Record<string, string> = {
  very_positive: "#3E9B78",
  positive: "#5C9985",
  neutral: "#7C9791",
  negative: "#8C918D",
  very_negative: "#958383",
};

/** Maps sentiment label to a short human-readable string */
export const MOOD_LABELS: Record<string, string> = {
  very_positive: "Great",
  positive: "Good",
  neutral: "Neutral",
  negative: "Low",
  very_negative: "Very low",
};

/**
 * Returns the mood colour string for an entry's sentiment label,
 * or null when no sentiment is available.
 */
export function getMoodColour(entry: Entry | undefined): string | null {
  if (!entry?.sentimentLabel) return null;
  return MOOD_COLOURS[entry.sentimentLabel] ?? null;
}

/**
 * Builds a flat array of calendar cells for a given year and month (0-indexed).
 * Returns YYYY-MM-DD strings for real days and null for leading/trailing padding.
 * The grid always begins on Monday.
 */
export function buildMonthGrid(year: number, month: number): (string | null)[] {
  const firstDay = new Date(year, month, 1);
  // JS getDay() returns 0=Sun; shift so 0=Mon, 6=Sun
  const leadingNulls = (firstDay.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (string | null)[] = Array(leadingNulls).fill(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push(formatDateString(new Date(year, month, d)));
  }
  // Pad to complete the final row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

/**
 * Builds exactly 12 columns for the year view - one per calendar month.
 * Each column contains only the real days in that month, no null padding.
 * Columns will have different heights (28–31 entries) which is intentional.
 */
export function buildYearColumns(year: number): (string | null)[][] {
  return Array.from({ length: 12 }, (_, month) => {
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysInMonth }, (_, d) =>
      formatDateString(new Date(year, month, d + 1))
    );
  });
}

/**
 * Formats a YYYY-MM-DD date string as a long human-readable date,
 * e.g. "Thursday, 7 August".
 */
export function formatLongDate(dateStr: string): string {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}