import { NextResponse } from "next/server";
import { cleanupExpiredContactData } from "@/lib/contact-cleanup";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

async function runCleanup(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ message: "Brak dostępu." }, { headers: { "Cache-Control": "no-store" }, status: 401 });
  }

  try {
    const result = await cleanupExpiredContactData();
    return NextResponse.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("Contact cleanup job failed");
    return NextResponse.json({ message: "Nie udało się wykonać czyszczenia danych." }, { headers: { "Cache-Control": "no-store" }, status: 503 });
  }
}

export async function GET(request: Request) {
  return runCleanup(request);
}

export async function POST(request: Request) {
  return runCleanup(request);
}
