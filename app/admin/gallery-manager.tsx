"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { GalleryGrid } from "../gallery-grid";
import { type GalleryPhoto } from "@/lib/gallery";
import { maxGalleryUploadBytes, parseGalleryUploadRequest } from "@/lib/gallery-validation";

type UploadPhase = "idle" | "preparing" | "uploading" | "processing";
type PendingUpload = {
  altText: string;
  chunkCount: number;
  chunkSize: number;
  fileName: string;
  fileSize: number;
  fileType: string;
  lastModified: number;
  nextChunk: number;
  photoId: string;
};

const gallerySizes = "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 15rem";

function isExternalImage(source: string) {
  return source.startsWith("http://") || source.startsWith("https://") || source.startsWith("/gallery/");
}

async function getErrorDetails(response: Response, fallback: string) {
  try {
    const body = await response.json() as { code?: unknown; message?: unknown };
    return {
      code: typeof body.code === "string" ? body.code : undefined,
      message: typeof body.message === "string" ? body.message : fallback,
    };
  } catch {
    return { message: fallback };
  }
}

function haveSamePhotoOrder(first: readonly GalleryPhoto[], second: readonly GalleryPhoto[]) {
  return first.length === second.length && first.every((photo, index) => photo.id === second[index]?.id);
}

export function GalleryManager({ initialPhotos }: { initialPhotos: readonly GalleryPhoto[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => [...initialPhotos]);
  const [savedPhotos, setSavedPhotos] = useState<GalleryPhoto[]>(() => [...initialPhotos]);
  const [file, setFile] = useState<File>();
  const [altText, setAltText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload>();
  const [deletingId, setDeletingId] = useState<string>();
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const lastServerOrderRef = useRef(initialPhotos.map((photo) => photo.id).join("|"));

  const initialPhotoSignature = initialPhotos.map((photo) => photo.id).join("|");
  useEffect(() => {
    if (lastServerOrderRef.current === initialPhotoSignature) return;
    lastServerOrderRef.current = initialPhotoSignature;
    const nextPhotos = [...initialPhotos];
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setPhotos(nextPhotos);
      setSavedPhotos(nextPhotos);
    });
    return () => {
      cancelled = true;
    };
  }, [initialPhotoSignature, initialPhotos]);

  useEffect(() => () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
  }, [previewUrl]);

  function selectFile(nextFile: File | undefined) {
    setFile(nextFile);
    setPendingUpload((current) => current && nextFile
      && current.fileName === nextFile.name
      && current.fileSize === nextFile.size
      && current.fileType === nextFile.type
      && current.lastModified === nextFile.lastModified
      ? current
      : undefined);
    setPreviewUrl((currentUrl) => {
      if (currentUrl) URL.revokeObjectURL(currentUrl);
      return nextFile ? URL.createObjectURL(nextFile) : undefined;
    });
  }

  async function uploadPhoto(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice("");
    setError("");
    if (!haveSamePhotoOrder(photos, savedPhotos)) {
      setError("Najpierw zapisz albo cofnij zmienioną kolejność zdjęć.");
      return;
    }
    if (!file) {
      setError("Wybierz zdjęcie do dodania.");
      return;
    }

    const parsed = parseGalleryUploadRequest({ altText, contentType: file.type, size: file.size });
    if (!parsed.success) {
      setError(file.size > maxGalleryUploadBytes ? "Zdjęcie może mieć maksymalnie 8 MB." : "Podaj tekst alternatywny i wybierz JPEG, PNG lub WebP.");
      return;
    }

    try {
      let upload: PendingUpload;
      const canResume = pendingUpload
        && pendingUpload.fileName === file.name
        && pendingUpload.fileSize === file.size
        && pendingUpload.fileType === file.type
        && pendingUpload.altText === altText
        && pendingUpload.lastModified === file.lastModified;
      if (canResume) {
        upload = pendingUpload;
      } else {
        setPhase("preparing");
        const prepareResponse = await fetch("/api/admin/gallery", {
          body: JSON.stringify(parsed.data),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (!prepareResponse.ok) throw new Error((await getErrorDetails(prepareResponse, "Nie udało się przygotować przesyłania.")).message);
        const prepared = await prepareResponse.json() as { chunkCount?: number; chunkSize?: number; photoId?: string };
        if (!prepared.photoId || !prepared.chunkCount || !prepared.chunkSize
          || !Number.isSafeInteger(prepared.chunkCount) || !Number.isSafeInteger(prepared.chunkSize)
          || prepared.chunkSize <= 0 || prepared.chunkCount !== Math.ceil(file.size / prepared.chunkSize)) {
          throw new Error("Serwer zwrócił nieprawidłowe dane przesyłania.");
        }
        upload = {
          altText,
          chunkCount: prepared.chunkCount,
          chunkSize: prepared.chunkSize,
          fileName: file.name,
          fileSize: file.size,
          fileType: file.type,
          lastModified: file.lastModified,
          nextChunk: 0,
          photoId: prepared.photoId,
        };
        setPendingUpload(upload);
      }

      setPhase("uploading");
      for (let index = upload.nextChunk; index < upload.chunkCount; index += 1) {
        const chunk = file.slice(index * upload.chunkSize, (index + 1) * upload.chunkSize);
        const uploadResponse = await fetch(`/api/admin/gallery/${encodeURIComponent(upload.photoId)}/chunks/${index}`, {
          body: chunk,
          headers: { "Content-Type": "application/octet-stream" },
          method: "PUT",
        });
        if (!uploadResponse.ok) {
          if (uploadResponse.status === 400 || uploadResponse.status === 404 || uploadResponse.status === 409) setPendingUpload(undefined);
          throw new Error((await getErrorDetails(uploadResponse, "Nie udało się przesłać fragmentu zdjęcia.")).message);
        }
        upload = { ...upload, nextChunk: index + 1 };
        setPendingUpload(upload);
      }

      setPhase("processing");
      const completeResponse = await fetch(`/api/admin/gallery/${encodeURIComponent(upload.photoId)}/complete`, {
        body: "{}",
        headers: { "Content-Type": "application/json" },
        method: "POST",
      });
      if (!completeResponse.ok) {
        const details = await getErrorDetails(completeResponse, "Nie udało się przetworzyć zdjęcia.");
        if (details.code === "MISSING_CHUNKS") {
          upload = { ...upload, nextChunk: 0 };
          setPendingUpload(upload);
        } else if (completeResponse.status === 400 || completeResponse.status === 404 || details.code === "GALLERY_LIMIT_REACHED") {
          setPendingUpload(undefined);
        }
        throw new Error(details.message);
      }
      const completed = await completeResponse.json() as { photo?: { alt: string; height: number; id: string; imageUrl: string; thumbnailUrl: string; width: number } };
      if (!completed.photo) throw new Error("Serwer nie zwrócił zapisanego zdjęcia.");

      const addedPhoto: GalleryPhoto = {
        alt: completed.photo.alt,
        height: completed.photo.height,
        id: completed.photo.id,
        sizes: gallerySizes,
        src: completed.photo.imageUrl,
        thumbnailSrc: completed.photo.thumbnailUrl,
        width: completed.photo.width,
      };
      const nextPhotos = [addedPhoto, ...photos];
      setPhotos(nextPhotos);
      setSavedPhotos(nextPhotos);
      setPendingUpload(undefined);
      selectFile(undefined);
      setAltText("");
      if (fileInputRef.current) fileInputRef.current.value = "";
      setNotice("Zdjęcie zostało dodane do galerii.");
      router.refresh();
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Nie udało się dodać zdjęcia.");
    } finally {
      setPhase("idle");
    }
  }

  function movePhoto(photoId: string, direction: -1 | 1) {
    if (phase !== "idle" || isSavingOrder || deletingId) return;
    setPhotos((current) => {
      const currentIndex = current.findIndex((photo) => photo.id === photoId);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      [next[currentIndex], next[nextIndex]] = [next[nextIndex], next[currentIndex]];
      return next;
    });
  }

  async function savePhotoOrder() {
    if (phase !== "idle" || isSavingOrder || deletingId || haveSamePhotoOrder(photos, savedPhotos)) return;
    setNotice("");
    setError("");
    setIsSavingOrder(true);
    try {
      const response = await fetch("/api/admin/gallery", {
        body: JSON.stringify({
          basePhotoIds: savedPhotos.map((photo) => photo.id),
          photoIds: photos.map((photo) => photo.id),
        }),
        headers: { "Content-Type": "application/json" },
        method: "PATCH",
      });
      if (!response.ok) {
        const details = await getErrorDetails(response, "Nie udało się zapisać kolejności zdjęć.");
        if (response.status === 409 || details.code === "GALLERY_CHANGED") router.refresh();
        throw new Error(details.message);
      }
      setSavedPhotos([...photos]);
      setNotice("Kolejność zdjęć została zapisana.");
      router.refresh();
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Nie udało się zapisać kolejności zdjęć.");
    } finally {
      setIsSavingOrder(false);
    }
  }

  function resetPhotoOrder() {
    if (phase !== "idle" || isSavingOrder || deletingId) return;
    setPhotos([...savedPhotos]);
    setNotice("");
    setError("");
  }

  async function deletePhoto(photo: GalleryPhoto) {
    if (!haveSamePhotoOrder(photos, savedPhotos)) {
      setError("Najpierw zapisz albo cofnij zmienioną kolejność zdjęć.");
      return;
    }
    if (!window.confirm(`Czy na pewno usunąć zdjęcie „${photo.alt}”? Zniknie ono ze strony.`)) return;
    setNotice("");
    setError("");
    setDeletingId(photo.id);
    try {
      const response = await fetch(`/api/admin/gallery/${encodeURIComponent(photo.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await getErrorDetails(response, "Nie udało się usunąć zdjęcia.")).message);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setSavedPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice("Zdjęcie zostało usunięte.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć zdjęcia.");
    } finally {
      setDeletingId(undefined);
    }
  }

  const isBusy = phase !== "idle";
  const hasOrderChanges = !haveSamePhotoOrder(photos, savedPhotos);
  const orderBusy = isBusy || isSavingOrder || Boolean(deletingId);
  const contentMutationBlocked = orderBusy || hasOrderChanges;
  return <section className="admin-gallery-manager" aria-labelledby="gallery-manager-heading">
    <div className="admin-gallery-manager-heading">
      <div>
        <h3 id="gallery-manager-heading">Dodaj zdjęcie</h3>
        <p className="admin-field-help">Zdjęcie zostanie zoptymalizowane przed publikacją. Maksymalny rozmiar pliku to 8 MB.</p>
      </div>
      <span>{photos.length} {photos.length === 1 ? "zdjęcie" : "zdjęć"}</span>
    </div>
    <form className="admin-form admin-gallery-form" onSubmit={uploadPhoto}>
      <label htmlFor="gallery-file">Plik zdjęcia<input accept="image/jpeg,image/png,image/webp" disabled={contentMutationBlocked} id="gallery-file" onChange={(event) => selectFile(event.currentTarget.files?.[0])} ref={fileInputRef} required type="file" /></label>
      <label htmlFor="gallery-alt">Tekst alternatywny<input disabled={contentMutationBlocked} id="gallery-alt" maxLength={240} onChange={(event) => setAltText(event.target.value)} required value={altText} /></label>
      {previewUrl ? <div className="admin-gallery-preview"><Image alt="Podgląd wybranego zdjęcia" height={180} src={previewUrl} unoptimized width={280} /></div> : null}
      <button disabled={contentMutationBlocked} type="submit">{phase === "preparing" ? "Przygotowywanie…" : phase === "uploading" ? "Przesyłanie…" : phase === "processing" ? "Przetwarzanie…" : "Dodaj zdjęcie"}</button>
    </form>
    {notice ? <p className="admin-success" role="status">{notice}</p> : null}
    {error ? <p className="admin-notice" role="alert">{error}</p> : null}
    <section className="admin-gallery-order" aria-labelledby="gallery-order-heading">
      <div className="admin-gallery-order-heading">
        <div>
          <h3 id="gallery-order-heading">Podgląd i kolejność</h3>
          <p>Przesuń zdjęcia przyciskami, aby sprawdzić układ na stronie głównej i na pełnej stronie galerii.</p>
        </div>
        <div className="admin-gallery-order-actions">
          <button disabled={!hasOrderChanges || orderBusy} onClick={resetPhotoOrder} type="button">Cofnij zmiany</button>
          <button disabled={!hasOrderChanges || orderBusy} onClick={savePhotoOrder} type="button">{isSavingOrder ? "Zapisywanie…" : "Zapisz kolejność"}</button>
        </div>
      </div>
      {hasOrderChanges ? <p className="admin-gallery-order-dirty" role="status">Kolejność jest zmieniona lokalnie. Zapisz ją, aby opublikować nowy układ.</p> : null}
      <div className="admin-gallery-preview-views">
        <div className="admin-gallery-preview-view">
          <p className="admin-preview-label">Strona główna · pierwsze 4 zdjęcia</p>
          {photos.length > 0 ? <GalleryGrid compact photos={photos.slice(0, 4)} /> : <p>Dodaj zdjęcia, aby zobaczyć podgląd.</p>}
        </div>
        <div className="admin-gallery-preview-view">
          <p className="admin-preview-label">Pełna galeria · /galeria</p>
          {photos.length > 0 ? <GalleryGrid photos={photos} /> : <p>Dodaj zdjęcia, aby zobaczyć podgląd.</p>}
        </div>
      </div>
    </section>
    <div aria-live="polite" className="admin-gallery-list">
      <h3>Zdjęcia na stronie</h3>
      {photos.length === 0 ? <p>Galeria jest obecnie pusta.</p> : <ol>{photos.map((photo, index) => <li key={photo.id}>
        <span aria-label={`Pozycja ${index + 1}`} className="admin-gallery-position">{index + 1}</span>
        <Image alt={photo.alt} height={96} sizes="6rem" src={photo.thumbnailSrc} unoptimized={isExternalImage(photo.thumbnailSrc)} width={144} />
        <div className="admin-gallery-list-details"><strong>{photo.alt}</strong><div className="admin-gallery-list-actions">
          <button aria-label={`Przenieś wyżej: ${photo.alt}`} className="admin-gallery-order-button" disabled={orderBusy || index === 0} onClick={() => movePhoto(photo.id, -1)} type="button">↑</button>
          <button aria-label={`Przenieś niżej: ${photo.alt}`} className="admin-gallery-order-button" disabled={orderBusy || index === photos.length - 1} onClick={() => movePhoto(photo.id, 1)} type="button">↓</button>
          <button aria-label={`Usuń zdjęcie: ${photo.alt}`} className="admin-gallery-delete-button" disabled={contentMutationBlocked || deletingId === photo.id} onClick={() => deletePhoto(photo)} type="button">{deletingId === photo.id ? "Usuwanie…" : "Usuń"}</button>
        </div></div>
      </li>)}</ol>}
    </div>
  </section>;
}
