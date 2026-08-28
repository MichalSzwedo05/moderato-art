"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type MouseEvent, type PointerEvent as ReactPointerEvent } from "react";
import type { GalleryPhoto } from "../lib/gallery";
import { GalleryGrid } from "./gallery-grid";

const swipeThreshold = 48;

type SwipeStart = {
  pointerId: number;
  x: number;
  y: number;
};

function isButtonTarget(target: EventTarget | null) {
  return target instanceof Element && Boolean(target.closest("button"));
}

export function GalleryViewer({ compact, photos }: { compact?: boolean; photos: readonly GalleryPhoto[] }) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const openerRef = useRef<HTMLAnchorElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const swipeStartRef = useRef<SwipeStart | undefined>(undefined);
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

  function handleSwipeStart(event: ReactPointerEvent<HTMLElement>) {
    if ((event.pointerType !== "touch" && event.pointerType !== "pen") || isButtonTarget(event.target)) {
      swipeStartRef.current = undefined;
      return;
    }

    swipeStartRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
    if (typeof event.currentTarget.setPointerCapture === "function") event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleSwipeEnd(event: ReactPointerEvent<HTMLElement>) {
    const start = swipeStartRef.current;
    swipeStartRef.current = undefined;
    if (!start || start.pointerId !== event.pointerId || isButtonTarget(event.target)) return;
    if (typeof event.currentTarget.hasPointerCapture === "function" && event.currentTarget.hasPointerCapture(event.pointerId)
      && typeof event.currentTarget.releasePointerCapture === "function") event.currentTarget.releasePointerCapture(event.pointerId);

    const horizontalDistance = event.clientX - start.x;
    const verticalDistance = event.clientY - start.y;
    if (Math.abs(horizontalDistance) < swipeThreshold || Math.abs(horizontalDistance) <= Math.abs(verticalDistance)) return;

    setIndex((value) => value === undefined
      ? value
      : horizontalDistance < 0 ? Math.min(photos.length - 1, value + 1) : Math.max(0, value - 1));
  }

  return <>
    <GalleryGrid compact={compact} onOpen={open} photos={photos} />
    <dialog aria-labelledby={labelId} className="gallery-lightbox" onClose={() => { setIndex(undefined); openerRef.current?.focus(); }} onPointerDown={(event) => { const { bottom, left, right, top } = event.currentTarget.getBoundingClientRect(); if (event.clientX < left || event.clientX > right || event.clientY < top || event.clientY > bottom) event.currentTarget.close(); }} ref={dialogRef}>
      {photo ? <figure onPointerCancel={() => { swipeStartRef.current = undefined; }} onPointerDown={handleSwipeStart} onPointerUp={handleSwipeEnd}><Image alt={photo.alt} height={photo.height ?? 900} sizes="(max-width: 900px) 96vw, 70rem" src={photo.src} unoptimized={photo.src.startsWith("http://") || photo.src.startsWith("https://") || photo.src.startsWith("/gallery/")} width={photo.width ?? 1400} /><figcaption aria-live="polite" id={labelId}>{photo.alt} — zdjęcie {(index || 0) + 1} z {photos.length}</figcaption><button aria-label="Zamknij podgląd zdjęcia" onClick={() => dialogRef.current?.close()} ref={closeButtonRef} type="button">×</button><button aria-label="Poprzednie zdjęcie" disabled={index === 0} onClick={() => setIndex((value) => value === undefined ? value : value - 1)} type="button">←</button><button aria-label="Następne zdjęcie" disabled={index === photos.length - 1} onClick={() => setIndex((value) => value === undefined ? value : value + 1)} type="button">→</button></figure> : null}
    </dialog>
  </>;
}
