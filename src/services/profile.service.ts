import { BaseService } from "@/services/base.service";
import { Profile } from "@/types/models";
import {
  FontScalePreset,
  getFontScaleOption,
  normalizeFontScalePreset,
} from "@/lib/ui/font-scale";
import {
  DailyPlanHours,
  normalizeDailyPlanHours,
  type DailyPlanSettings,
} from "@/lib/daily-planner/hours";

export interface ProfileUpdateInput {
  name?: string;
  avatar?: string | null;
  fontScale?: FontScalePreset;
}

export class ProfileService extends BaseService {
  public async getById(userId: string): Promise<Profile | null> {
    const db = this.getDb();
    const rows = await db<Profile[]>`
      select
        id,
        name,
        email,
        role,
        telegram_id,
        avatar,
        is_approved,
        approved_at,
        approved_by,
        created_at,
        font_scale
      from profiles
      where id = ${userId}
      limit 1
    `;
    return rows[0] ?? null;
  }

  public async updateProfile(userId: string, input: ProfileUpdateInput): Promise<Profile> {
    const db = this.getDb();
    const current = await this.getById(userId);
    if (!current) {
      throw new Error("Profile not found");
    }

    const nextName = input.name !== undefined ? input.name.trim() : current.name;
    if (!nextName) {
      throw new Error("Name is required");
    }

    const nextAvatar = input.avatar !== undefined ? input.avatar : current.avatar;
    const nextFontScale =
      input.fontScale !== undefined
        ? normalizeFontScalePreset(input.fontScale)
        : normalizeFontScalePreset(current.font_scale);
    const rows = await db<Profile[]>`
      update profiles
      set name = ${nextName}, avatar = ${nextAvatar}, font_scale = ${nextFontScale}
      where id = ${userId}
      returning
        id,
        name,
        email,
        role,
        telegram_id,
        avatar,
        is_approved,
        approved_at,
        approved_by,
        created_at,
        font_scale
    `;
    const updated = rows[0];
    if (!updated) {
      throw new Error("Profile update failed");
    }
    return updated;
  }

  public async getFontScale(userId: string): Promise<{ preset: FontScalePreset; scale: number }> {
    const profile = await this.getById(userId);
    const preset = normalizeFontScalePreset(profile?.font_scale);
    return { preset, scale: getFontScaleOption(preset).scale };
  }

  public async setFontScale(userId: string, preset: FontScalePreset): Promise<{ preset: FontScalePreset; scale: number }> {
    const normalized = normalizeFontScalePreset(preset);
    const db = this.getDb();
    await db`
      update profiles
      set font_scale = ${normalized}
      where id = ${userId}
    `;
    return { preset: normalized, scale: getFontScaleOption(normalized).scale };
  }

  public async getDailyPlanHours(userId: string): Promise<DailyPlanSettings> {
    const db = this.getDb();
    const rows = await db<
      Array<{ daily_plan_hour_start: number; daily_plan_hour_end: number; daily_plan_slot_minutes: number }>
    >`
      select daily_plan_hour_start, daily_plan_hour_end, daily_plan_slot_minutes
      from profiles
      where id = ${userId}
      limit 1
    `;
    const row = rows[0];
    return normalizeDailyPlanHours(
      row?.daily_plan_hour_start,
      row?.daily_plan_hour_end,
      row?.daily_plan_slot_minutes,
    );
  }

  public async setDailyPlanHours(
    userId: string,
    hourStart: number,
    hourEnd: number,
    slotMinutes?: number,
  ): Promise<DailyPlanSettings> {
    const normalized = normalizeDailyPlanHours(hourStart, hourEnd, slotMinutes);
    const db = this.getDb();
    await db`
      update profiles
      set
        daily_plan_hour_start = ${normalized.hourStart},
        daily_plan_hour_end = ${normalized.hourEnd},
        daily_plan_slot_minutes = ${normalized.slotMinutes}
      where id = ${userId}
    `;
    return normalized;
  }

  public async syncGoogleAvatarIfEmpty(userId: string, pictureUrl: string | null): Promise<void> {
    if (!pictureUrl) return;
    const db = this.getDb();
    await db`
      update profiles
      set avatar = ${pictureUrl}
      where id = ${userId} and (avatar is null or avatar = '')
    `;
  }
}
