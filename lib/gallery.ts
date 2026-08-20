export type GalleryPhoto = {
  alt: string;
  height?: number;
  id: string;
  sizes: string;
  src: string;
  thumbnailSrc: string;
  width?: number;
};

export const galleryPhotos: readonly GalleryPhoto[] = [
  { alt: "Gitary, keyboard i mikrofon w domowej przestrzeni muzycznej", height: 800, id: "music-room", sizes: "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem", src: "/gallery/music-room", thumbnailSrc: "/gallery/music-room", width: 1200 },
  { alt: "Klawisze fortepianu w ciepłym świetle", height: 800, id: "piano-keys", sizes: "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem", src: "/gallery/piano-keys", thumbnailSrc: "/gallery/piano-keys", width: 1200 },
  { alt: "Mikrofon przygotowany do śpiewu", height: 800, id: "stage-microphone", sizes: "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem", src: "/gallery/stage-microphone", thumbnailSrc: "/gallery/stage-microphone", width: 1200 },
  { alt: "Instrumenty w kameralnym studiu muzycznym", height: 800, id: "music-studio", sizes: "(max-width: 760px) calc(100vw - 2.25rem), (max-width: 1184px) 66vw, 50rem", src: "/gallery/music-studio", thumbnailSrc: "/gallery/music-studio", width: 1200 },
];

const galleryTileClasses = ["gallery-tile-tall", "gallery-tile-warm", "gallery-tile-blue", "gallery-tile-wide"] as const;
const galleryTileSizes = "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem";
const galleryWideTileSizes = "(max-width: 760px) calc(100vw - 2.25rem), (max-width: 1184px) 66vw, 50rem";

export function getGalleryTileClass(index: number) {
  return galleryTileClasses[index] ?? "";
}

export function getGalleryTileSizes(index: number) {
  return index === 3 ? galleryWideTileSizes : galleryTileSizes;
}
