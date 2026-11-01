import { z } from "zod";

const scheduleDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .nullable()
  .optional();

export const scheduleSchema = z.object({
  selection_day: scheduleDate,
  fitness_test: scheduleDate,
  prep_day: scheduleDate,
  fitness_theory_test: scheduleDate,
  smach_start: scheduleDate,
  smach_mikra: scheduleDate,
  smach_weapon: scheduleDate,
  smach_run: scheduleDate,
  smach_pushups: scheduleDate,
  smach_end: scheduleDate,
  bahad1_intake: scheduleDate,
});
