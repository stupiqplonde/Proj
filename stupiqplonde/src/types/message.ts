// Ключевое слово export
// Разрешает другим файлам испортить его
export interface Message {
  id: number;
  chat_id: number;
  author_id: number;
  author_name: string;
  author_avatar: string | null;
  type: "text" | "image";
  body: string | null;
  attachment: string | null;
  created_at: string;
  edited_at: string | null;
  forwarded_author_name: string | null;
  forwarded_created_at: string | null;
}

export interface ReactionSummary {
  emoji: string;
  count: number;
  reacted_by_me: boolean;
}

export interface MessageComment {
  id: number;
  message_id: number;
  author_id: number;
  author_name: string;
  body: string;
  created_at: string;
}

/** Пост канала = сообщение + реакции и комментарии */
export interface ChannelPost extends Message {
  reactions: ReactionSummary[];
  comments: MessageComment[];
}

export interface MessageEdit {
  id: number;
  body: string;
}

export interface MessageDelete {
  id: number;
}
