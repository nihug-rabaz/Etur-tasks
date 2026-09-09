import { BaseService } from "@/services/base.service";

export type AssistantActionSeverity = "normal" | "destructive";

export type AssistantAuditWrite = {
  userId: string;
  toolName: string;
  severity?: AssistantActionSeverity;
  label?: string | null;
  method?: string | null;
  path?: string | null;
  args?: unknown;
  beforeSnapshot?: unknown;
  afterSnapshot?: unknown;
  resultOk?: boolean | null;
  summary?: string | null;
};

export class AssistantAuditService extends BaseService {
  public async record(entry: AssistantAuditWrite): Promise<string | null> {
    const db = this.getDb();
    try {
      const rows = await db<Array<{ id: string }>>`
        insert into assistant_action_audit (
          user_id, tool_name, severity, label, method, path,
          args, before_snapshot, after_snapshot, result_ok, summary
        )
        values (
          ${entry.userId},
          ${entry.toolName},
          ${entry.severity ?? "normal"},
          ${entry.label ?? null},
          ${entry.method ?? null},
          ${entry.path ?? null},
          ${JSON.stringify(entry.args ?? null)}::jsonb,
          ${JSON.stringify(entry.beforeSnapshot ?? null)}::jsonb,
          ${JSON.stringify(entry.afterSnapshot ?? null)}::jsonb,
          ${entry.resultOk ?? null},
          ${entry.summary ?? null}
        )
        returning id
      `;
      return rows[0]?.id ?? null;
    } catch {
      // Table may not be migrated yet — never break the assistant on audit failure.
      return null;
    }
  }
}
