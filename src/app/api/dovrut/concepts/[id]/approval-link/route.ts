import { NextResponse } from "next/server";
import { AppUrls } from "@/lib/urls/app-urls";
import { buildWaMeUrl } from "@/modules/dovrut/lib/wa-me";
import { APPROVAL_STATUS_LABELS } from "@/modules/dovrut/lib/approval-flows";
import { DovrutAccessService } from "@/modules/dovrut/services/access.service";
import { DovrutApprovalTokenService } from "@/modules/dovrut/services/approval-token.service";
import { DovrutConceptService } from "@/modules/dovrut/services/concept.service";
import {
  DovrutWorkflowSettingsService,
  type DovrutWorkflowPhones,
} from "@/modules/dovrut/services/workflow-settings.service";
import type { DovrutApprovalStatus } from "@/modules/dovrut/types";

function phoneForStep(
  step: DovrutApprovalStatus,
  phones: DovrutWorkflowPhones,
): string {
  switch (step) {
    case "waiting_branch_head":
      return phones.branch_head;
    case "waiting_deputy_commander":
      return phones.deputy_commander;
    case "waiting_chief_rabbi":
      return phones.chief_rabbi;
    default:
      return phones.idf_spokesperson;
  }
}

export async function POST(
  _request: Request,
  context: { params: Promise<{ id: string }> },
) {
  const accessService = new DovrutAccessService();
  const access = await accessService.requireDovrutAccess();
  if ("error" in access) {
    return NextResponse.json({ error: access.error }, { status: access.status });
  }
  if (!accessService.canEditContent(access.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await context.params;
  const concept = await new DovrutConceptService().getById(id);
  if (!concept || concept.deleted_at) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (
    !concept.approval_status ||
    concept.approval_status === "approved"
  ) {
    return NextResponse.json(
      { error: "אין שלב אישור פעיל" },
      { status: 400 },
    );
  }

  const tokenRow = await new DovrutApprovalTokenService().createToken(
    concept.id,
    concept.approval_status,
    access.profile.id,
  );

  const origin = AppUrls.getOrigin();
  const path = `/dovrut-approve/${tokenRow.token}`;
  const url = origin ? `${origin}${path}` : path;

  const settings = await new DovrutWorkflowSettingsService().get();
  const phone = phoneForStep(concept.approval_status, settings.phones);
  const stepLabel =
    APPROVAL_STATUS_LABELS[concept.approval_status] ?? concept.approval_status;
  const message = [
    `*אישור דוברות* — ${concept.name}`,
    stepLabel,
    "",
    `לאישור: ${url}`,
  ].join("\n");

  const waMeUrl = phone.trim()
    ? buildWaMeUrl(phone, message)
    : buildWaMeUrl("", message);

  return NextResponse.json({
    url,
    waMeUrl: phone.trim() ? waMeUrl : null,
    token: tokenRow.token,
    approvalStep: concept.approval_status,
    phoneConfigured: Boolean(phone.trim()),
  });
}
