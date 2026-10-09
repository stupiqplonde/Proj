import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { addComment, joinChannel, loadChannelInteractions, toggleReaction } from "../src/services/channels.ts";
import { forwardMessage } from "../src/services/forwardMessage.ts";
import { generateInviteCode, normalizeInviteCode } from "../src/services/inviteCode.ts";

function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const migrations = new URL("../src-tauri/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter(n => n.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(name, migrations), "utf8"));
  }
  sqlite.prepare("INSERT INTO chats (id, title, kind, owner_id, invite_code) VALUES (4, 'Новости', 'channel', 1, 'ABCD2345')").run();
  sqlite.prepare("INSERT INTO chat_members (chat_id, user_id, role) VALUES (4, 1, 'owner')").run();
  const db = {
    async select(query, values = []) {
      const statement = sqlite.prepare(query);
      return values.length ? statement.all(Object.fromEntries(values.map((v, i) => [`$${i + 1}`, v]))) : statement.all();
    },
    async execute(query, values = []) {
      const statement = sqlite.prepare(query);
      const result = values.length ? statement.run(Object.fromEntries(values.map((v, i) => [`$${i + 1}`, v]))) : statement.run();
      return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
    },
  };
  return { sqlite, db };
}

test("invite codes are readable and normalize pasted input", () => {
  for (let i = 0; i < 100; i++) assert.match(generateInviteCode(), /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
  assert.equal(normalizeInviteCode("  abcd-2345 \n"), "ABCD2345");
});

test("upgrading an existing database preserves chats, memberships and messages", () => {
  const sqlite = new DatabaseSync(":memory:");
  try {
    sqlite.exec("PRAGMA foreign_keys = ON");
    const directory = new URL("../src-tauri/migrations/", import.meta.url);
    const migrations = readdirSync(directory).filter(n => n.endsWith(".sql")).sort();
    for (const name of migrations.slice(0, 8)) sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
    sqlite.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (1, 1, 'Старая история')").run();
    for (const name of migrations.slice(8)) sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
    assert.equal(sqlite.prepare("SELECT body FROM messages").get().body, "Старая история");
    assert.equal(sqlite.prepare("SELECT kind FROM chats WHERE id = 1").get().kind, "chat");
    assert.equal(sqlite.prepare("SELECT role FROM chat_members WHERE chat_id = 1 AND user_id = 1").get().role, "member");
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chat_members").get().n, 9);
  } finally { sqlite.close(); }
});

test("joining is idempotent, preserves owner role and rejects invalid codes", async () => {
  const { sqlite, db } = fixture();
  try {
    assert.equal(await joinChannel(db, "abcd-2345", 2), 4);
    assert.equal(await joinChannel(db, "ABCD2345", 2), 4);
    await joinChannel(db, "ABCD2345", 1);
    const members = sqlite.prepare("SELECT user_id, role FROM chat_members WHERE chat_id = 4 ORDER BY user_id").all();
    assert.deepEqual(members.map(m => [m.user_id, m.role]), [[1, "owner"], [2, "member"]]);
    await assert.rejects(joinChannel(db, "BAD", 3), /8 символов/);
    await assert.rejects(joinChannel(db, "ZZZZ9999", 3), /не найден/);
    for (const userId of [0, -1, 1.5, NaN, Number.MAX_SAFE_INTEGER + 1]) {
      await assert.rejects(joinChannel(db, "ABCD2345", userId), /пользователь/);
    }
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chat_members WHERE chat_id = 4").get().n, 2);
  } finally { sqlite.close(); }
});

test("joining does not open a channel removed during the request", async () => {
  const { sqlite, db } = fixture();
  try {
    const database = {
      select: db.select,
      async execute(query, values) {
        const result = await db.execute(query, values);
        sqlite.prepare("DELETE FROM chats WHERE id = 4").run();
        return result;
      },
    };
    await assert.rejects(joinChannel(database, "ABCD2345", 2), /не найден/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chat_members WHERE chat_id = 4").get().n, 0);
  } finally { sqlite.close(); }
});

test("only owners publish text, images and forwarded posts; chats still work", async () => {
  const { sqlite, db } = fixture();
  try {
    await joinChannel(db, "ABCD2345", 2);
    const post = sqlite.prepare("INSERT INTO messages (chat_id, author_id, type, body) VALUES (4, 1, 'text', 'Пост')").run();
    for (const type of ["text", "image"]) {
      assert.throws(() => sqlite.prepare("INSERT INTO messages (chat_id, author_id, type) VALUES (4, 2, ?)").run(type), /owner/);
    }
    assert.throws(() => sqlite.prepare("UPDATE messages SET author_id = 2 WHERE id = ?").run(post.lastInsertRowid), /owner/);
    const source = sqlite.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (1, 2, 'В чате')").run();
    await assert.rejects(forwardMessage(db, Number(source.lastInsertRowid), 4, 2));
    await forwardMessage(db, Number(source.lastInsertRowid), 4, 1);
    await forwardMessage(db, Number(post.lastInsertRowid), 1, 2);
    await assert.rejects(forwardMessage(db, Number(post.lastInsertRowid), 1, 3));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM messages WHERE chat_id = 4").get().n, 2);
  } finally { sqlite.close(); }
});

test("members react and comment; interactions reload and cascade on post deletion", async () => {
  const { sqlite, db } = fixture();
  try {
    await joinChannel(db, "ABCD2345", 2);
    const post = sqlite.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (4, 1, 'Пост')").run();
    const id = Number(post.lastInsertRowid);
    await toggleReaction(db, id, 1, "👍");
    await toggleReaction(db, id, 2, "👍");
    await addComment(db, id, 2, "  Комментарий  ");
    let state = await loadChannelInteractions(db, 4, 2);
    assert.equal(state.reactions[0].count, 2);
    assert.equal(state.reactions[0].reacted_by_me, true);
    assert.equal(state.comments[0].body, "Комментарий");
    assert.equal(state.comments[0].author_name, "Кирилл");
    await toggleReaction(db, id, 2, "👍");
    state = await loadChannelInteractions(db, 4, 2);
    assert.equal(state.reactions[0].count, 1);
    assert.equal(state.reactions[0].reacted_by_me, false);
    await assert.rejects(toggleReaction(db, id, 3, "👍"), /members/);
    await assert.rejects(addComment(db, id, 3, "Чужой"), /members/);
    await assert.rejects(addComment(db, id, 2, "  "));
    await assert.rejects(addComment(db, id, 2, "a".repeat(2001)));
    sqlite.prepare("DELETE FROM messages WHERE id = ?").run(id);
    state = await loadChannelInteractions(db, 4, 2);
    assert.equal(state.reactions.length, 0);
    assert.equal(state.comments.length, 0);
  } finally { sqlite.close(); }
});
