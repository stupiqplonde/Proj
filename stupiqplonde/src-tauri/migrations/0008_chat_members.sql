CREATE TABLE IF NOT EXISTS chat_members (
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    PRIMARY KEY (chat_id, user_id)
);

INSERT OR IGNORE INTO chat_members (chat_id, user_id)
SELECT chats.id, users.id
FROM chats
CROSS JOIN users;
