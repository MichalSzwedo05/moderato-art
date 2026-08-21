"use client";

import Image from "next/image";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
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

export function GalleryManager({ initialPhotos }: { initialPhotos: readonly GalleryPhoto[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<GalleryPhoto[]>(() => [...initialPhotos]);
  const [file, setFile] = useState<File>();
  const [altText, setAltText] = useState("");
  const [previewUrl, setPreviewUrl] = useState<string>();
  const [phase, setPhase] = useState<UploadPhase>("idle");
  const [pendingUpload, setPendingUpload] = useState<PendingUpload>();
  const [deletingId, setDeletingId] = useState<string>();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");

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
        } else if (completeResponse.status === 400 || completeResponse.status === 404) {
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
      setPhotos((current) => [addedPhoto, ...current]);
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

  async function deletePhoto(photo: GalleryPhoto) {
    if (!window.confirm(`Czy na pewno usunąć zdjęcie „${photo.alt}”? Zniknie ono ze strony.`)) return;
    setNotice("");
    setError("");
    setDeletingId(photo.id);
    try {
      const response = await fetch(`/api/admin/gallery/${encodeURIComponent(photo.id)}`, { method: "DELETE" });
      if (!response.ok) throw new Error((await getErrorDetails(response, "Nie udało się usunąć zdjęcia.")).message);
      setPhotos((current) => current.filter((item) => item.id !== photo.id));
      setNotice("Zdjęcie zostało usunięte.");
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Nie udało się usunąć zdjęcia.");
    } finally {
      setDeletingId(undefined);
    }
  }

  const isBusy = phase !== "idle";
  return <section className="admin-gallery-manager" aria-labelledby="gallery-manager-heading">
    <div className="admin-gallery-manager-heading">
      <div>
        <h3 id="gallery-manager-heading">Dodaj zdjęcie</h3>
        <p className="admin-field-help">Zdjęcie zostanie zoptymalizowane przed publikacją. Maksymalny rozmiar pliku to 8 MB.</p>
      </div>
      <span>{photos.length} {photos.length === 1 ? "zdjęcie" : "zdjęć"}</span>
    </div>
    <form className="admin-form admin-gallery-form" onSubmit={uploadPhoto}>
      <label htmlFor="gallery-file">Plik zdjęcia<input accept="image/jpeg,image/png,image/webp" disabled={isBusy} id="gallery-file" onChange={(event) => selectFile(event.currentTarget.files?.[0])} ref={fileInputRef} required type="file" /></label>
      <label htmlFor="gallery-alt">Tekst alternatywny<input disabled={isBusy} id="gallery-alt" maxLength={240} onChange={(event) => setAltText(event.currentTarget.value)} required value={altText} /></label>
      {previewUrl ? <div className="admin-gallery-preview"><Image alt="Podgląd wybranego zdjęcia" height={180} src={previewUrl} unoptimized width={280} /></div> : null}
      <button disabled={isBusy} type="submit">{phase === "preparing" ? "Przygotowywanie…" : phase === "uploading" ? "Przesyłanie…" : phase === "processing" ? "Przetwarzanie…" : "Dodaj zdjęcie"}</button>
    </form>
    {notice ? <p className="admin-success" role="status">{notice}</p> : null}
    {error ? <p className="admin-notice" role="alert">{error}</p> : null}
    <div aria-live="polite" className="admin-gallery-list">
      <h3>Zdjęcia na stronie</h3>
      {photos.length === 0 ? <p>Galeria jest obecnie pusta.</p> : <ul>{photos.map((photo) => <li key={photo.id}>
        <Image alt={photo.alt} height={96} sizes="6rem" src={photo.thumbnailSrc} unoptimized={isExternalImage(photo.thumbnailSrc)} width={144} />
        <div><strong>{photo.alt}</strong><button aria-label={`Usuń zdjęcie: ${photo.alt}`} disabled={isBusy || deletingId === photo.id} onClick={() => deletePhoto(photo)} type="button">{deletingId === photo.id ? "Usuwanie…" : "Usuń"}</button></div>
      </li>)}</ul>}
    </div>
  </section>;
}
