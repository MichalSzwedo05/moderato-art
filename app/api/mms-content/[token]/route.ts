import { NextResponse } from "next/server";
import { readMmsContentToken } from "@/lib/mms-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const message = process.env.SMSAPI_TOKEN ? readMmsContentToken((await context.params).token, process.env.SMSAPI_TOKEN) : undefined;
  if (!message) return new NextResponse("Not found", { status: 404 });
  return new NextResponse(message, { headers: { "Cache-Control": "private, no-store, max-age=0", "Content-Type": "text/plain; charset=utf-8" }, status: 200 });
}
