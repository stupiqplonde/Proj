-- A separate migration also upgrades databases where version 9 was already run.
CREATE TRIGGER channel_post_insert
BEFORE INSERT ON messages
WHEN EXISTS (SELECT 1 FROM chats WHERE id = NEW.chat_id AND kind = 'channel')
 AND NOT EXISTS (
    SELECT 1 FROM chats JOIN chat_members ON chat_members.chat_id = chats.id
    WHERE chats.id = NEW.chat_id AND chats.owner_id = NEW.author_id
      AND chat_members.user_id = NEW.author_id AND chat_members.role = 'owner'
 )
BEGIN
    SELECT RAISE(ABORT, 'Only the channel owner can publish posts');
END;

CREATE TRIGGER channel_post_update
BEFORE UPDATE ON messages
WHEN EXISTS (SELECT 1 FROM chats WHERE id = NEW.chat_id AND kind = 'channel')
 AND NOT EXISTS (
    SELECT 1 FROM chats JOIN chat_members ON chat_members.chat_id = chats.id
    WHERE chats.id = NEW.chat_id AND chats.owner_id = NEW.author_id
      AND chat_members.user_id = NEW.author_id AND chat_members.role = 'owner'
 )
BEGIN
    SELECT RAISE(ABORT, 'Only the channel owner can publish posts');
END;

CREATE TRIGGER channel_reaction_insert
BEFORE INSERT ON message_reactions
WHEN NOT EXISTS (
    SELECT 1 FROM messages JOIN chats ON chats.id = messages.chat_id
    JOIN chat_members ON chat_members.chat_id = chats.id
    WHERE messages.id = NEW.message_id AND chats.kind = 'channel'
      AND chat_members.user_id = NEW.user_id
)
BEGIN
    SELECT RAISE(ABORT, 'Only channel members can react');
END;

CREATE TRIGGER channel_comment_insert
BEFORE INSERT ON message_comments
WHEN trim(NEW.body) = '' OR NOT EXISTS (
    SELECT 1 FROM messages JOIN chats ON chats.id = messages.chat_id
    JOIN chat_members ON chat_members.chat_id = chats.id
    WHERE messages.id = NEW.message_id AND chats.kind = 'channel'
      AND chat_members.user_id = NEW.author_id
)
BEGIN
    SELECT RAISE(ABORT, 'Only channel members can comment with nonempty text');
END;
