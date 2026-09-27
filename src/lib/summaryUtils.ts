import { formatDateString, getTodayDate } from "./dateUtils";

/** Returns the Monday and Sunday of the previous complete week as YYYY-MM-DD */
export function getLastWeekRange(): {
    start: string; end: string
    } {
  const today = new Date(getTodayDate() + "T00:00:00");
  // getDay() returns 0=Sun, 1=Mon etc. Convert to 0=Mon
  const daysSinceMonday = (today.getDay() + 6) % 7;
  // Last Sunday = yesterday relative to this week's Monday
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysSinceMonday - 1);
  // Last Monday = 6 days before last Sunday
  const lastMonday = new Date(lastSunday);
  lastMonday.setDate(lastSunday.getDate() - 6);
  return {
    start: formatDateString(lastMonday),
    end: formatDateString(lastSunday),
  };
}

/** Returns the first and last day of the previous calendar month as YYYY-MM-DD */
export function getLastMonthRange(): { start: string; end: string } {
  const today = new Date(getTodayDate() + "T00:00:00");
  // Setting day to 0 on the current month gives the last day of the previous month
  const lastOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
  return {
    start: formatDateString(firstOfPrevMonth),
    end: formatDateString(lastOfPrevMonth),
  };
}

/**
 * Returns a human-readable label for a summary period.
 * Weekly without end returns "Last week" (Home screen).
 * Weekly with end returns a date range like "28 Jul - 3 Aug" (Insights).
 * Monthly returns "July 2026".
 */
export function formatPeriodLabel(
  periodType: "weekly" | "monthly",
  start: string,
  end?: string
): string {
  if (periodType == "weekly") {
    if (!end) return "Last week";
    const s = new Date(start + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    const e = new Date(end + "T00:00:00").toLocaleDateString("en-GB", { day: "numeric", month: "short" });
    return `${s} - ${e}`;
  }
  const date = new Date(start + "T00:00:00");
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}

/**
 * Returns the last n complete week ranges (Mon–Sun), most recent first.
 */
export function getLastNWeekRanges(n: number): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  const today = new Date(getTodayDate() + "T00:00:00");
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const lastSunday = new Date(today);
  lastSunday.setDate(today.getDate() - daysSinceMonday - 1);

  for (let i = 0; i < n; i++) {
    const end = new Date(lastSunday);
    end.setDate(lastSunday.getDate() - i * 7);
    const start = new Date(end);
    start.setDate(end.getDate() - 6);
    ranges.push({ start: formatDateString(start), end: formatDateString(end) });
  }
  return ranges;
}

/**
 * Returns the last n complete calendar month ranges, most recent first.
 */
export function getLastNMonthRanges(n: number): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  const today = new Date(getTodayDate() + "T00:00:00");
  for (let i = 1; i <= n; i++) {
    const lastOfMonth = new Date(today.getFullYear(), today.getMonth() - i + 1, 0);
    const firstOfMonth = new Date(lastOfMonth.getFullYear(), lastOfMonth.getMonth(), 1);
    ranges.push({ start: formatDateString(firstOfMonth), end: formatDateString(lastOfMonth) });
  }
  return ranges;
}

/**
 * Returns all complete week ranges from firstEntryDate to the most recent complete week.
 * Most recent first. Used for the "see all" sheet.
 */
export function getAllWeekRangesFrom(firstEntryDate: string): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  const today = new Date(getTodayDate() + "T00:00:00");
  const daysSinceMonday = (today.getDay() + 6) % 7;
  const cursor = new Date(today);
  cursor.setDate(today.getDate() - daysSinceMonday - 1);

  while (true) {
    const end = new Date(cursor);
    const start = new Date(cursor);
    start.setDate(cursor.getDate() - 6);
    if (formatDateString(end) < firstEntryDate) break;
    ranges.push({ start: formatDateString(start), end: formatDateString(end) });
    cursor.setDate(cursor.getDate() - 7);
  }
  return ranges;
}

/**
 * Returns all complete calendar month ranges from the month of firstEntryDate
 * to the most recent complete month. Most recent first. Used for the "see all" sheet.
 */
export function getAllMonthRangesFrom(firstEntryDate: string): { start: string; end: string }[] {
  const ranges: { start: string; end: string }[] = [];
  const today = new Date(getTodayDate() + "T00:00:00");
  let year = today.getFullYear();
  let month = today.getMonth() - 1;
  if (month < 0) { month = 11; year--; }

  const firstYear = parseInt(firstEntryDate.substring(0, 4));
  const firstMonth = parseInt(firstEntryDate.substring(5, 7)) - 1;

  while (year > firstYear || (year === firstYear && month >= firstMonth)) {
    const firstOfMonth = new Date(year, month, 1);
    const lastOfMonth = new Date(year, month + 1, 0);
    ranges.push({ start: formatDateString(firstOfMonth), end: formatDateString(lastOfMonth) });
    month--;
    if (month < 0) { month = 11; year--; }
  }
  return ranges;
}