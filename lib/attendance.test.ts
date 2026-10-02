import { describe, expect, it } from "vitest";
import { attendanceDateStart, attendanceDateString, attendanceRepeatDates, getAttendanceWeekStart, parseAttendanceDateTime, parseAttendanceWeek, shiftAttendanceWeek } from "./attendance";

describe("attendance calendar helpers", () => {
  it("starts weeks on Monday", () => {
    expect(attendanceDateString(getAttendanceWeekStart(new Date("2026-09-25T12:00:00Z")))).toBe("2026-09-21");
  });

  it("accepts a requested week and shifts by seven days", () => {
    const week = parseAttendanceWeek("2026-09-21");
    expect(attendanceDateString(shiftAttendanceWeek(week, 1))).toBe("2026-09-28");
  });

  it("parses calendar days as explicit UTC midnight", () => {
    expect(attendanceDateStart("2026-09-23").toISOString()).toBe("2026-09-23T00:00:00.000Z");
  });

  it("parses activity times as explicit UTC", () => {
    expect(parseAttendanceDateTime("2026-09-23", "16:30")?.toISOString()).toBe("2026-09-23T16:30:00.000Z");
    expect(parseAttendanceDateTime("2026-09-23", "25:00")).toBeUndefined();
  });

  it("expands a weekly repeat onto the same weekday", () => {
    expect(attendanceRepeatDates("2026-09-23", 3)).toEqual(["2026-09-23", "2026-09-30", "2026-10-07"]);
    expect(attendanceRepeatDates("2026-09-23", 1)).toEqual(["2026-09-23"]);
  });

  it("keeps weekly repeats on the same weekday across month boundaries", () => {
    expect(attendanceRepeatDates("2026-09-30", 2)).toEqual(["2026-09-30", "2026-10-07"]);
  });
});
