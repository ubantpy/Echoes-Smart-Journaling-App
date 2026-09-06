import { getSummary, getEntriesInRange, insertSummary } from "./db";
import { getLastWeekRange, getLastMonthRange } from "./summaryUtils";
import { fetchSummary } from "./summary";

// Minimum number of entries for summary generation
const MIN_ENTRIES = 3;

/** Checks one period and generates a summary if it doesn't exist yet */
async function generateIfNeeded(
  periodType: "weekly" | "monthly",
  start: string,
  end: string
): Promise<void> {
  // Do nothing if an echo already exists for this period
  if (getSummary(periodType, start)) return;

  // Fetch all entries in the date range
  const entries = getEntriesInRange(start, end);

  // If not enough entries, skip without calling the backend
  if (entries.length < MIN_ENTRIES) return;

  // Concatenate entry texts into one block for the backend
  const texts = entries.map((e) => e.mainText);
  const summaryText = await fetchSummary(texts, periodType);
  if (!summaryText) return;

  // Persist the generated echo to SQLite
  insertSummary({ periodType, periodStart: start, periodEnd: end, summaryText });
}

/** Entry point - checks and generates weekly and monthly summaries if needed.
 * Called on every app open (silently fails so the app never crashes on network issues.) */
export async function generateSummariesIfNeeded(): Promise<void> {
  try {
    const week = getLastWeekRange();
    const month = getLastMonthRange();
    // Run sequentially to avoid hammering the backend simultaneously
    await generateIfNeeded("weekly", week.start, week.end);
    await generateIfNeeded("monthly", month.start, month.end);
  }
  catch {
    // Silently catch - will retry on the next app open
  }
}