import type Database from "@tauri-apps/plugin-sql";

// Copy the persisted message, not the possibly stale UI preview. Preserve the
// original author snapshot when forwarding an already forwarded message.
export const FORWARD_MESSAGE_SQL = `
  INSERT INTO messages (
    chat_id, author_id, type, body, attachment,
    forwarded_author_name, forwarded_created_at
  )
  SELECT
    $1, $2, source.type, source.body, source.attachment,
    COALESCE(source.forwarded_author_name, author.display_name),
    COALESCE(source.forwarded_created_at, source.created_at)
  FROM messages AS source
  INNER JOIN users AS author ON author.id = source.author_id
  INNER JOIN chats AS destination ON destination.id = $1
  INNER JOIN users AS sender ON sender.id = $2
  INNER JOIN chat_members AS destination_member
    ON destination_member.chat_id = destination.id AND destination_member.user_id = $2
  INNER JOIN chat_members AS source_member
    ON source_member.chat_id = source.chat_id AND source_member.user_id = $2
  WHERE source.id = $3
    AND (destination.kind = 'chat' OR (destination.owner_id = $2 AND destination_member.role = 'owner'))
`;

export async function forwardMessage(
  db: Pick<Database, "execute">,
  messageId: number,
  destinationChatId: number,
  senderId: number,
): Promise<void> {
  for (const id of [messageId, destinationChatId, senderId]) {
    if (!Number.isSafeInteger(id) || id <= 0) {
      throw new Error("Некорректный идентификатор пересылки.");
    }
  }

  const result = await db.execute(FORWARD_MESSAGE_SQL, [
    destinationChatId,
    senderId,
    messageId,
  ]);
  if (result.rowsAffected !== 1) {
    throw new Error("Сообщение, чат или пользователь больше не существует.");
  }
}
