// Ключевое слово export
// Разрешает другим файлам испортить его
export interface Message{
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

export interface MessageEdit{
    id: number;
    body: string;
}

export interface MessageDelete{
    id: number;
}
