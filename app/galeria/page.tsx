import type { Metadata } from "next";
import Link from "next/link";
import { GalleryViewer } from "../gallery-viewer";
import { galleryPhotos } from "../../lib/gallery";

export const metadata: Metadata = { description: "Galeria przestrzeni muzycznej Moderato Art.", title: "Galeria" };

export default function GalleryPage() {
  return <main className="gallery-page site-shell"><Link className="text-link" href="/#galeria">Wróć do strony głównej</Link><p className="eyebrow">Galeria</p><h1>Przestrzeń, w której muzyka się dzieje.</h1><GalleryViewer photos={galleryPhotos} /></main>;
}
