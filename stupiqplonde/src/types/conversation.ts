export interface Conversation {
  id: number;
  title: string;
  subtitle: string;
  created_at: string;
  pinned_message_id: number | null;
  muted: number;
  pinned: number;
  archived: number;
}

export interface ConversationPreview extends Conversation {
  lastBody: string;
  lastAt: string;
  lastAuthor: string;
  unread: number;
  draft: string;
  typing: boolean;
  color: string;
}
