ALTER TABLE conversations ADD COLUMN muted INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN pinned INTEGER NOT NULL DEFAULT 0;
ALTER TABLE conversations ADD COLUMN archived INTEGER NOT NULL DEFAULT 0;
ALTER TABLE messages ADD COLUMN attachment TEXT;

UPDATE conversations
SET title = 'Избранное', subtitle = 'Черновики и идеи'
WHERE id = 3 AND title = 'Заметки';
