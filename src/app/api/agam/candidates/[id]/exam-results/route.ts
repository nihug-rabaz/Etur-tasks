import { NextResponse } from "next/server";
import { z } from "zod";
import { AgamAccessService } from "@/modules/agam/services/access.service";
import { AgamCandidateService } from "@/modules/agam/services/candidate.service";
import { AgamExamResultService } from "@/modules/agam/services/exam-result.service";
import { THRESHOLD_TESTS } from "@/modules/agam/lib/stages";

const TEST_KEYS = new Set(THRESHOLD_TESTS.map((test) => test.key));

const putSchema = z.object({
  results: z
    .array(
      z.object({
        testKey: z.string().refine((key) => TEST_KEYS.has(key)),
        value: z.string().max(16).nullable(),
      }),
    )
    .max(THRESHOLD_TESTS.length),
});

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const accessService = new AgamAccessService();
  const access = await accessService.requireAgamAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEvaluate(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const { id } = await context.params;
  if (!(await accessService.canAccessCandidate(access.role, id))) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const parsed = putSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed" }, { status: 400 });
  }
  const testByKey = new Map(THRESHOLD_TESTS.map((test) => [test.key, test]));
  for (const row of parsed.data.results) {
    const raw = row.value?.trim();
    if (!raw) continue;
    const test = testByKey.get(row.testKey)!;
    const valid =
      test.inputType === "time"
        ? /^\d{1,2}:[0-5]\d$/.test(raw)
        : test.inputType === "count"
          ? /^\d{1,3}$/.test(raw)
          : Number(raw) >= 1 && Number(raw) <= 100;
    if (!valid) {
      return NextResponse.json({ error: `ערך לא תקין ב${test.label}` }, { status: 400 });
    }
  }
  const results = await new AgamExamResultService().saveMany(
    id,
    parsed.data.results.map((row) => ({ test_key: row.testKey, value: row.value })),
    { id: access.profile.id, name: access.profile.name },
  );
  await new AgamCandidateService().addTimeline({
    candidate_id: id,
    event_type: "evaluation",
    title: "עודכנו תוצאות מבחנים",
    actor_name: access.profile.name,
  });
  return NextResponse.json({ results });
}
