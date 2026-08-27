import { describe, expect, it, vi } from "vitest";

vi.mock("next/font/google", () => ({ Nunito: () => ({ variable: "--font-nunito" }) }));
vi.mock("./scroll-canvas", () => ({ ScrollCanvas: () => null }));

import { metadata } from "./layout";

describe("root metadata", () => {
  it("uses the original profile name in the site description", () => {
    expect(metadata.description).toContain("Magdalenę Warzechę-Hiller");
    expect(metadata.description).toContain("rehabilitacji zaburzeń głosu");
  });
});
