export const galleryPhotos = [
  { alt: "Gitary, keyboard i mikrofon w domowej przestrzeni muzycznej", className: "gallery-tile-tall", id: "music-room", sizes: "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem", src: "/gallery/music-room.jpg" },
  { alt: "Klawisze fortepianu w ciepłym świetle", className: "gallery-tile-warm", id: "piano-keys", sizes: "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem", src: "/gallery/piano-keys.jpg" },
  { alt: "Mikrofon przygotowany do śpiewu", className: "gallery-tile-blue", id: "stage-microphone", sizes: "(max-width: 760px) calc((100vw - 3.25rem) / 2), (max-width: 1184px) 33vw, 24rem", src: "/gallery/stage-microphone.jpg" },
  { alt: "Instrumenty w kameralnym studiu muzycznym", className: "gallery-tile-wide", id: "music-studio", sizes: "(max-width: 760px) calc(100vw - 2.25rem), (max-width: 1184px) 66vw, 50rem", src: "/gallery/music-studio.jpg" },
] as const;

export type GalleryPhoto = (typeof galleryPhotos)[number];
