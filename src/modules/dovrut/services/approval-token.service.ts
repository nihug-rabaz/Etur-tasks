import { randomBytes } from "node:crypto";
import { BaseService } from "@/services/base.service";
import type { DovrutApprovalStatus } from "@/modules/dovrut/types";

export interface DovrutApprovalToken {
  id: string;
  token: string;
  concept_id: string;
  approval_step: string;
  expires_at: string;
  used_at: string | null;
  created_by: string | null;
  created_at: string;
}

const TOKEN_TTL_HOURS = 72;

export class DovrutApprovalTokenService extends BaseService {
  public async createToken(
    conceptId: string,
    step: DovrutApprovalStatus | string,
    createdBy?: string | null,
  ): Promise<DovrutApprovalToken> {
    const db = this.getDb();
    const token = randomBytes(24).toString("base64url");
    const rows = await db<DovrutApprovalToken[]>`
      insert into dovrut_approval_tokens (
        token, concept_id, approval_step, expires_at, created_by
      ) values (
        ${token},
        ${conceptId},
        ${step},
        now() + (${TOKEN_TTL_HOURS}::int * interval '1 hour'),
        ${createdBy ?? null}
      )
      returning *
    `;
    return rows[0];
  }

  public async getByToken(token: string): Promise<DovrutApprovalToken | null> {
    const db = this.getDb();
    const rows = await db<DovrutApprovalToken[]>`
      select * from dovrut_approval_tokens
      where token = ${token}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async markUsed(token: string): Promise<DovrutApprovalToken | null> {
    const db = this.getDb();
    const rows = await db<DovrutApprovalToken[]>`
      update dovrut_approval_tokens
      set used_at = now()
      where token = ${token} and used_at is null
      returning *
    `;
    return rows[0] ?? null;
  }

  /** Atomic claim: usable + unexpired only. Returns null if already used/expired/missing. */
  public async claimToken(token: string): Promise<DovrutApprovalToken | null> {
    const db = this.getDb();
    const rows = await db<DovrutApprovalToken[]>`
      update dovrut_approval_tokens
      set used_at = now()
      where token = ${token}
        and used_at is null
        and expires_at > now()
      returning *
    `;
    return rows[0] ?? null;
  }

  public isUsable(row: DovrutApprovalToken): boolean {
    if (row.used_at) return false;
    return new Date(row.expires_at).getTime() > Date.now();
  }
}
