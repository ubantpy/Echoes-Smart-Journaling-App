import {getLastWeekRange, getLastMonthRange, getAllWeekRangesFrom} from "../summaryUtils";
import {setDayCutoffHour} from "../dateUtils";
import {describe, test, expect, jest, beforeEach, afterEach} from "@jest/globals";
/** Freeze the clock*/
function setNow(y: number, m :number, d: number, h = 12){
    jest.setSystemTime(new Date(y, m, d, h, 0, 0));
}

describe("summaryUtils", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    setDayCutoffHour(3);
  });
  afterEach(() => {jest.useRealTimers();});;
 
  test("getLastWeekRange on a Monday returns the week that just ended", () => {
    setNow(2026, 8, 28);
    expect(getLastWeekRange()).toEqual({start: "2026-09-21", end: "2026-09-27"});
  });
 
  test("getLastWeekRange on a Sunday does not include the current week", () => {
    setNow(2026, 8, 27);
    expect(getLastWeekRange()).toEqual({start: "2026-09-14", end: "2026-09-20"});
  });
 
  test("getLastWeekRange respects the day boundary", () => {
    setNow(2026, 8, 28, 1);
    expect(getLastWeekRange()).toEqual({start: "2026-09-14", end: "2026-09-20"});
  });
 
  test("getLastMonthRange on 1 January returns December of the previous year", () => {
    setNow(2027, 0, 1);
    expect(getLastMonthRange()).toEqual({start: "2026-12-01", end: "2026-12-31"});
  });
 
  test("getAllWeekRangesFrom lists every complete week back to the first entry", () => {
    setNow(2026, 8, 28);
    const ranges = getAllWeekRangesFrom("2026-09-10");
    expect(ranges).toEqual([
      {start: "2026-09-21", end: "2026-09-27"},
      {start: "2026-09-14", end: "2026-09-20"},
      {start: "2026-09-07", end: "2026-09-13"},
    ]);
  });
});