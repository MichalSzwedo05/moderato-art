import { NextResponse } from "next/server";
import { getAdminAuthConfig, getAdminSession } from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getMessageHistory } from "@/lib/message-history";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function errorResponse(message: string, status: number) {
  return NextResponse.json({ message }, {
    headers: { "Cache-Control": "private, no-store, max-age=0" },
    status,
  });
}

export async function GET(request: Request) {
  const config = getAdminAuthConfig();
  const requestOrigin = request.headers.get("origin") ?? request.headers.get("referer");
  if (!config || !isSameAdminOrigin(requestOrigin, config) || !(await getAdminSession())) {
    return errorResponse("Brak dostępu.", 403);
  }

  try {
    return NextResponse.json({ messages: await getMessageHistory() }, {
      headers: { "Cache-Control": "private, no-store, max-age=0" },
      status: 200,
    });
  } catch {
    console.error("Message history query failed");
    return errorResponse("Nie udało się wczytać historii wiadomości.", 503);
  }
}
