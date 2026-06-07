import { randomBytes } from "node:crypto";
import { BaseService } from "@/services/base.service";
import { Env } from "@/lib/env";

interface TelegramSendOptions {
  parseMode?: "Markdown" | "HTML" | "MarkdownV2";
  disablePreview?: boolean;
}

interface TelegramBotInfo {
  id: number;
  username: string;
  firstName: string;
}

interface TelegramUserInfo {
  id: number;
  username?: string;
  firstName?: string;
}

interface TelegramUpdate {
  message?: {
    chat: { id: number; type: string };
    from?: { id: number; username?: string; first_name?: string };
    text?: string;
  };
}

interface LinkStatus {
  linked: boolean;
  chatId: string | null;
  username: string | null;
  linkedAt: string | null;
  botUsername: string | null;
}

interface LinkCodeResult {
  code: string;
  expiresAt: string;
  botUsername: string;
  deepLink: string;
}

const API_BASE = "https://api.telegram.org";
const LINK_CODE_TTL_MINUTES = 15;

let cachedBotInfo: TelegramBotInfo | null = null;

export class TelegramService extends BaseService {
  private getToken(): string {
    return Env.require("TELEGRAM_BOT_TOKEN");
  }

  public hasToken(): boolean {
    return Boolean(Env.get("TELEGRAM_BOT_TOKEN"));
  }

  private async callBot<T = unknown>(method: string, body?: Record<string, unknown>): Promise<T> {
    const response = await fetch(`${API_BASE}/bot${this.getToken()}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const payload = (await response.json()) as { ok: boolean; result?: T; description?: string };
    if (!payload.ok) {
      throw new Error(payload.description || `Telegram API error: ${method}`);
    }
    return payload.result as T;
  }

  public async getBotInfo(): Promise<TelegramBotInfo> {
    if (cachedBotInfo) return cachedBotInfo;
    const result = await this.callBot<{ id: number; username: string; first_name: string }>("getMe");
    cachedBotInfo = {
      id: result.id,
      username: result.username,
      firstName: result.first_name,
    };
    return cachedBotInfo;
  }

  public async sendMessage(chatId: string | number, text: string, options?: TelegramSendOptions): Promise<void> {
    await this.callBot("sendMessage", {
      chat_id: chatId,
      text,
      parse_mode: options?.parseMode,
      disable_web_page_preview: options?.disablePreview ?? true,
    });
  }

  public async sendToUser(userId: string, text: string, options?: TelegramSendOptions): Promise<boolean> {
    const db = this.getDb();
    const rows = await db<Array<{ telegram_id: string | null }>>`
      select telegram_id from profiles where id = ${userId} limit 1
    `;
    const chatId = rows[0]?.telegram_id;
    if (!chatId) return false;
    await this.sendMessage(chatId, text, options);
    return true;
  }

  public async getDirectRecipients(): Promise<
    Array<{ id: string; name: string; username: string | null; avatar: string | null; linkedAt: string | null }>
  > {
    const db = this.getDb();
    return db<Array<{ id: string; name: string; username: string | null; avatar: string | null; linkedAt: string | null }>>`
      select id, name, telegram_username as username, avatar, telegram_linked_at as "linkedAt"
      from profiles
      where telegram_id is not null and is_approved = true
      order by name
    `;
  }

  // Sends a private message to each selected user that is linked to Telegram.
  public async sendDirectMessages(
    userIds: string[],
    text: string,
    options?: TelegramSendOptions,
  ): Promise<{ sent: number; failed: number; total: number }> {
    const uniqueIds = [...new Set(userIds.filter(Boolean))];
    let sent = 0;
    let failed = 0;
    for (const userId of uniqueIds) {
      try {
        const delivered = await this.sendToUser(userId, text, options);
        if (delivered) sent += 1;
        else failed += 1;
      } catch (error) {
        console.error("[telegram-direct]", error);
        failed += 1;
      }
    }
    return { sent, failed, total: uniqueIds.length };
  }

  public async broadcastToLinkedUsers(
    text: string,
    options?: TelegramSendOptions,
  ): Promise<{ sent: number; failed: number; total: number }> {
    const db = this.getDb();
    const rows = await db<Array<{ telegram_id: string }>>`
      select distinct telegram_id from profiles
      where telegram_id is not null and is_approved = true
    `;
    let sent = 0;
    let failed = 0;
    for (const row of rows) {
      try {
        await this.sendMessage(row.telegram_id, text, options);
        sent += 1;
      } catch (error) {
        console.error("[telegram-broadcast]", error);
        failed += 1;
      }
    }
    return { sent, failed, total: rows.length };
  }

  public async generateLinkCode(userId: string): Promise<LinkCodeResult> {
    const bot = await this.getBotInfo();
    const db = this.getDb();
    await db`delete from telegram_link_codes where user_id = ${userId} or expires_at < now()`;
    const code = randomBytes(6).toString("hex");
    const expires = new Date(Date.now() + LINK_CODE_TTL_MINUTES * 60 * 1000).toISOString();
    await db`
      insert into telegram_link_codes (code, user_id, expires_at)
      values (${code}, ${userId}, ${expires})
    `;
    return {
      code,
      expiresAt: expires,
      botUsername: bot.username,
      deepLink: `https://t.me/${bot.username}?start=${code}`,
    };
  }

  public async unlink(userId: string): Promise<void> {
    const db = this.getDb();
    await db`
      update profiles
      set telegram_id = null, telegram_username = null, telegram_linked_at = null
      where id = ${userId}
    `;
    await db`delete from telegram_link_codes where user_id = ${userId}`;
  }

  public async getStatus(userId: string): Promise<LinkStatus> {
    const db = this.getDb();
    const rows = await db<
      Array<{
        telegram_id: string | null;
        telegram_username: string | null;
        telegram_linked_at: string | null;
      }>
    >`
      select telegram_id, telegram_username, telegram_linked_at
      from profiles where id = ${userId} limit 1
    `;
    const row = rows[0];
    let botUsername: string | null = null;
    if (this.hasToken()) {
      try {
        botUsername = (await this.getBotInfo()).username;
      } catch {
        botUsername = null;
      }
    }
    return {
      linked: Boolean(row?.telegram_id),
      chatId: row?.telegram_id ?? null,
      username: row?.telegram_username ?? null,
      linkedAt: row?.telegram_linked_at ?? null,
      botUsername,
    };
  }

  public async linkChatByCode(code: string, chat: TelegramUserInfo): Promise<{ userId: string } | null> {
    const db = this.getDb();
    const rows = await db<Array<{ user_id: string }>>`
      select user_id from telegram_link_codes
      where code = ${code} and expires_at > now()
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;

    await db`
      update profiles
      set telegram_id = ${String(chat.id)},
          telegram_username = ${chat.username ?? null},
          telegram_linked_at = now()
      where id = ${row.user_id}
    `;
    await db`delete from telegram_link_codes where user_id = ${row.user_id}`;
    return { userId: row.user_id };
  }

  public async pollUpdates(): Promise<{ processed: number }> {
    const offsetRows = await this.getDb()<Array<{ value: string }>>`
      select value from app_settings where key = 'telegram_update_offset' limit 1
    `.catch(() => []);
    const offset = offsetRows[0]?.value ? Number(offsetRows[0].value) : 0;
    const updates = await this.callBot<TelegramUpdate[] & Array<{ update_id: number }>>(
      "getUpdates",
      { offset: offset || undefined, timeout: 0, allowed_updates: ["message"] },
    );
    let processed = 0;
    let lastUpdateId = offset;
    for (const update of updates) {
      try {
        await this.processUpdate(update);
        processed += 1;
      } catch (error) {
        console.error("[telegram-poll]", error);
      }
      const id = (update as { update_id: number }).update_id;
      if (id > lastUpdateId) lastUpdateId = id;
    }
    if (lastUpdateId > offset) {
      const nextOffset = String(lastUpdateId + 1);
      await this.getDb()`
        insert into app_settings (key, value) values ('telegram_update_offset', ${nextOffset})
        on conflict (key) do update set value = excluded.value
      `;
    }
    return { processed };
  }

  public async processUpdate(update: TelegramUpdate): Promise<void> {
    const message = update.message;
    if (!message || !message.text) return;
    const text = message.text.trim();
    const from = message.from;
    if (!from) return;

    if (text.startsWith("/start")) {
      const parts = text.split(/\s+/);
      const code = parts[1];
      if (!code) {
        await this.sendMessage(
          message.chat.id,
          "ברוך הבא ל-TaskFlow Orbit. כדי לחבר את החשבון, פתח את האפליקציה ולחץ על איקון הפעמון בפינה.",
        );
        return;
      }
      const result = await this.linkChatByCode(code, {
        id: from.id,
        username: from.username,
        firstName: from.first_name,
      });
      if (result) {
        await this.sendMessage(
          message.chat.id,
          "החשבון חובר בהצלחה! מעכשיו תקבל כאן עדכונים על משימות.",
        );
      } else {
        await this.sendMessage(
          message.chat.id,
          "הקוד שגוי או שפג תוקפו. חזור לאפליקציה והנפק קוד חדש.",
        );
      }
      return;
    }

    if (text === "/ping") {
      await this.sendMessage(message.chat.id, "pong");
    }
  }

}
