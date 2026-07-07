import { NextResponse } from "next/server";
import { AuthorizationService } from "@/services/authorization.service";
import { NeonDatabase } from "@/lib/db/neon";
import type { Subtopic } from "@/types/models";

function dedupeSubtopicsById(items: Subtopic[]): Subtopic[] {
  return [...new Map(items.map((item) => [item.id, item])).values()];
}

function dedupeSubtopicsByDomainAndName(items: Subtopic[]): Subtopic[] {
  const byKey = new Map<string, Subtopic>();
  for (const item of items) {
    const key = `${item.domain_id}:${item.name.trim().toLowerCase()}`;
    if (!byKey.has(key)) byKey.set(key, item);
  }
  return [...byKey.values()];
}

export async function GET(request: Request) {
  const authorizationService = new AuthorizationService();
  const profile = await authorizationService.getCurrentProfile();
  if (!profile) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!profile.is_approved) {
    return NextResponse.json({ error: "Awaiting admin approval" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const domainIdParam = searchParams.get("domainId");
  const domainSlugParam = searchParams.get("domainSlug");

  const db = NeonDatabase.createClient();

  let filterDomainId: string | null = domainIdParam;
  if (!filterDomainId && domainSlugParam) {
    const domainRows = await db<Array<{ id: string }>>`
      select id from domains where slug = ${domainSlugParam} limit 1
    `;
    filterDomainId = domainRows[0]?.id ?? null;
  }

  let subtopics: Subtopic[];
  if (filterDomainId) {
    subtopics = await authorizationService.getAccessibleSubtopicsInDomain(profile, filterDomainId);
  } else {
    subtopics = await authorizationService.getAccessibleSubtopics(profile);
  }

  subtopics = dedupeSubtopicsByDomainAndName(dedupeSubtopicsById(subtopics));

  const subtopicsPayload = subtopics.map((item) => ({
    id: item.id,
    name: item.name,
    domain_id: item.domain_id,
  }));
  const subtopicIds = subtopics.map((item) => item.id);
  const users = await db<Array<{ id: string; name: string; avatar: string | null }>>`
    select id, name, avatar from profiles order by name
  `;
  const projects =
    subtopicIds.length > 0
      ? await db<
          Array<{
            id: string;
            name: string;
            subtopic_id: string;
            subtopic_ids: string[];
          }>
        >`
          select
            p.id,
            p.name,
            p.subtopic_id,
            coalesce(
              array_agg(ps.subtopic_id) filter (where ps.subtopic_id is not null),
              array[p.subtopic_id]
            ) as subtopic_ids
          from projects p
          left join project_subtopics ps on ps.project_id = p.id
          where (
            p.subtopic_id = any(${subtopicIds})
            or exists (
              select 1
              from project_subtopics ps2
              where ps2.project_id = p.id
                and ps2.subtopic_id = any(${subtopicIds})
            )
          )
          group by p.id, p.name, p.subtopic_id
          order by p.name
        `
      : [];

  return NextResponse.json({ subtopics: subtopicsPayload, users, projects, currentUserId: profile.id });
}
