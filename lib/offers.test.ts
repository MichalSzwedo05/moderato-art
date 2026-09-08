import { describe, expect, it } from "vitest";
import { lessonTypeTabs } from "./offers";

describe("lessonTypeTabs", () => {
  it("maps each enrollable lesson type to its spreadsheet tab name", () => {
    expect(lessonTypeTabs).toEqual({
      "rytmika": "Rytmisolki",
      "junior-voice": "Junior Voice",
      "studio-wokalne": "Studio Wokalne",
      "rehabilitacja-zaburzen-glosu": "Rehabilitacja zaburzeń głosu",
    });
  });
});
