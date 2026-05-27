import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({ error: "Telegram test messages are disabled" }, { status: 410 });
}
