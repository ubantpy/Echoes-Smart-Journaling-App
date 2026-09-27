import {getTodayDate, getLastNDates, setDayCutoffHour} from "../dateUtils";
import {describe, test, expect, jest, beforeEach, afterEach} from "@jest/globals";

/** Freeze the clock*/
function setNow(y: number, m :number, d: number, h = 12){
    jest.setSystemTime(new Date(y, m, d, h, 0, 0));
}

describe("dateUtils", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setDayCutoffHour(3);
  });
  afterEach(() => {jest.useRealTimers();});;
 
  test("getTodayDate returns the calendar date after the day boundary", () => {
    setNow(2026, 8, 14, 10);
    expect(getTodayDate()).toBe("2026-09-14");
  });
 
  test("getTodayDate treats time before the boundary as the previous day", () => {
    setNow(2026, 8, 14, 2);
    expect(getTodayDate()).toBe("2026-09-13");
  });
 
  test("getLastNDates returns N dates, oldest first, across a month", () => {
    setNow(2026, 9, 2);
    expect(getLastNDates(4)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01", "2026-10-02"]);
  });
});