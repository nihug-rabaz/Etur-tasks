import { BaseService } from "@/services/base.service";

/**
 * Idempotent schema bootstrap for assistant features on the live DATABASE_URL.
 * Used because Vercel Sensitive env cannot be pulled locally for offline migrate.
 */
export class AssistantSchemaService extends BaseService {
  public async ensure(): Promise<{
    auditTable: boolean;
    releasedSeed: boolean;
  }> {
    const db = this.getDb();

    await db`
      create table if not exists public.assistant_action_audit (
        id uuid primary key default gen_random_uuid(),
        user_id uuid not null,
        tool_name text not null,
        severity text not null default 'normal' check (severity in ('normal', 'destructive')),
        label text,
        method text,
        path text,
        args jsonb,
        before_snapshot jsonb,
        after_snapshot jsonb,
        result_ok boolean,
        summary text,
        created_at timestamptz not null default now()
      )
    `;
    await db`
      create index if not exists assistant_action_audit_user_created_idx
        on public.assistant_action_audit (user_id, created_at desc)
    `;
    await db`
      create index if not exists assistant_action_audit_created_idx
        on public.assistant_action_audit (created_at desc)
    `;
    await db`
      insert into public.app_settings (key, value)
      values ('assistant_released', 'false')
      on conflict (key) do nothing
    `;

    return { auditTable: true, releasedSeed: true };
  }
}
