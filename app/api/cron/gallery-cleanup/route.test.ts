import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ cleanupStaleGalleryPhotos: vi.fn() }));
vi.mock("@/lib/gallery-cleanup", () => ({ cleanupStaleGalleryPhotos: mocks.cleanupStaleGalleryPhotos }));

import { POST } from "./route";

describe("POST /api/cron/gallery-cleanup", () => {
  afterEach(() => {
    delete process.env.GALLERY_CLEANUP_SECRET;
  });

  beforeEach(() => {
    vi.clearAllMocks();
    process.env.GALLERY_CLEANUP_SECRET = "cleanup-secret";
    mocks.cleanupStaleGalleryPhotos.mockResolvedValue({ cleaned: 1, failed: 0, inspected: 1 });
  });

  it("requires the configured bearer secret", async () => {
    const response = await POST(new Request("https://moderato-art.example/api/cron/gallery-cleanup", { method: "POST" }));

    expect(response.status).toBe(401);
    expect(mocks.cleanupStaleGalleryPhotos).not.toHaveBeenCalled();
  });

  it("runs the stale-object cleanup job with the bearer secret", async () => {
    const response = await POST(new Request("https://moderato-art.example/api/cron/gallery-cleanup", { headers: { authorization: "Bearer cleanup-secret" }, method: "POST" }));

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ cleaned: 1, failed: 0, inspected: 1 });
  });

  it("reports partial cleanup failures to the scheduler", async () => {
    mocks.cleanupStaleGalleryPhotos.mockResolvedValue({ cleaned: 0, failed: 1, inspected: 1 });

    const response = await POST(new Request("https://moderato-art.example/api/cron/gallery-cleanup", { headers: { authorization: "Bearer cleanup-secret" }, method: "POST" }));

    expect(response.status).toBe(503);
  });
});
