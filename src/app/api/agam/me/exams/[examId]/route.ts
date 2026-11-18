import { NextResponse } from "next/server";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateMeService } from "@/modules/agam/services/candidate-me.service";
import { AgamCandidateExamService } from "@/modules/agam/services/candidate-exam.service";

type RouteContext = { params: Promise<{ examId: string }> };

async function resolveCandidate() {
  const access = await new AgamAccessService().requireCandidateAccess();
  if ("error" in access) {
    return { error: access.error, status: access.status } as const;
  }
  const candidate = await new AgamCandidateMeService().resolveForUser(
    access.profile.id,
    access.profile.email,
  );
  if (!candidate) {
    return { error: "לא נמצא תיק מועמד", status: 404 } as const;
  }
  return { candidate } as const;
}

export async function GET(_request: Request, context: RouteContext) {
  const resolved = await resolveCandidate();
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { examId } = await context.params;
  const examService = new AgamCandidateExamService();
  const exam = examService.getDefinition(examId);
  if (!exam) {
    return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
  }
  const lockReason = await examService.lockReason(resolved.candidate, exam);
  if (lockReason) {
    return NextResponse.json({ error: lockReason }, { status: 403 });
  }

  const attempt = await examService.getLatestForExam(resolved.candidate.id, examId);
  return NextResponse.json({
    exam: {
      id: exam.id,
      title: exam.title,
      category: exam.category,
      blurb: exam.blurb,
      kind: exam.kind,
      questions: exam.questions,
    },
    attempt,
    review: examService.reviewKey(exam, attempt),
  });
}

export async function POST(request: Request, context: RouteContext) {
  const resolved = await resolveCandidate();
  if ("error" in resolved) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }

  const { examId } = await context.params;
  const examService = new AgamCandidateExamService();
  const exam = examService.getDefinition(examId);
  if (!exam) {
    return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
  }
  const lockReason = await examService.lockReason(resolved.candidate, exam);
  if (lockReason) {
    return NextResponse.json({ error: lockReason }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as {
    answers?: unknown;
    status?: "in_progress" | "submitted";
    restart?: boolean;
  } | null;

  const status = body?.status === "submitted" ? "submitted" : "in_progress";
  try {
    const attempt = await examService.saveAttempt({
      candidateId: resolved.candidate.id,
      examId,
      answers: body?.answers ?? {},
      status,
      restart: Boolean(body?.restart),
    });
    const board = await examService.buildBoard(resolved.candidate);
    return NextResponse.json({ ok: true, attempt, exams: board, review: examService.reviewKey(exam, attempt) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "SAVE_FAILED";
    if (message === "ALREADY_SUBMITTED") {
      return NextResponse.json(
        { error: exam.kind === "scheduled" ? "המבחן כבר הוגש" : "המבחן כבר הוגש. ניתן להתחיל מחדש." },
        { status: 409 },
      );
    }
    if (message === "EXAM_NOT_FOUND") {
      return NextResponse.json({ error: "מבחן לא נמצא" }, { status: 404 });
    }
    console.error("[agam/me/exams] save failed:", error);
    return NextResponse.json({ error: "שמירת המבחן נכשלה" }, { status: 500 });
  }
}
