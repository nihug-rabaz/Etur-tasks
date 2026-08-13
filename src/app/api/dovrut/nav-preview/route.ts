import { NextResponse } from "next/server";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutCampaignService } from "@/modules/dovrut/services/campaign.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";
import { DovrutProjectService } from "@/modules/dovrut/services/project.service";
import { AuthorizationService } from "@/services/authorization.service";
import { TaskService } from "@/services/task.service";

const LIMIT = 12;

export async function GET() {
  const access = await new DovrutAccessService().requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }

  const [campaigns, projects, items] = await Promise.all([
    new DovrutCampaignService().list(),
    new DovrutProjectService().list({ status: "active" }),
    new DovrutConceptService().list({ activeOnly: true }),
  ]);

  let tasks: Array<{ id: string; title: string }> = [];
  try {
    const auth = new AuthorizationService();
    const taskAccess = await auth.getTaskAccessContext(access.profile);
    const rows = await new TaskService().getDovrutTasks(taskAccess, { limit: LIMIT });
    tasks = rows.slice(0, LIMIT).map((task) => ({ id: task.id, title: task.title }));
  } catch {
    tasks = [];
  }

  const pending = items.filter(
    (item) => item.approval_status && item.approval_status !== "approved",
  );

  return NextResponse.json({
    campaigns: campaigns
      .filter((row) => row.status === "active")
      .slice(0, LIMIT)
      .map((row) => ({ id: row.id, name: row.name })),
    projects: projects.slice(0, LIMIT).map((row) => ({ id: row.id, name: row.name })),
    items: items.slice(0, LIMIT).map((row) => ({ id: row.id, name: row.name })),
    tasks,
    approvals: pending.slice(0, LIMIT).map((row) => ({
      id: row.id,
      name: row.name,
      approval_status: row.approval_status,
    })),
  });
}
