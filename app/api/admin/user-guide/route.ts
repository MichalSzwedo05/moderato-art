import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return Response.json({ message }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config) || !(await getAdminSession())) {
    return errorResponse("Brak dostępu.", 403);
  }

  let guide: string;
  try {
    guide = await readFile(join(process.cwd(), "USER_GUIDE.md"), "utf8");
  } catch {
    console.error("CMS user guide download failed");
    return errorResponse("Nie udało się przygotować instrukcji.", 503);
  }

  console.info("CMS user guide downloaded");
  return new Response(guide, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Disposition": "attachment; filename=\"instrukcja-cms-moderato-art.md\"",
      "Content-Length": String(Buffer.byteLength(guide, "utf8")),
      "Content-Type": "text/markdown; charset=utf-8",
      "Cross-Origin-Resource-Policy": "same-origin",
      "Pragma": "no-cache",
      "X-Content-Type-Options": "nosniff",
    },
    status: 200,
  });
}
