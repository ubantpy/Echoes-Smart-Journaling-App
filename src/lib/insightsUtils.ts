import { Entry, SentimentLabel } from "./types";

const DAY_NAMES = [
  "Monday", "Tuesday", "Wednesday", "Thursday",
  "Friday", "Saturday", "Sunday",];

/** Maps sentiment label to a numeric score for averaging (0=worst, 4=best) */
export function sentimentToScore(label: SentimentLabel | null): number | null {
  const map: Record<SentimentLabel, number> = {
    very_negative: 0,
    negative: 1,
    neutral: 2,
    positive: 3,
    very_positive: 4,
  };
  if (!label) return null;
  return map[label];
}

/**
 * Maps an average score back to the nearest sentiment label.
 * Used to display a mood chip for averaged values.
 */
export function scoreToLabel(score: number): SentimentLabel {
  if (score >= 3.5) return "very_positive";
  if (score >= 2.5) return "positive";
  if (score >= 1.5) return "neutral";
  if (score >= 0.5) return "negative";
  return "very_negative";
}

/** Computes average mood score grouped by day of week (0=Mon, 6=Sun).
 * Only includes weekdays that have at least 2 entries with sentiment data,
 * to avoid single-entry days skewing the results.
 */
export function computeDayOfWeekAverages(
  entries: Entry[]
): Record<number, number> | null {
  // Accumulate scores per weekday
  const totals: Record<number, number> = {};
  const counts: Record<number, number> = {};

  for (const entry of entries) {
    const score = sentimentToScore(entry.sentimentLabel);
    if (score == null) continue;
    // JS getDay() returns 0=Sun, shift so 0=Mon, 6=Sun
    const dow = (new Date(entry.entryDate + "T00:00:00").getDay() + 6) % 7;
    totals[dow] = (totals[dow] ?? 0) + score;
    counts[dow] = (counts[dow] ?? 0) + 1;
  }

  // Only keep weekdays with at least 2 entries
  const averages: Record<number, number> = {};
  for (const dow in counts) {
    if (counts[dow] >= 2) {
      averages[dow] = totals[dow] / counts[dow];
    }
  }

  // Need at least 2 qualifying weekdays to make a meaningful comparison
  if (Object.keys(averages).length < 2) return null;
  return averages;
}

/**
 * Returns the best and worst day of week by average mood score,
 * or null if there is not enough data to compare.
 */
export function getBestAndWorstDay(
  entries: Entry[]
): { best: number; bestScore: number; worst: number; worstScore: number } | null {
  const averages = computeDayOfWeekAverages(entries);
  if (!averages) return null;

  let best = -1, worst = -1;
  let bestScore = -Infinity, worstScore = Infinity;

  for (const [dowStr, avg] of Object.entries(averages)) {
    const dow = Number(dowStr);
    if (avg > bestScore) { bestScore = avg; best = dow; }
    if (avg < worstScore) { worstScore = avg; worst = dow; }
  }

  if (best == -1 || worst == -1) return null;
  return { best, bestScore, worst, worstScore };
}

/**
 * Returns the average mood score for a given calendar month,
 * or null if there are no entries with sentiment data that month.
 */
export function getMonthlyAverage(
  entries: Entry[],
  year: number,
  month: number
): number | null {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const relevant = entries.filter(
    (e) => e.entryDate.startsWith(prefix) && e.sentimentLabel != null
  );
  if (relevant.length == 0) return null;
  const total = relevant.reduce(
    (sum, e) => sum + (sentimentToScore(e.sentimentLabel) ?? 0), 0
  );
  return total / relevant.length;
}

/**
 * Returns how many days were journaled vs total days in the month so far.
 * For the current month, total is days elapsed so far (not the full month).
 */
export function getMonthlyConsistency(
  entries: Entry[],
  year: number,
  month: number
): { journaled: number; total: number } {
  const prefix = `${year}-${String(month + 1).padStart(2, "0")}`;
  const journaled = entries.filter((e) => e.entryDate.startsWith(prefix)).length;

  const today = new Date();
  const isCurrentMonth = today.getFullYear() == year && today.getMonth() == month;
  // For current month use days elapsed; for past months use full month length
  const total = isCurrentMonth
    ? today.getDate()
    : new Date(year, month + 1, 0).getDate();

  return { journaled, total };
}

/** Returns the full day name for a 0=Mon weekday index */
export function getDayName(dow: number): string {
  return DAY_NAMES[dow] ?? "";
}