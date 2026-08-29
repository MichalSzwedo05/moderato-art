import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { GalleryManager } from "../gallery-manager";
import { AdminPanel } from "../admin-panel";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { getAdminGalleryPhotos } from "@/lib/gallery-data";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export const metadata: Metadata = {
  robots: { follow: false, index: false },
  title: "Galeria · Panel administracyjny",
};

export default async function AdminGalleryPage() {
  const config = getAdminAuthConfig();
  if (!config) {
    return <main className="admin-shell"><section className="admin-card"><p>Panel administracyjny jest chwilowo niedostępny.</p><Link className="admin-secondary-button admin-public-link" href="/">Strona główna</Link></section></main>;
  }
  if (!(await getAdminSession())) {
    redirect("/admin");
  }

  const galleryPhotos = await getAdminGalleryPhotos();

  return <AdminPanel title="Galeria zdjęć">
    <section className="admin-gallery-section" aria-labelledby="gallery-section-heading">
      <h2 id="gallery-section-heading">Galeria zdjęć</h2>
      <p>Dodawaj zdjęcia przestrzeni i usuwaj te, których nie chcesz już pokazywać na stronie.</p>
      {galleryPhotos ? <GalleryManager initialPhotos={galleryPhotos} /> : <p className="admin-notice" role="status">Galeria jest chwilowo niedostępna. Zarządzanie artykułami pozostaje dostępne.</p>}
    </section>
  </AdminPanel>;
}
