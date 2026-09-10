CREATE TABLE IF NOT EXISTS conversations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  subtitle TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT OR IGNORE INTO conversations (id, title, subtitle) VALUES
  (1, 'Oleg · Kirill', 'Личные сообщения'),
  (2, 'Студия', 'Дизайн, сборка, ревью'),
  (3, 'Заметки', 'Черновики и идеи');

ALTER TABLE messages ADD COLUMN conversation_id INTEGER NOT NULL DEFAULT 1;
ALTER TABLE messages ADD COLUMN reply_to_id INTEGER;
ALTER TABLE messages ADD COLUMN edited_at TEXT;
ALTER TABLE messages ADD COLUMN deleted INTEGER NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS reactions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  message_id INTEGER NOT NULL,
  author TEXT NOT NULL,
  emoji TEXT NOT NULL,
  UNIQUE(message_id, author, emoji)
);

CREATE TABLE IF NOT EXISTS conversation_reads (
  conversation_id INTEGER NOT NULL,
  user_name TEXT NOT NULL,
  last_read_id INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY (conversation_id, user_name)
);
