import { TelegramService } from "@/services/telegram.service";

interface TelegramMessageInput {
  telegramId: string;
  title: string;
  subtopic: string;
  dueDate: string | null;
  assignee: string;
}

export class NotificationService {
  private telegram = new TelegramService();

  public async sendTaskAssignedMessage(input: TelegramMessageInput): Promise<void> {
    if (!this.telegram.hasToken()) return;
    try {
      await this.telegram.sendTaskAssigned({
        chatId: input.telegramId,
        title: input.title,
        subtopic: input.subtopic,
        dueDate: input.dueDate,
        assignee: input.assignee,
      });
    } catch {
      return;
    }
  }
}
