import { NextResponse } from "next/server";
import { AgamQuestionService } from "@/modules/agam/services/question.service";
import { checkRateLimit } from "@/modules/agam/lib/rate-limit";

export async function GET(request: Request) {
  const ip = request.headers.get("x-forwarded-for") ?? "anon";
  if (!checkRateLimit(`agam-public-questions:${ip}`, 40, 60_000)) {
    return NextResponse.json({ error: "יותר מדי בקשות" }, { status: 429 });
  }
  try {
    const questions = await new AgamQuestionService().listActive("pre_screening");
    return NextResponse.json({ questions });
  } catch {
    return NextResponse.json({ questions: [] });
  }
}
