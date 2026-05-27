import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Telegram broadcasts are disabled" }, { status: 410 });
}
