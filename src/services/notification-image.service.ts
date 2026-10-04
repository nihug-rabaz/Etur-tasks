import { put } from "@vercel/blob";
import { randomUUID } from "node:crypto";
import { Env } from "@/lib/env";
import { AppUrls } from "@/lib/urls/app-urls";
import { NeonDatabase } from "@/lib/db/neon";
import {
  renderTodolistCardImage,
  type TodolistCardInput,
} from "@/lib/notifications/todolist-card";

const MEDIA_TTL_MS = 1000 * 60 * 60 * 36;
let schemaReady = false;

export class NotificationImageService {
  /**
   * Pre-render the todolist card and publish a fast static HTTPS URL.
   * OneSignal / Android download this when the user expands the notification,
   * so generation must happen BEFORE send — never on-demand during fetch.
   */
  public async createTodolistImageUrl(
    userId: string,
    dayKey: string,
    input: TodolistCardInput,
  ): Promise<string | null> {
    try {
      const image = await renderTodolistCardImage(input);
      const blobUrl = await this.uploadToBlob(userId, dayKey, image.buffer, image.contentType, image.extension);
      if (blobUrl) return blobUrl;
      return await this.storeInDatabase(image.buffer, image.contentType);
    } catch (error) {
      console.error("[notification-image] failed to publish todolist card:", error);
      return null;
    }
  }

  public async renderCardPng(input: TodolistCardInput): Promise<Buffer> {
    const image = await renderTodolistCardImage(input);
    return image.buffer;
  }

  public async getMedia(id: string): Promise<{ bytes: Buffer; contentType: string } | null> {
    await this.ensureSchema();
    const db = NeonDatabase.createClient();
    const rows = await db<Array<{ content_type: string; data_base64: string; expires_at: string }>>`
      select content_type, data_base64, expires_at
      from notification_media
      where id = ${id}::uuid
      limit 1
    `;
    const row = rows[0];
    if (!row) return null;
    if (new Date(row.expires_at).getTime() < Date.now()) {
      await db`delete from notification_media where id = ${id}::uuid`;
      return null;
    }
    return {
      bytes: Buffer.from(row.data_base64, "base64"),
      contentType: row.content_type || "image/jpeg",
    };
  }

  private async uploadToBlob(
    userId: string,
    dayKey: string,
    buffer: Buffer,
    contentType: string,
    extension: string,
  ): Promise<string | null> {
    const token = Env.get("BLOB_READ_WRITE_TOKEN");
    if (!token) return null;

    try {
      const blob = await put(
        `notifications/todolist/${userId}/${dayKey}.${extension}`,
        buffer,
        {
          access: "public",
          contentType,
          token,
          addRandomSuffix: true,
          allowOverwrite: false,
          cacheControlMaxAge: 60 * 60 * 24,
        },
      );
      return blob.url;
    } catch (error) {
      console.error("[notification-image] blob upload failed:", error);
      return null;
    }
  }

  private async storeInDatabase(buffer: Buffer, contentType: string): Promise<string | null> {
    const origin = AppUrls.getOrigin();
    if (!origin) {
      console.warn("[notification-image] missing AppUrls origin for media URL");
      return null;
    }

    await this.ensureSchema();
    const db = NeonDatabase.createClient();
    const id = randomUUID();
    const expiresAt = new Date(Date.now() + MEDIA_TTL_MS).toISOString();
    await db`
      insert into notification_media (id, content_type, data_base64, expires_at)
      values (${id}::uuid, ${contentType}, ${buffer.toString("base64")}, ${expiresAt}::timestamptz)
    `;

    // Best-effort cleanup of expired rows (keeps table small).
    void db`delete from notification_media where expires_at < now()`.catch(() => undefined);

    return `${origin}/api/notifications/media/${id}`;
  }

  private async ensureSchema(): Promise<void> {
    if (schemaReady) return;
    const db = NeonDatabase.createClient();
    await db`
      create table if not exists notification_media (
        id uuid primary key default gen_random_uuid(),
        content_type text not null default 'image/jpeg',
        data_base64 text not null,
        created_at timestamptz not null default now(),
        expires_at timestamptz not null
      )
    `;
    await db`
      create index if not exists notification_media_expires_at_idx
        on notification_media (expires_at)
    `;
    schemaReady = true;
  }
}
