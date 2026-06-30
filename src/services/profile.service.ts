import { BaseService } from "@/services/base.service";
import { Profile } from "@/types/models";

export interface ProfileUpdateInput {
  name?: string;
  avatar?: string | null;
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
        created_at
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
    const rows = await db<Profile[]>`
      update profiles
      set name = ${nextName}, avatar = ${nextAvatar}
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
        created_at
    `;
    const updated = rows[0];
    if (!updated) {
      throw new Error("Profile update failed");
    }
    return updated;
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
