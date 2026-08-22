/* eslint-disable @next/next/no-img-element -- Next Image is mocked in this component test. */
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  it("uploads a validated photo through prepare, chunk, and complete steps", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ chunkCount: 1, chunkSize: 1_048_576, photoId: "new-photo" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
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
    expect(fetchMock.mock.calls[1][0]).toBe("/api/admin/gallery/new-photo/chunks/0");
    expect(fetchMock.mock.calls[1][1]).toMatchObject({ headers: { "Content-Type": "application/octet-stream" }, method: "PUT" });
    expect(refresh).toHaveBeenCalled();
  });

  it("uploads a multi-megabyte file in sequential chunks", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ chunkCount: 2, chunkSize: 2, photoId: "large-photo" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ photo: { alt: "Duże zdjęcie", height: 800, id: "large-photo", imageUrl: "/gallery/large-photo", thumbnailUrl: "/gallery/large-photo?variant=thumbnail", width: 1200 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={[]} />);

    await user.upload(screen.getByLabelText("Plik zdjęcia"), new File(["abcd"], "photo.jpg", { type: "image/jpeg" }));
    await user.type(screen.getByLabelText("Tekst alternatywny"), "Duże zdjęcie");
    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);

    expect(await screen.findByText("Zdjęcie zostało dodane do galerii.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.slice(1, 3).map(([url]) => url)).toEqual([
      "/api/admin/gallery/large-photo/chunks/0",
      "/api/admin/gallery/large-photo/chunks/1",
    ]);
  });

  it("retries completion with the same upload after a lost response", async () => {
    const completedPhoto = { alt: "Ponowione zdjęcie", height: 800, id: "retry-photo", imageUrl: "/gallery/retry-photo", thumbnailUrl: "/gallery/retry-photo?variant=thumbnail", width: 1200 };
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ chunkCount: 1, chunkSize: 1_048_576, photoId: "retry-photo" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockRejectedValueOnce(new TypeError("connection reset"))
      .mockResolvedValueOnce(new Response(JSON.stringify({ photo: completedPhoto }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={[]} />);

    await user.upload(screen.getByLabelText("Plik zdjęcia"), new File(["image"], "photo.jpg", { type: "image/jpeg" }));
    await user.type(screen.getByLabelText("Tekst alternatywny"), "Ponowione zdjęcie");
    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);
    expect(await screen.findByText("connection reset")).toBeInTheDocument();

    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);
    expect(await screen.findByText("Zdjęcie zostało dodane do galerii.")).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls[3][0]).toBe("/api/admin/gallery/retry-photo/complete");
  });

  it("reuploads chunks when completion reports a missing chunk", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ chunkCount: 1, chunkSize: 1_048_576, photoId: "missing-photo" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "MISSING_CHUNKS", message: "Brak fragmentu." }), { status: 409 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ photo: { alt: "Uzupełnione zdjęcie", height: 800, id: "missing-photo", imageUrl: "/gallery/missing-photo", thumbnailUrl: "/gallery/missing-photo?variant=thumbnail", width: 1200 } }), { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={[]} />);

    await user.upload(screen.getByLabelText("Plik zdjęcia"), new File(["image"], "photo.jpg", { type: "image/jpeg" }));
    await user.type(screen.getByLabelText("Tekst alternatywny"), "Uzupełnione zdjęcie");
    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);
    expect(await screen.findByText("Brak fragmentu.")).toBeInTheDocument();

    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);
    expect(await screen.findByText("Zdjęcie zostało dodane do galerii.")).toBeInTheDocument();
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/admin/gallery",
      "/api/admin/gallery/missing-photo/chunks/0",
      "/api/admin/gallery/missing-photo/complete",
      "/api/admin/gallery/missing-photo/chunks/0",
      "/api/admin/gallery/missing-photo/complete",
    ]);
  });

  it("starts a fresh upload after the gallery limit rejects completion", async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ chunkCount: 1, chunkSize: 1_048_576, photoId: "limit-photo" }), { status: 201 }))
      .mockResolvedValueOnce(new Response(null, { status: 204 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ code: "GALLERY_LIMIT_REACHED", message: "Galeria jest pełna." }), { status: 409 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ chunkCount: 1, chunkSize: 1_048_576, photoId: "retry-photo" }), { status: 201 }))
      .mockRejectedValueOnce(new TypeError("stop after a fresh prepare"));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={[]} />);

    await user.upload(screen.getByLabelText("Plik zdjęcia"), new File(["image"], "photo.jpg", { type: "image/jpeg" }));
    await user.type(screen.getByLabelText("Tekst alternatywny"), "Zdjęcie do ponowienia");
    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);
    expect(await screen.findByText("Galeria jest pełna.")).toBeInTheDocument();

    fireEvent.submit(screen.getByRole("button", { name: "Dodaj zdjęcie" }).closest("form")!);
    await waitFor(() => expect(fetchMock.mock.calls[3][0]).toBe("/api/admin/gallery"));
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

  it("previews both gallery layouts and saves the changed order", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    const fifthPhoto = { ...galleryPhotos[0], alt: "Piąte zdjęcie", id: "fifth-photo" };
    render(<GalleryManager initialPhotos={[...galleryPhotos, fifthPhoto]} />);

    expect(screen.getByText("Strona główna · pierwsze 4 zdjęcia")).toBeInTheDocument();
    expect(screen.getByText("Pełna galeria · /galeria")).toBeInTheDocument();
    const previewGrids = screen.getAllByRole("group", { name: "Galeria zdjęć" });
    expect(within(previewGrids[0]).queryByAltText(fifthPhoto.alt)).not.toBeInTheDocument();
    expect(within(previewGrids[1]).getByAltText(fifthPhoto.alt)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: `Przenieś niżej: ${galleryPhotos[0].alt}` }));
    expect(screen.getByText("Kolejność jest zmieniona lokalnie. Zapisz ją, aby opublikować nowy układ.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Zapisz kolejność" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/admin/gallery", {
      body: JSON.stringify({
        basePhotoIds: [...galleryPhotos, fifthPhoto].map((photo) => photo.id),
        photoIds: [galleryPhotos[1].id, galleryPhotos[0].id, galleryPhotos[2].id, galleryPhotos[3].id, fifthPhoto.id],
      }),
      headers: { "Content-Type": "application/json" },
      method: "PATCH",
    }));
    expect(await screen.findByText("Kolejność zdjęć została zapisana.")).toBeInTheDocument();
  });

  it("can discard a local order change before saving", async () => {
    vi.stubGlobal("fetch", vi.fn());
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={galleryPhotos.slice(0, 2)} />);

    await user.click(screen.getByRole("button", { name: `Przenieś niżej: ${galleryPhotos[0].alt}` }));
    await user.click(screen.getByRole("button", { name: "Cofnij zmiany" }));

    expect(screen.queryByText("Kolejność jest zmieniona lokalnie. Zapisz ją, aby opublikować nowy układ.")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Zapisz kolejność" })).toBeDisabled();
  });

  it("refreshes after a stale order conflict and keeps the local change visible", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({ code: "GALLERY_CHANGED", message: "Galeria zmieniła się." }), { status: 409 })));
    const user = userEvent.setup();
    render(<GalleryManager initialPhotos={galleryPhotos.slice(0, 2)} />);

    await user.click(screen.getByRole("button", { name: `Przenieś niżej: ${galleryPhotos[0].alt}` }));
    await user.click(screen.getByRole("button", { name: "Zapisz kolejność" }));

    expect(await screen.findByText("Galeria zmieniła się.")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
    expect(screen.getByText("Kolejność jest zmieniona lokalnie. Zapisz ją, aby opublikować nowy układ.")).toBeInTheDocument();
  });
});
