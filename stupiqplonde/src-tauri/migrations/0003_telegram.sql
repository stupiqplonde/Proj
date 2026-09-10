ALTER TABLE conversations ADD COLUMN pinned_message_id INTEGER;
ALTER TABLE messages ADD COLUMN forwarded_from TEXT;
