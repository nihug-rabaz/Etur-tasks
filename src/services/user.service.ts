import { BaseService } from "@/services/base.service";
import { Profile } from "@/types/models";

export class UserService extends BaseService {
  public async getUsers(): Promise<Profile[]> {
    const db = this.getDb();
    const data = await db<Profile[]>`
      select id, name, email, role, telegram_id, avatar, is_approved, access_status, approved_at, approved_by, created_at
      from profiles
      order by name
    `;
    return data;
  }

  public async getApprovedPickerUsers(): Promise<Array<{ id: string; name: string; avatar: string | null }>> {
    const db = this.getDb();
    return db<Array<{ id: string; name: string; avatar: string | null }>>`
      select id, name, avatar
      from profiles
      where is_approved = true
      order by name
    `;
  }
}
