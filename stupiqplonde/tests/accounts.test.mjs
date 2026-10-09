import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { initializeAccounts, loginAccount, registerAccount, changePassword } from "../src/services/accounts.ts";

function database(){
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const directory = new URL("../src-tauri/migrations/", import.meta.url);
  for (const name of readdirSync(directory).filter(name => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
  }
  const db = {
    async select(query, values = []) {
      const statement = sqlite.prepare(query);
      return values.length ? statement.all(Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]))) : statement.all();
    },
    async execute(query, values = []) {
      const statement = sqlite.prepare(query);
      const result = values.length ? statement.run(Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]))) : statement.run();
      return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
    },
  };
  return { sqlite, db };
}

test("existing profiles share user credentials without losing chats or usernames", async () => {
  const { sqlite, db } = database();
  try {
    await initializeAccounts(db);
    const users = await loginAccount(db, { login: " USER ", password: "123456" });
    assert.deepEqual(users.map(user => user.username), ["oleg", "kirill228", "misha67"]);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chat_members").get().n, 9);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chats").get().n, 3);
    assert.equal(users[0].password_hash, undefined);
    assert.notEqual(sqlite.prepare("SELECT password_hash FROM users WHERE id = 1").get().password_hash, "123456");
    await assert.rejects(loginAccount(db, { login: "user", password: "incorrect" }), /Неверный/);
    await assert.rejects(loginAccount(db, { login: "unknown", password: "123456" }), /Неверный/);
  } finally { sqlite.close(); }
});

test("registration creates a separate account and survives initialization again", async () => {
  const { sqlite, db } = database();
  try {
    await initializeAccounts(db);
    const user = await registerAccount(db, { login: " new_user ", password: "new-password", displayName: "  Анна  " });
    assert.equal(user.display_name, "Анна");
    assert.equal(user.username, "new_user");
    assert.equal(user.password_salt, undefined);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chat_members WHERE user_id = ?").get(user.id).n, 0);
    await initializeAccounts(db);
    assert.equal((await loginAccount(db, { login: "new_user", password: "new-password" }))[0].id, user.id);
    await assert.rejects(loginAccount(db, { login: "new_user", password: "123456" }), /Неверный/);
    await assert.rejects(registerAccount(db, { login: "new_user", password: "new-password", displayName: "Другой" }), /занят/);
    await assert.rejects(registerAccount(db, { login: "user", password: "123456", displayName: "Другой" }), /занят/);
    await assert.rejects(registerAccount(db, { login: "oleg", password: "123456", displayName: "Другой" }), /занят/);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM users").get().n, 4);
  } finally { sqlite.close(); }
});

test("invalid registration does not save users", async () => {
  const { sqlite, db } = database();
  try {
    await initializeAccounts(db);
    for (const payload of [
      { login: "ab", password: "123456", displayName: "Имя" },
      { login: "новый", password: "123456", displayName: "Имя" },
      { login: "new_user", password: "123", displayName: "Имя" },
      { login: "new_user", password: "123456", displayName: "   " },
    ]) await assert.rejects(registerAccount(db, payload));
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM users").get().n, 3);
  } finally { sqlite.close(); }
});

test("password changes affect only the selected profile and are not reset at startup", async () => {
  const { sqlite, db } = database();
  try {
    await initializeAccounts(db);
    await assert.rejects(changePassword(db, 1, "wrong", "new-password"), /неверный/);
    await assert.rejects(changePassword(db, 1, "123456", "short"), /6 до 128/);
    await changePassword(db, 1, "123456", "new-password");
    await initializeAccounts(db);
    assert.deepEqual((await loginAccount(db, { login: "user", password: "123456" })).map(user => user.id), [2, 3]);
    assert.deepEqual((await loginAccount(db, { login: "user", password: "new-password" })).map(user => user.id), [1]);
  } finally { sqlite.close(); }
});
