export interface Chat{
    id: number;
    title: string;
    subtitle: string;
    unread_count: number;
}

export interface CreateChat{
    title: string;
    subtitle: string;
    memberIds: number[];
}