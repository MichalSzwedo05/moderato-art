import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminSession, adminSessionCookie, getAdminAuthConfig, getUserPasswordHash, getTrustedClientAddress, takePasswordLoginRateLimit } from "@/lib/admin-auth";
import { verifyAdminPassword } from "@/lib/admin-password";
import { getPasswordUser, isSameAdminOrigin } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const credentialsSchema = z.object({
  password: z.string().min(1).max(1024),
  username: z.string().min(1).max(100),
});

function failure(config = getAdminAuthConfig()) {
  if (!config) return new NextResponse("Nie można teraz zalogować się. Spróbuj ponownie.", {
    headers: { "Cache-Control": "no-store" },
    status: 503,
  });
  const response = NextResponse.redirect(new URL("/admin?login=invalid", config.authUrl), 303);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || config.mode !== "password" || !isSameAdminOrigin(request.headers.get("origin"), config)) return failure(config);

  const clientAddress = getTrustedClientAddress(request);
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = Number(contentLengthHeader);
  const contentType = request.headers.get("content-type");
  if (!clientAddress || !contentLengthHeader || !/^[1-9]\d*$/.test(contentLengthHeader)
    || !Number.isSafeInteger(contentLength) || contentLength > 10_000
    || contentType !== "application/x-www-form-urlencoded") return failure(config);
  if (!(await takePasswordLoginRateLimit(clientAddress, config))) return failure(config);

  try {
    const parsed = credentialsSchema.safeParse(Object.fromEntries(await request.formData()));
    const username = parsed.success ? parsed.data.username : "";
    const password = parsed.success ? parsed.data.password : "";
    const user = getPasswordUser(config, username);
    if (!user || !(await verifyAdminPassword(user.username, await getUserPasswordHash(config, user), username, password))) return failure(config);

    const sessionToken = await createAdminSession(config, username);
    const { value, ...cookieOptions } = adminSessionCookie(sessionToken);
    const response = NextResponse.redirect(new URL("/admin", config.authUrl), 303);
    response.headers.set("Cache-Control", "no-store");
    response.cookies.set("__Host-moderato-admin-session", value, cookieOptions);
    return response;
  } catch {
    console.error("Admin password login could not be completed");
    return failure(config);
  }
}
