import { beforeEach, describe, expect, it, vi } from "vitest";

const readFile = vi.hoisted(() => vi.fn());
const findFirst = vi.hoisted(() => vi.fn());

vi.mock("node:fs/promises", async (importOriginal) => ({ ...(await importOriginal()), readFile }));
vi.mock("@/lib/prisma", () => ({ getPrisma: () => ({ galleryPhoto: { findFirst } }) }));

import { GET } from "./route";

describe("GET /gallery/[id]", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    findFirst.mockResolvedValue({ id: "music-room", imageUrl: "/gallery/music-room" });
    readFile.mockResolvedValue(Buffer.from("jpeg"));
  });

  it("serves a seeded image only while its active database row exists", async () => {
    const response = await GET(new Request("https://moderato-art.example/gallery/music-room"), { params: Promise.resolve({ id: "music-room" }) });

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/jpeg");
    expect(response.headers.get("Cache-Control")).toBe("no-store");
  });

  it("returns 404 for an inactive or unknown asset", async () => {
    findFirst.mockResolvedValue(undefined);

    const response = await GET(new Request("https://moderato-art.example/gallery/music-room"), { params: Promise.resolve({ id: "music-room" }) });

    expect(response.status).toBe(404);
    expect(readFile).not.toHaveBeenCalled();
  });
});
