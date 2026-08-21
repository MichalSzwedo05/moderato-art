import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { galleryDeletingExpiryMs } from "@/lib/gallery-cleanup";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function json(body: object, status: number) {
  return NextResponse.json(body, { headers: { "Cache-Control": "no-store" }, status });
}

async function isAuthorized(request: Request) {
  const config = getAdminAuthConfig();
  return Boolean(config
    && isSameAdminOrigin(request.headers.get("origin"), config)
    && await getAdminSession());
}

type DeleteRouteContext = { params: Promise<{ id: string }> };

export async function DELETE(request: Request, context: DeleteRouteContext) {
  if (!(await isAuthorized(request))) {
    return json({ message: "Brak dostępu." }, 403);
  }

  const { id } = await context.params;
  if (!/^[A-Za-z0-9_-]{1,100}$/.test(id)) {
    return json({ message: "Nie znaleziono zdjęcia." }, 404);
  }

  const prisma = getPrisma();
  const photo = await prisma.galleryPhoto.findUnique({ where: { id } });
  if (!photo) return json({ message: "Nie znaleziono zdjęcia." }, 404);

  await prisma.galleryPhoto.updateMany({ data: { expiresAt: new Date(Date.now() + galleryDeletingExpiryMs), status: "DELETING" }, where: { id } });
  try {
    await prisma.galleryPhoto.deleteMany({ where: { id, status: "DELETING" } });
  } catch (error) {
    console.error("Gallery photo deletion failed", { error, id });
    return json({ message: "Nie udało się usunąć zdjęcia. Zostało ukryte i wymaga ponownego sprzątnięcia." }, 503);
  }

  console.info("Gallery photo deleted", { id });
  revalidatePath("/");
  revalidatePath("/galeria");
  revalidatePath("/admin");
  return new NextResponse(null, { headers: { "Cache-Control": "no-store" }, status: 204 });
}
