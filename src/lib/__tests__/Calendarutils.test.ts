import {describe, test, expect} from "@jest/globals";
import {buildMonthGrid} from "../calendarUtils";

describe("calendarUtils", () => {
  test("buildMonthGrid starts on Monday and fills complete weeks", () => {
    const cells = buildMonthGrid(2026, 8);
    expect(cells[0]).toBeNull();
    expect(cells[1]).toBe("2026-09-01");
    expect(cells.length % 7).toBe(0);
    expect(cells.filter(Boolean)).toHaveLength(30);
  });
});