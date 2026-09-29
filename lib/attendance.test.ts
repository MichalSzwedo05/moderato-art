import { describe, expect, it } from "vitest";
import { attendanceDateString, getAttendanceWeekStart, parseAttendanceWeek, shiftAttendanceWeek } from "./attendance";

describe("attendance calendar helpers", () => {
  it("starts weeks on Monday", () => {
    expect(attendanceDateString(getAttendanceWeekStart(new Date("2026-09-25T12:00:00Z")))).toBe("2026-09-21");
  });

  it("accepts a requested week and shifts by seven days", () => {
    const week = parseAttendanceWeek("2026-09-21");
    expect(attendanceDateString(shiftAttendanceWeek(week, 1))).toBe("2026-09-28");
  });
});
