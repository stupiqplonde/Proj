export interface Attachment {
  kind: "image" | "file";
  name: string;
  data: string;
}

export interface Message {
  id: number;
  conversation_id: number;
  author: string;
  body: string;
  created_at: string;
  reply_to_id: number | null;
  edited_at: string | null;
  deleted: number;
  forwarded_from: string | null;
  attachment: Attachment | null;
}

export interface Reaction {
  id: number;
  message_id: number;
  author: string;
  emoji: string;
}

export interface ReactionGroup {
  emoji: string;
  count: number;
  mine: boolean;
  authors: string[];
}

export interface MessageView extends Message {
  reply: Message | null;
  reactions: ReactionGroup[];
  seen: boolean;
}
