import { NextResponse } from "next/server";
import { readMmsContent } from "@/lib/mms-content";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ token: string }> };

export async function GET(_request: Request, context: RouteContext) {
  const id = (await context.params).token;
  const message = await readMmsContent(id);
  if (!message) return new NextResponse("Not found", { status: 404 });

  return new NextResponse(message, {
    headers: {
      "Cache-Control": "private, no-store, max-age=0",
      "Content-Type": "text/plain; charset=utf-8",
    },
    status: 200,
  });
}
