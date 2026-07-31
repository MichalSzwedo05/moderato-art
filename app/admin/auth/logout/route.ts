import { NextResponse } from "next/server";
import {
  adminSessionCookieName,
  getAdminAuthConfig,
  revokeSession,
} from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(config: ReturnType<typeof getAdminAuthConfig>, status = 303) {
  if (!config) {
    return new NextResponse("Nie można teraz wylogować się.", {
      headers: { "Cache-Control": "no-store" },
      status: 503,
    });
  }

  const result = NextResponse.redirect(new URL("/admin", config.authUrl), status);
  result.headers.set("Cache-Control", "no-store");
  result.cookies.set(adminSessionCookieName, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: true,
  });
  return result;
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config)) {
    return response(config, 403);
  }

  try {
    const sessionCookie = request.headers.get("cookie")
      ?.split(";")
      .map((value) => value.trim())
      .find((value) => value.startsWith(`${adminSessionCookieName}=`))
      ?.slice(adminSessionCookieName.length + 1);
    await revokeSession(sessionCookie);
  } catch {
    console.error("Admin logout could not be completed");
  }

  return response(config);
}
