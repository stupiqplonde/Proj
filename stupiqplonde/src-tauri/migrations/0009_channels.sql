ALTER TABLE chats ADD COLUMN kind TEXT NOT NULL DEFAULT 'chat';
ALTER TABLE chats ADD COLUMN owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE chats ADD COLUMN invite_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_chats_invite_code
ON chats(invite_code)
WHERE invite_code IS NOT NULL;

ALTER TABLE chat_members ADD COLUMN role TEXT NOT NULL DEFAULT 'member';

CREATE TABLE IF NOT EXISTS message_reactions (
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (message_id, user_id, emoji)
);

CREATE INDEX IF NOT EXISTS idx_message_reactions_message
ON message_reactions(message_id);

CREATE TABLE IF NOT EXISTS message_comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    message_id INTEGER NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
    author_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_message_comments_message
ON message_comments(message_id);
