import Database from "@tauri-apps/plugin-sql";
import type { Conversation } from "../types/conversation";
import type { Attachment, Message, Reaction } from "../types/messages";

const MEMORY_KEY = "stupiqplonde-messenger-v3";

const DEFAULT_CHATS: Conversation[] = [
  {
    id: 1,
    title: "Oleg · Kirill",
    subtitle: "Личные сообщения",
    created_at: "2026-09-10 09:00:00",
    pinned_message_id: null,
    muted: 0,
    pinned: 1,
    archived: 0,
  },
  {
    id: 2,
    title: "Студия",
    subtitle: "Дизайн, сборка, ревью",
    created_at: "2026-09-10 09:01:00",
    pinned_message_id: null,
    muted: 0,
    pinned: 0,
    archived: 0,
  },
  {
    id: 3,
    title: "Избранное",
    subtitle: "Черновики и идеи",
    created_at: "2026-09-10 09:02:00",
    pinned_message_id: null,
    muted: 0,
    pinned: 0,
    archived: 0,
  },
];

export interface ReadState {
  conversation_id: number;
  user_name: string;
  last_read_id: number;
}

interface MemoryState {
  conversations: Conversation[];
  messages: Message[];
  reactions: Reaction[];
  reads: ReadState[];
  nextMessageId: number;
  nextReactionId: number;
  nextConversationId: number;
}

function nowSql(): string {
  return new Date().toISOString().slice(0, 19).replace("T", " ");
}

function parseAttachment(raw: unknown): Attachment | null {
  if (!raw) return null;
  if (typeof raw === "object") return raw as Attachment;
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw) as Attachment;
  } catch {
    return null;
  }
}

function serializeAttachment(attachment: Attachment | null): string | null {
  return attachment ? JSON.stringify(attachment) : null;
}

function flag(value: unknown): number {
  return Number(value) ? 1 : 0;
}

function emptyChat(partial: Partial<Conversation> & { id: number; title: string }): Conversation {
  return {
    id: Number(partial.id),
    title: String(partial.title ?? "Чат"),
    subtitle: String(partial.subtitle ?? ""),
    created_at: String(partial.created_at ?? nowSql()),
    pinned_message_id:
      partial.pinned_message_id == null ? null : Number(partial.pinned_message_id),
    muted: flag(partial.muted),
    pinned: flag(partial.pinned),
    archived: flag(partial.archived),
  };
}

function emptyMessage(
  row: Partial<Message> & { id: number; author: string; body: string },
): Message {
  return {
    id: Number(row.id),
    conversation_id: Number(row.conversation_id ?? 1),
    author: row.author,
    body: row.body,
    created_at: String(row.created_at ?? nowSql()),
    reply_to_id: row.reply_to_id == null ? null : Number(row.reply_to_id),
    edited_at: row.edited_at ?? null,
    deleted: Number(row.deleted ?? 0),
    forwarded_from: row.forwarded_from ?? null,
    attachment: parseAttachment(row.attachment),
  };
}

function seedMemory(): MemoryState {
  return {
    conversations: DEFAULT_CHATS.map((chat) => ({ ...chat })),
    messages: [
      {
        id: 1,
        conversation_id: 1,
        author: "Kirill",
        body: "Привет. Давай соберём мессенджер как в Telegram?",
        created_at: "2026-09-10 09:10:00",
        reply_to_id: null,
        edited_at: null,
        deleted: 0,
        forwarded_from: null,
        attachment: null,
      },
      {
        id: 2,
        conversation_id: 1,
        author: "Oleg",
        body: "Да. Чаты слева, ответы, реакции, вложения и непрочитанные.",
        created_at: "2026-09-10 09:11:00",
        reply_to_id: 1,
        edited_at: null,
        deleted: 0,
        forwarded_from: null,
        attachment: null,
      },
      {
        id: 3,
        conversation_id: 2,
        author: "Oleg",
        body: "Скинул макет шапки. Завтра смотрим анимации.",
        created_at: "2026-09-10 09:20:00",
        reply_to_id: null,
        edited_at: null,
        deleted: 0,
        forwarded_from: null,
        attachment: null,
      },
    ],
    reactions: [{ id: 1, message_id: 2, author: "Kirill", emoji: "👍" }],
    reads: [],
    nextMessageId: 4,
    nextReactionId: 2,
    nextConversationId: 4,
  };
}

function loadMemory(): MemoryState {
  try {
    const raw = localStorage.getItem(MEMORY_KEY);
    if (!raw) return seedMemory();
    const parsed = JSON.parse(raw) as MemoryState;
    if (!parsed.conversations?.length) return seedMemory();
    parsed.conversations = parsed.conversations.map((chat) => emptyChat(chat));
    parsed.messages = parsed.messages.map((message) => emptyMessage(message));
    return parsed;
  } catch {
    return seedMemory();
  }
}

function saveMemory(state: MemoryState) {
  localStorage.setItem(MEMORY_KEY, JSON.stringify(state));
}

export class MessengerStore {
  private db: Database | null = null;
  private memory = loadMemory();
  mode: "sql" | "local" = "local";

  async init(): Promise<string> {
    try {
      this.db = await Database.load("sqlite:messanger.db");
      this.mode = "sql";
      await this.ensureSqlSeed();
      return "История в SQLite";
    } catch (error) {
      console.warn("SQLite недоступен, используем локальное хранилище", error);
      this.db = null;
      this.mode = "local";
      return "История в браузере";
    }
  }

  private async ensureSqlSeed() {
    if (!this.db) return;
    const existing = await this.db.select<{ id: number }[]>(
      "SELECT id FROM conversations LIMIT 1",
    );
    if (existing.length === 0) {
      await this.db.execute(
        "INSERT INTO conversations (id, title, subtitle, pinned) VALUES (1, 'Oleg · Kirill', 'Личные сообщения', 1), (2, 'Студия', 'Дизайн, сборка, ревью', 0), (3, 'Избранное', 'Черновики и идеи', 0)",
      );
    }
  }

  async listConversations(): Promise<Conversation[]> {
    if (this.db) {
      try {
        const rows = await this.db.select<Conversation[]>(
          "SELECT id, title, subtitle, created_at, pinned_message_id, muted, pinned, archived FROM conversations ORDER BY id ASC",
        );
        return rows.map((row) => emptyChat(row));
      } catch {
        const rows = await this.db.select<Conversation[]>(
          "SELECT id, title, subtitle, created_at FROM conversations ORDER BY id ASC",
        );
        return rows.map((row) => emptyChat(row));
      }
    }
    return this.memory.conversations.map((item) => ({ ...item }));
  }

  async listMessages(): Promise<Message[]> {
    if (this.db) {
      try {
        const rows = await this.db.select<(Message & { attachment: string | null })[]>(
          "SELECT id, author, body, created_at, conversation_id, reply_to_id, edited_at, deleted, forwarded_from, attachment FROM messages ORDER BY id ASC",
        );
        return rows.map((row) => emptyMessage(row));
      } catch {
        const rows = await this.db.select<Message[]>(
          "SELECT id, author, body, created_at FROM messages ORDER BY id ASC",
        );
        return rows.map((row) => emptyMessage(row));
      }
    }
    return this.memory.messages.map((item) => ({ ...item }));
  }

  async listReactions(): Promise<Reaction[]> {
    if (this.db) {
      try {
        return await this.db.select<Reaction[]>(
          "SELECT id, message_id, author, emoji FROM reactions",
        );
      } catch {
        return [];
      }
    }
    return this.memory.reactions.map((item) => ({ ...item }));
  }

  async listReads(): Promise<ReadState[]> {
    if (this.db) {
      try {
        return await this.db.select<ReadState[]>(
          "SELECT conversation_id, user_name, last_read_id FROM conversation_reads",
        );
      } catch {
        return [];
      }
    }
    return this.memory.reads.map((item) => ({ ...item }));
  }

  async sendMessage(input: {
    author: string;
    body: string;
    conversationId: number;
    replyToId?: number | null;
    forwardedFrom?: string | null;
    attachment?: Attachment | null;
  }): Promise<void> {
    const replyToId = input.replyToId ?? null;
    const forwardedFrom = input.forwardedFrom ?? null;
    const attachment = input.attachment ?? null;
    if (this.db) {
      try {
        await this.db.execute(
          "INSERT INTO messages (author, body, conversation_id, reply_to_id, forwarded_from, attachment) VALUES ($1, $2, $3, $4, $5, $6)",
          [
            input.author,
            input.body,
            input.conversationId,
            replyToId,
            forwardedFrom,
            serializeAttachment(attachment),
          ],
        );
        return;
      } catch {
        await this.db.execute("INSERT INTO messages (author, body) VALUES ($1, $2)", [
          input.author,
          input.body,
        ]);
        return;
      }
    }

    this.memory.messages.push({
      id: this.memory.nextMessageId++,
      conversation_id: input.conversationId,
      author: input.author,
      body: input.body,
      created_at: nowSql(),
      reply_to_id: replyToId,
      edited_at: null,
      deleted: 0,
      forwarded_from: forwardedFrom,
      attachment,
    });
    saveMemory(this.memory);
  }

  async editMessage(id: number, body: string): Promise<void> {
    const editedAt = nowSql();
    if (this.db) {
      try {
        await this.db.execute(
          "UPDATE messages SET body = $1, edited_at = $2 WHERE id = $3",
          [body, editedAt, id],
        );
        return;
      } catch {
        await this.db.execute("UPDATE messages SET body = $1 WHERE id = $2", [body, id]);
        return;
      }
    }
    const message = this.memory.messages.find((item) => item.id === id);
    if (message && message.deleted === 0) {
      message.body = body;
      message.edited_at = editedAt;
      saveMemory(this.memory);
    }
  }

  async deleteMessage(id: number): Promise<void> {
    if (this.db) {
      try {
        await this.db.execute(
          "UPDATE messages SET deleted = 1, body = '', attachment = NULL WHERE id = $1",
          [id],
        );
        return;
      } catch {
        await this.db.execute("DELETE FROM messages WHERE id = $1", [id]);
        return;
      }
    }
    const message = this.memory.messages.find((item) => item.id === id);
    if (message) {
      message.deleted = 1;
      message.body = "";
      message.attachment = null;
      saveMemory(this.memory);
    }
  }

  async toggleReaction(messageId: number, author: string, emoji: string): Promise<void> {
    if (this.db) {
      const existing = await this.db
        .select<{ id: number }[]>(
          "SELECT id FROM reactions WHERE message_id = $1 AND author = $2 AND emoji = $3",
          [messageId, author, emoji],
        )
        .catch(() => []);
      if (existing.length) {
        await this.db.execute("DELETE FROM reactions WHERE id = $1", [existing[0].id]);
      } else {
        await this.db.execute(
          "INSERT INTO reactions (message_id, author, emoji) VALUES ($1, $2, $3)",
          [messageId, author, emoji],
        );
      }
      return;
    }

    const index = this.memory.reactions.findIndex(
      (item) =>
        item.message_id === messageId && item.author === author && item.emoji === emoji,
    );
    if (index >= 0) {
      this.memory.reactions.splice(index, 1);
    } else {
      this.memory.reactions.push({
        id: this.memory.nextReactionId++,
        message_id: messageId,
        author,
        emoji,
      });
    }
    saveMemory(this.memory);
  }

  async markRead(conversationId: number, userName: string, lastReadId: number): Promise<void> {
    if (this.db) {
      try {
        await this.db.execute(
          "INSERT INTO conversation_reads (conversation_id, user_name, last_read_id) VALUES ($1, $2, $3) ON CONFLICT(conversation_id, user_name) DO UPDATE SET last_read_id = excluded.last_read_id",
          [conversationId, userName, lastReadId],
        );
      } catch (error) {
        console.warn("Не удалось сохранить прочтение", error);
      }
      return;
    }
    const row = this.memory.reads.find(
      (item) => item.conversation_id === conversationId && item.user_name === userName,
    );
    if (row) row.last_read_id = lastReadId;
    else {
      this.memory.reads.push({
        conversation_id: conversationId,
        user_name: userName,
        last_read_id: lastReadId,
      });
    }
    saveMemory(this.memory);
  }

  async pinMessage(conversationId: number, messageId: number | null): Promise<void> {
    if (this.db) {
      try {
        await this.db.execute(
          "UPDATE conversations SET pinned_message_id = $1 WHERE id = $2",
          [messageId, conversationId],
        );
      } catch (error) {
        console.warn("Не удалось закрепить сообщение", error);
      }
      return;
    }
    const chat = this.memory.conversations.find((item) => item.id === conversationId);
    if (chat) {
      chat.pinned_message_id = messageId;
      saveMemory(this.memory);
    }
  }

  async patchConversation(
    id: number,
    patch: Partial<Pick<Conversation, "muted" | "pinned" | "archived" | "title" | "subtitle">>,
  ): Promise<void> {
    if (this.db) {
      const current = (await this.listConversations()).find((item) => item.id === id);
      if (!current) return;
      const next = { ...current, ...patch };
      try {
        await this.db.execute(
          "UPDATE conversations SET muted = $1, pinned = $2, archived = $3, title = $4, subtitle = $5 WHERE id = $6",
          [next.muted, next.pinned, next.archived, next.title, next.subtitle, id],
        );
      } catch (error) {
        console.warn("Не удалось обновить чат", error);
      }
      return;
    }
    const chat = this.memory.conversations.find((item) => item.id === id);
    if (chat) {
      Object.assign(chat, patch);
      saveMemory(this.memory);
    }
  }

  async deleteConversation(id: number): Promise<void> {
    if (this.db) {
      await this.db.execute("DELETE FROM messages WHERE conversation_id = $1", [id]);
      await this.db.execute("DELETE FROM conversations WHERE id = $1", [id]);
      return;
    }
    this.memory.conversations = this.memory.conversations.filter((item) => item.id !== id);
    this.memory.messages = this.memory.messages.filter((item) => item.conversation_id !== id);
    saveMemory(this.memory);
  }

  async createConversation(title: string, subtitle: string): Promise<number> {
    if (this.db) {
      const result = await this.db.execute(
        "INSERT INTO conversations (title, subtitle) VALUES ($1, $2)",
        [title, subtitle],
      );
      return Number(result.lastInsertId ?? 0);
    }
    const id = this.memory.nextConversationId++;
    this.memory.conversations.push({
      id,
      title,
      subtitle,
      created_at: nowSql(),
      pinned_message_id: null,
      muted: 0,
      pinned: 0,
      archived: 0,
    });
    saveMemory(this.memory);
    return id;
  }
}
