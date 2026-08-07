import { formatDateString } from "./dateUtils";

/** Returns the Monday and Sunday of the previous complete week as YYYY-MM-DD */
export function getLastWeekRange(): {
    start: string; end: string
    } {
  const today = new Date();
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
  const today = new Date();
  // Setting day to 0 on the current month gives the last day of the previous month
  const lastOfPrevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
  const firstOfPrevMonth = new Date(lastOfPrevMonth.getFullYear(), lastOfPrevMonth.getMonth(), 1);
  return {
    start: formatDateString(firstOfPrevMonth),
    end: formatDateString(lastOfPrevMonth),
  };
}

// Returns a human-readable label for a summary period like "Last week" or "July 2026"
export function formatPeriodLabel(periodType: "weekly" | "monthly", start: string): string {
  if (periodType == "weekly") return "Last week";
  const date = new Date(start + "T00:00:00");
  return date.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
}