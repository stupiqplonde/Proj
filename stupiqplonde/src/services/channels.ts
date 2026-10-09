import type Database from "@tauri-apps/plugin-sql";
import type { MessageComment, ReactionSummary } from "../types/message";
import { normalizeInviteCode } from "./inviteCode.ts";

type ChannelDatabase = Pick<Database, "select" | "execute">;

export const JOIN_CHANNEL_SQL = `
  INSERT INTO chat_members (chat_id, user_id, role)
  SELECT id, $1, CASE WHEN owner_id = $1 THEN 'owner' ELSE 'member' END
  FROM chats WHERE kind = 'channel' AND invite_code = $2
  ON CONFLICT(chat_id, user_id) DO NOTHING
`;

export async function joinChannel(db: ChannelDatabase, rawCode: string, userId: number): Promise<number> {
  if (!Number.isSafeInteger(userId) || userId <= 0) {
    throw new Error("Некорректный пользователь.");
  }
  const code = normalizeInviteCode(rawCode);
  if (!/^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/.test(code)) {
    throw new Error("Код приглашения должен содержать 8 символов.");
  }
  await db.execute(JOIN_CHANNEL_SQL, [userId, code]);
  // Открываем канал только после того, как пользователь стал участником.
  const channels = await db.select<{ id: number }[]>(`
    SELECT chats.id FROM chats
    INNER JOIN chat_members ON chat_members.chat_id = chats.id
    WHERE chats.kind = 'channel' AND chats.invite_code = $1 AND chat_members.user_id = $2
  `, [code, userId]);
  if (!channels[0]) throw new Error("Канал с таким кодом не найден.");
  return channels[0].id;
}

export async function loadChannelInteractions(db: ChannelDatabase, chatId: number, userId: number) {
  const reactions = await db.select<(ReactionSummary & { message_id: number })[]>(`
    SELECT r.message_id, r.emoji, COUNT(*) AS count,
      MAX(CASE WHEN r.user_id = $2 THEN 1 ELSE 0 END) AS reacted_by_me
    FROM message_reactions r JOIN messages m ON m.id = r.message_id
    WHERE m.chat_id = $1 GROUP BY r.message_id, r.emoji ORDER BY r.emoji
  `, [chatId, userId]);
  const comments = await db.select<MessageComment[]>(`
    SELECT c.id, c.message_id, c.author_id, u.display_name AS author_name, c.body, c.created_at
    FROM message_comments c JOIN messages m ON m.id = c.message_id
    JOIN users u ON u.id = c.author_id
    WHERE m.chat_id = $1 ORDER BY c.id
  `, [chatId]);
  return { reactions: reactions.map(r => ({ ...r, reacted_by_me: Boolean(r.reacted_by_me) })), comments };
}

export const REACTION_EMOJIS = ["👍", "❤️", "🔥", "👏", "😂"];

export async function toggleReaction(db: ChannelDatabase, messageId: number, userId: number, emoji: string) {
  if (!REACTION_EMOJIS.includes(emoji)) throw new Error("Неизвестная реакция.");
  const existing = await db.select<{ user_id: number }[]>(
    "SELECT user_id FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3",
    [messageId, userId, emoji],
  );
  await db.execute(existing.length
    ? "DELETE FROM message_reactions WHERE message_id = $1 AND user_id = $2 AND emoji = $3"
    : "INSERT INTO message_reactions (message_id, user_id, emoji) VALUES ($1, $2, $3)",
  [messageId, userId, emoji]);
}

export async function addComment(db: ChannelDatabase, messageId: number, userId: number, body: string) {
  const clean = body.trim();
  if (!clean || clean.length > 2000) throw new Error("Комментарий должен содержать от 1 до 2000 символов.");
  await db.execute(
    "INSERT INTO message_comments (message_id, author_id, body) VALUES ($1, $2, $3)",
    [messageId, userId, clean],
  );
}
