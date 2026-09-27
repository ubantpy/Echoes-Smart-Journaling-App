
/** Fake databsase, take any arguments, return anything */
type AnyFn = (...args: any[]) => any;

const mockDb = {
  execSync: jest.fn<AnyFn>(),
  runSync: jest.fn<AnyFn>(),
  getFirstSync: jest.fn<AnyFn>(),
  getAllSync: jest.fn<AnyFn>(),
};
jest.mock("expo-sqlite", () => ({openDatabaseSync: () => mockDb}),{virtual: true});
import {describe, test, expect, jest, beforeEach, afterEach} from "@jest/globals";
import{initDatabase, getStreak, getLongestStreak, importData, insertEntry} from "../db";
import{setDayCutoffHour} from "../dateUtils";

/** fake database return the given entry dates */
function withDates(dates: string[]){
  mockDb.getAllSync.mockReturnValue(dates.map((d) => ({entry_date: d})));
}

describe("db", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2026, 8, 20, 12));
    setDayCutoffHour(3);
    initDatabase();
  });
  afterEach(() => {jest.useRealTimers();});;

  test("getStreak counts consecutive days ending today and stops at a gap", () => {
    withDates(["2026-09-20", "2026-09-19", "2026-09-18", "2026-09-16"]);
    expect(getStreak()).toBe(3);
  });

  test("getStreak counts from yesterday when today has no entry yet", () => {
    withDates(["2026-09-19", "2026-09-18"]);
    expect(getStreak()).toBe(2);
  });

  test("getLongestStreak finds the longest run", () => {
    withDates(["2026-08-29", "2026-08-30", "2026-08-31", "2026-09-01", "2026-09-05", "2026-09-06"]);
    expect(getLongestStreak()).toBe(4);
  });

  test("importData rejects invalid files without touching the database", () => {
    expect(importData("not json")).toBe(false);
    expect(importData(JSON.stringify({version: 2, entries: [], summaries: []}))).toBe(false);
    expect(importData(JSON.stringify({version: 1, entries: [{}], summaries: []}))).toBe(false);
    expect(mockDb.execSync).not.toHaveBeenCalledWith("BEGIN TRANSACTION");
  });

  test("importData rolls back the whole import if one insert fails", () => {
    mockDb.runSync.mockImplementationOnce(() => {throw new Error("disk full");});
    const backup = {version: 1, entries: [{entry_date: "2026-09-01"}], summaries: []};
    expect(importData(JSON.stringify(backup))).toBe(false);
    expect(mockDb.execSync).toHaveBeenCalledWith("ROLLBACK");
    expect(mockDb.execSync).not.toHaveBeenCalledWith("COMMIT");
  });

  test("re-adding an entry for a deleted day restores it (is_deleted reset to 0)", () => {
    mockDb.getFirstSync.mockReturnValue({id: 1});
    insertEntry({entryDate: "2026-09-12", mainText: "New entry"});
    const sql: string = mockDb.runSync.mock.calls[0][0];
    expect(sql).toMatch(/^UPDATE entries/);
    expect(sql).toContain("is_deleted = 0");
  });

  test("entries below 50% confidence are flagged as low confidence", () => {
    mockDb.getFirstSync.mockReturnValue(null);
    insertEntry({entryDate: "2026-09-12", mainText: "Text", sentimentLabel: "positive", sentimentConfidence: 49.9});
    insertEntry({entryDate: "2026-09-13", mainText: "Text", sentimentLabel: "positive", sentimentConfidence: 50});
    expect(mockDb.runSync.mock.calls[0][1][5]).toBe(1);
    expect(mockDb.runSync.mock.calls[1][1][5]).toBe(0);
  });
});