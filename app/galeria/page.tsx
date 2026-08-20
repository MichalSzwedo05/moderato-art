import type { Metadata } from "next";
import Link from "next/link";
import { GalleryViewer } from "../gallery-viewer";
import { getGalleryPhotos } from "../../lib/gallery-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const metadata: Metadata = { description: "Galeria przestrzeni muzycznej Moderato Art.", title: "Galeria" };

export default async function GalleryPage() {
  const galleryPhotos = await getGalleryPhotos();
  return <main className="gallery-page site-shell"><Link className="text-link" href="/#galeria">Wróć do strony głównej</Link><p className="eyebrow">Galeria</p><h1>Przestrzeń, w której muzyka się dzieje.</h1>{galleryPhotos.length > 0 ? <GalleryViewer photos={galleryPhotos} /> : <p className="gallery-empty">Galeria jest obecnie pusta.</p>}</main>;
}
