CREATE TABLE IF NOT EXISTS chat_reads (
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    chat_id INTEGER NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
    last_read_message_id INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, chat_id)
);

INSERT OR IGNORE INTO chat_reads (user_id, chat_id, last_read_message_id)
SELECT
    users.id,
    chats.id,
    COALESCE(
        (
            SELECT MAX(messages.id)
            FROM messages
            WHERE messages.chat_id = chats.id
        ),
        0
    )
FROM users
CROSS JOIN chats;
