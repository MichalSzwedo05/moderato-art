import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const unavailableResponse = () => NextResponse.json(
  { message: "Formularz kontaktowy jest chwilowo niedostępny." },
  {
    status: 503,
    headers: {
      "Cache-Control": "no-store",
    },
  },
);

export async function POST() {
  return unavailableResponse();
}
