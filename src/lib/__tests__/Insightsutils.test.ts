import {describe, test, expect, jest} from "@jest/globals";
import {sentimentToScore, scoreToLabel, computeDayOfWeekAverages,
  getBestAndWorstDay, getMonthlyAverage, getMonthlyConsistency} from "../insightsUtils";
import {Entry, SentimentLabel } from "../types";

/** Minimal entry for the insight calculations */
function entry(entryDate: string, sentimentLabel: SentimentLabel | null): Entry {
  return {entryDate, sentimentLabel} as unknown as Entry;
}

describe("insightsUtils", () => {
  test("sentiment labels map to scores and back to the same label", () => {
    const labels: SentimentLabel[] = ["very_negative", "negative", "neutral", "positive", "very_positive"];
    labels.forEach((l) => expect(scoreToLabel(sentimentToScore(l)!)).toBe(l));
    expect(sentimentToScore(null)).toBeNull();
  });

  test("day of week averages ignore weekdays with fewer than two entries", () => {
    const entries = [
      entry("2026-09-07", "positive"), entry("2026-09-14", "very_positive"),
      entry("2026-09-08", "negative"), entry("2026-09-15", "neutral"),
      entry("2026-09-09", "very_negative"),
    ];
    expect(computeDayOfWeekAverages(entries)).toEqual({0: 3.5, 1: 1.5});
  });

  test("getBestAndWorstDay picks the highest and lowest averaged weekday", () => {
    const entries = [
      entry("2026-09-07", "positive"), entry("2026-09-14", "very_positive"),
      entry("2026-09-08", "negative"), entry("2026-09-15", "neutral"),
      entry("2026-09-12", "neutral"), entry("2026-09-19", "positive"),
    ];
    expect(getBestAndWorstDay(entries)).toMatchObject({best: 0, worst: 1});
  });

  test("getMonthlyAverage only uses labelled entries from the requested month", () => {
    const entries = [
      entry("2026-09-01", "positive"), entry("2026-09-02", "neutral"),
      entry("2026-09-03", null), entry("2026-08-31", "very_negative"),
    ];
    expect(getMonthlyAverage(entries, 2026, 8)).toBe(2.5);
    expect(getMonthlyAverage(entries, 2026, 6)).toBeNull();
  });

  test("getMonthlyConsistency uses days elapsed this month and full length for past months", () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 10, 12));
    const entries = [entry("2026-09-01", "positive"), entry("2026-09-05", null), entry("2026-02-03", "neutral")];
    expect(getMonthlyConsistency(entries, 2026, 8)).toEqual({journaled: 2, total: 10});
    expect(getMonthlyConsistency(entries, 2026, 1)).toEqual({journaled: 1, total: 28});
    jest.useRealTimers();
  });
});