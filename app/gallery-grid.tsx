import Image from "next/image";
import type { MouseEvent } from "react";
import { getGalleryTileClass, getGalleryTileSizes, type GalleryPhoto } from "../lib/gallery";

function isExternalImage(source: string) {
  return source.startsWith("http://") || source.startsWith("https://") || source.startsWith("/gallery/");
}

type GalleryGridProps = {
  compact?: boolean;
  onOpen?: (event: MouseEvent<HTMLAnchorElement>, selectedIndex: number) => void;
  photos: readonly GalleryPhoto[];
};

export function GalleryGrid({ compact, onOpen, photos }: GalleryGridProps) {
  const className = compact ? "gallery-grid" : "gallery-page-grid";

  return <div aria-label="Galeria zdjęć" className={className} role="group">
    {photos.map((item, selectedIndex) => {
      const tileClassName = compact ? `gallery-tile ${getGalleryTileClass(selectedIndex)}` : "gallery-page-tile";
      const content = <>
        <Image alt={item.alt} fill sizes={compact ? getGalleryTileSizes(selectedIndex) : "(max-width: 760px) 100vw, 33vw"} src={item.thumbnailSrc} unoptimized={isExternalImage(item.thumbnailSrc)} />
        {compact ? <span aria-hidden="true">{String(selectedIndex + 1).padStart(2, "0")}</span> : null}
      </>;

      if (onOpen) {
        return <a className={tileClassName} href={compact ? "/galeria" : item.src} key={item.id} onClick={(event) => onOpen(event, selectedIndex)}>
          {content}
        </a>;
      }

      return <div aria-label={item.alt} className={tileClassName} key={item.id}>
        {content}
      </div>;
    })}
  </div>;
}
