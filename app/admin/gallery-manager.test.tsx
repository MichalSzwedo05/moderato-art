/* eslint-disable @next/next/no-img-element -- Next Image is mocked in this component test. */
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { galleryPhotos } from "@/lib/gallery";
import { GalleryManager } from "./gallery-manager";

const refresh = vi.fn();

vi.mock("next/image", () => ({ default: ({ alt, unoptimized, ...props }: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => { void unoptimized; return <img alt={alt} {...props} />; } }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));

describe("GalleryManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("URL", {
      ...URL,
      createObjectURL: vi.fn(() => "blob:gallery-preview"),
      revokeObjectURL: vi.fn(),
    });
  });

  it("uploads a validated photo through prepare, storage, and complete steps", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ photoId: "new-photo", uploadUrl: "https://storage.example/upload" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ photo: { alt: "Nowe zdjęcie", height: 800, id: "new-photo", imageUrl: "https://cdn.example/full.webp", thumbnailUrl: "https://cdn.example/thumb.webp", width: 1200 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={[]} />);

    await user.upload(screen.getByLabelText("Plik zdjęcia"), new File(["image"], "photo.jpg", { type: "image/jpeg" }));
    await user.type(screen.getByLabelText("Tekst alternatywny"), "Nowe zdjęcie");
    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);

    expect(await screen.findByText("Zdjęcie zostało dodane do galerii.")).toBeInTheDocument();
    expect(screen.getByText("Nowe zdjęcie")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(refresh).toHaveBeenCalled();
  });

  it("confirms deletion and removes the photo after a successful response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 204 })));
    vi.stubGlobal("confirm", vi.fn(() => true));
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={galleryPhotos.slice(0, 1)} />);

    await user.click(screen.getByRole("button", { name: `Usuń zdjęcie: ${galleryPhotos[0].alt}` }));

    expect(screen.queryByText(galleryPhotos[0].alt)).not.toBeInTheDocument();
    expect(screen.getByText("Zdjęcie zostało usunięte.")).toBeInTheDocument();
  });
});
