import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAndSendMagicLink,
  getAdminAuthConfig,
  getTrustedClientAddress,
  takeLoginRateLimit,
} from "@/lib/admin-auth";
import { isSameAdminOrigin } from "@/lib/admin-security";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const loginSchema = z.object({ email: z.string().trim().email().max(254) });

function noStore(response: NextResponse) {
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function genericResponse(config = getAdminAuthConfig()) {
  if (!config) {
    return new NextResponse("Nie można teraz zalogować się. Spróbuj ponownie.", {
      headers: { "Cache-Control": "no-store" },
      status: 503,
    });
  }

  return noStore(NextResponse.redirect(new URL("/admin?login=sent", config.authUrl), 303));
}

export async function POST(request: Request) {
  const config = getAdminAuthConfig();
  if (!config || !isSameAdminOrigin(request.headers.get("origin"), config)) {
    return genericResponse(config);
  }

  const clientAddress = getTrustedClientAddress(request);
  if (!clientAddress) {
    return genericResponse(config);
  }

  try {
    if (!(await takeLoginRateLimit(clientAddress, config))) {
      return genericResponse(config);
    }

    const parsed = loginSchema.safeParse(Object.fromEntries(await request.formData()));
    if (!parsed.success || parsed.data.email !== config.adminEmail) {
      return genericResponse(config);
    }

    await createAndSendMagicLink(parsed.data.email, clientAddress, config);
  } catch {
    console.error("Admin magic-link request could not be completed");
  }

  return genericResponse(config);
}
