import { NextResponse } from "next/server";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import {
  ContactSubmissionExportLimitError,
  encodeContactSubmissionsXml,
  getContactSubmissionExportRows,
} from "@/lib/contact-submissions";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

function exportFilename(date: Date) {
  return `moderato-art-contact-submissions-${date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z")}.xml`;
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config) || !(await getAdminSession())) {
    return errorResponse("Brak dostępu.", 403);
  }

  const exportedAt = new Date();
  try {
    const rows = await getContactSubmissionExportRows();
    const body = encodeContactSubmissionsXml(rows, exportedAt);
    console.info("Contact submissions exported", { count: rows.length });
    return new Response(body, {
      headers: {
        "Cache-Control": "private, no-store, max-age=0",
        "Content-Disposition": `attachment; filename="${exportFilename(exportedAt)}"`,
        "Content-Length": String(body.byteLength),
        "Content-Type": "application/xml; charset=utf-8",
        "Cross-Origin-Resource-Policy": "same-origin",
        "Pragma": "no-cache",
        "X-Content-Type-Options": "nosniff",
      },
      status: 200,
    });
  } catch (error) {
    if (error instanceof ContactSubmissionExportLimitError) {
      return errorResponse("Eksport jest zbyt duży. Zmniejsz liczbę przechowywanych zgłoszeń i spróbuj ponownie.", 422);
    }
    console.error("Contact submission export failed");
    return errorResponse("Nie udało się przygotować eksportu zgłoszeń.", 503);
  }
}
