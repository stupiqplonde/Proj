// ключевое слово export
// разрешвет другим файлам ипортировать его
export interface Message{
    id: number;
    author: string;
    type: 'text' | 'image';
    body: string | null;
    attachments: string | null;
    created_at: string;
}