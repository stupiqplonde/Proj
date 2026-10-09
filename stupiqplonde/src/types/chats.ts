export type ChatKind = "chat" | "channel";
export type MemberRole = "owner" | "member";

export interface Chat {
  id: number;
  title: string;
  subtitle: string;
  unread_count: number;
  kind: ChatKind;
  owner_id: number | null;
  invite_code: string | null;
  my_role: MemberRole;
}

export interface CreateChat {
  title: string;
  subtitle: string;
  memberIds: number[];
}

export interface CreateChannel {
  title: string;
  subtitle: string;
  memberIds: number[];
}
