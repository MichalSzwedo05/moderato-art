"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type MouseEvent } from "react";
import { getGalleryTileClass, getGalleryTileSizes, type GalleryPhoto } from "../lib/gallery";

export function GalleryViewer({ compact, photos }: { compact?: boolean; photos: readonly GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLAnchorElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const labelId = useId();
  const [index, setIndex] = useState<number>();
  const photo = index === undefined ? undefined : photos[index];

  function open(event: MouseEvent<HTMLAnchorElement>, selectedIndex: number) {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey
      || !dialogRef.current || typeof dialogRef.current.showModal !== "function") return;
    event.preventDefault();
    openerRef.current = event.currentTarget;
    setIndex(selectedIndex);
  }

  useEffect(() => {
    if (index === undefined || !dialogRef.current || dialogRef.current.open) return;
    dialogRef.current.showModal();
    closeButtonRef.current?.focus();
  }, [index]);

  useEffect(() => {
    if (index === undefined) return;
    function moveWithArrowKey(event: KeyboardEvent) {
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        setIndex((value) => value === undefined ? value : Math.max(0, value - 1));
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        setIndex((value) => value === undefined ? value : Math.min(photos.length - 1, value + 1));
      }
    }
    window.addEventListener("keydown", moveWithArrowKey);
    return () => window.removeEventListener("keydown", moveWithArrowKey);
  }, [index, photos.length]);

  return <>
    <div className={compact ? "gallery-grid" : "gallery-page-grid"} role="group" aria-label="Galeria zdjęć">
      {photos.map((item, selectedIndex) => <a className={compact ? `gallery-tile ${getGalleryTileClass(selectedIndex)}` : "gallery-page-tile"} href={compact ? "/galeria" : item.src} key={item.id} onClick={(event) => open(event, selectedIndex)}>
        <Image alt={item.alt} fill sizes={compact ? getGalleryTileSizes(selectedIndex) : "(max-width: 760px) 100vw, 33vw"} src={item.thumbnailSrc} unoptimized={item.thumbnailSrc.startsWith("http://") || item.thumbnailSrc.startsWith("https://") || item.thumbnailSrc.startsWith("/gallery/")} />
        {compact ? <span aria-hidden="true">{String(selectedIndex + 1).padStart(2, "0")}</span> : null}
      </a>)}
    </div>
    <dialog aria-labelledby={labelId} className="gallery-lightbox" onClose={() => { setIndex(undefined); openerRef.current?.focus(); }} onPointerDown={(event) => { const { bottom, left, right, top } = event.currentTarget.getBoundingClientRect(); if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) event.currentTarget.close(); }} ref={dialogRef}>
      {photo ? <figure><Image alt={photo.alt} height={photo.height ?? 900} sizes="(max-width: 900px) 96vw, 70rem" src={photo.src} unoptimized={photo.src.startsWith("http://") || photo.src.startsWith("https://") || photo.src.startsWith("/gallery/")} width={photo.width ?? 1400} /><figcaption id={labelId}>{photo.alt} — zdjęcie {(index || 0) + 1} z {photos.length}</figcaption><button aria-label="Zamknij podgląd zdjęcia" onClick={() => dialogRef.current?.close()} ref={closeButtonRef} type="button">×</button><button aria-label="Poprzednie zdjęcie" disabled={index === 0} onClick={() => setIndex((value) => value === undefined ? value : value - 1)} type="button">←</button><button aria-label="Następne zdjęcie" disabled={index === photos.length - 1} onClick={() => setIndex((value) => value === undefined ? value : value + 1)} type="button">→</button></figure> : null}
    </dialog>
  </>;
}
