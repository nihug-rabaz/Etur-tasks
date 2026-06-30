import { BaseService } from "@/services/base.service";

const MORNING_MESSAGE_TIME_KEY = "telegram_morning_message_time";
const DEFAULT_MORNING_MESSAGE_TIME = "07:00";

export class AppSettingsService extends BaseService {
  public async getMorningMessageTime(): Promise<string> {
    const db = this.getDb();
    const rows = await db<Array<{ value: string }>>`
      select value from app_settings where key = ${MORNING_MESSAGE_TIME_KEY} limit 1
    `.catch(() => []);
    const value = rows[0]?.value?.trim();
    return this.normalizeMorningMessageTime(value);
  }

  public async setMorningMessageTime(value: string): Promise<string> {
    const normalized = this.normalizeMorningMessageTime(value);
    const db = this.getDb();
    await db`
      insert into app_settings (key, value)
      values (${MORNING_MESSAGE_TIME_KEY}, ${normalized})
      on conflict (key) do update
      set value = excluded.value, updated_at = now()
    `;
    return normalized;
  }

  public normalizeMorningMessageTime(value?: string | null): string {
    const match = (value ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
    if (!match) return DEFAULT_MORNING_MESSAGE_TIME;
    const hour = Number.parseInt(match[1], 10);
    const minute = Number.parseInt(match[2], 10);
    if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return DEFAULT_MORNING_MESSAGE_TIME;
    }
    return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
  }
}

export function isWithinMorningSummaryWindow(
  hour: number,
  minute: number,
  configuredTime: string,
  windowMinutes = 120,
): boolean {
  const match = configuredTime.match(/^(\d{2}):(\d{2})$/);
  if (!match) return false;
  const start = Number.parseInt(match[1], 10) * 60 + Number.parseInt(match[2], 10);
  const now = hour * 60 + minute;
  return now >= start && now < start + windowMinutes;
}
