import { NextResponse } from "next/server";
import { z } from "zod";
import { getAdminAuthConfig, getAdminSession, getEffectivePasswordHash, resolveAdminSessionVersion } from "@/lib/admin-auth";
import { hashAdminPassword, minimumAdminPasswordLength, verifyAdminPassword } from "@/lib/admin-password";
import { isSameAdminOrigin } from "@/lib/admin-security";
import { getPrisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1).max(1024),
  newPassword: z.string().min(minimumAdminPasswordLength).max(1024),
  confirmPassword: z.string().min(minimumAdminPasswordLength).max(1024),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords do not match",
  path: ["confirmPassword"],
});

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || config.mode !== "password" || !isSameAdminOrigin(request.headers.get("origin"), config)) {
    return new NextResponse("Not found", { status: 404 });
  }

  const session = await getAdminSession();
  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const contentType = request.headers.get("content-type");
  const contentLengthHeader = request.headers.get("content-length");
  const contentLength = Number(contentLengthHeader);
  if (!contentLengthHeader || !/^[1-9]\d*$/.test(contentLengthHeader)
    || !Number.isSafeInteger(contentLength) || contentLength > 4096
    || contentType !== "application/x-www-form-urlencoded") {
    return new NextResponse("Bad request", { status: 400 });
  }

  let parsed;
  try {
    parsed = changePasswordSchema.safeParse(Object.fromEntries(await request.formData()));
  } catch {
    return new NextResponse("Bad request", { status: 400 });
  }
  if (!parsed.success) {
    return new NextResponse("Invalid password", { status: 400 });
  }

  const { currentPassword, newPassword } = parsed.data;
  const effectiveHash = (await getEffectivePasswordHash(config)) ?? config.passwordHash;
  if (!(await verifyAdminPassword(config.username, effectiveHash, config.username, currentPassword))) {
    return new NextResponse("Invalid current password", { status: 403 });
  }

  try {
    const newHash = await hashAdminPassword(newPassword);
    await getPrisma().adminPassword.upsert({
      where: { username: config.username },
      update: { passwordHash: newHash },
      create: { username: config.username, passwordHash: newHash },
    });

    const newVersion = await resolveAdminSessionVersion(config);
    await getPrisma().adminSession.updateMany({
      data: { credentialVersion: newVersion },
      where: { sessionHash: session.sessionHash, expiresAt: { gt: new Date() }, revokedAt: null },
    });
  } catch {
    return new NextResponse("Could not change password", { status: 500 });
  }

  return NextResponse.redirect(new URL("/admin/password?password=changed", config.authUrl), 303);
}
