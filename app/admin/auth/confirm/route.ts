import { NextResponse } from "next/server";
import {
  adminSessionCookie,
  adminSessionCookieName,
  consumeMagicLink,
  getAdminAuthConfig,
} from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function response(config: ReturnType<typeof getAdminAuthConfig>, location: string, status = 303) {
  if (!config) {
    return new NextResponse("Nie można teraz zalogować się. Spróbuj ponownie.", {
      headers: { "Cache-Control": "no-store" },
      status: 503,
    });
  }

  const result = NextResponse.redirect(new URL(location, config.authUrl), status);
  result.headers.set("Cache-Control", "no-store");
  return result;
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config)) {
    return response(config, "/admin?login=invalid", 403);
  }

  try {
    const token = (await request.formData()).get("token");
    const sessionToken = typeof token === "string" ? await consumeMagicLink(token) : undefined;
    if (!sessionToken) {
      return response(config, "/admin?login=invalid");
    }

    const result = response(config, "/admin");
    const { value, ...cookieOptions } = adminSessionCookie(sessionToken);
    result.cookies.set(adminSessionCookieName, value, cookieOptions);
    return result;
  } catch {
    console.error("Admin magic-link confirmation could not be completed");
    return response(config, "/admin?login=invalid");
  }
}
