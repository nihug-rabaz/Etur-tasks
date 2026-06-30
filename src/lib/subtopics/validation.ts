import { z } from "zod";
import { normalizeSubtopicIds, primarySubtopicId } from "@/lib/subtopics/ids";

export function resolveSubtopicIds(input: {
  subtopicId?: string;
  subtopicIds?: string[];
}): string[] {
  const fromList = normalizeSubtopicIds(input.subtopicIds ?? []);
  if (fromList.length > 0) return fromList;
  if (input.subtopicId) return [input.subtopicId];
  return [];
}

export const subtopicIdsSchema = z
  .object({
    subtopicId: z.string().uuid().optional(),
    subtopicIds: z.array(z.string().uuid()).optional(),
  })
  .transform((value) => resolveSubtopicIds(value))
  .pipe(z.array(z.string().uuid()).min(1));

export { primarySubtopicId };
