import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { createRequire } from "node:module";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import { runInNewContext } from "node:vm";
import { parse, compileScript } from "vue/compiler-sfc";
import ts from "typescript";
import * as channels from "../src/services/channels.ts";
import * as inviteCode from "../src/services/inviteCode.ts";
import * as forwarding from "../src/services/forwardMessage.ts";
import * as accounts from "../src/services/accounts.ts";

const require = createRequire(import.meta.url);
const { createRenderer, h, nextTick } = require("vue");

// Проверяем script setup настоящих компонентов без запуска окна Tauri.
function mount(filename, properties = {}, dependencies = {}) {
  const source = readFileSync(new URL(`../src/${filename}`, import.meta.url), "utf8");
  const { descriptor } = parse(source);
  const script = compileScript(descriptor, { id: filename });
  const { outputText } = ts.transpileModule(script.content, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const exports = {};
  runInNewContext(outputText, {
    exports,
    Error,
    console: { error() {} },
    require(id) {
      if (id in dependencies) return dependencies[id];
      if (id.endsWith(".vue")) return { default: {} };
      return require(id);
    },
  });
  const component = { ...exports.default, render: () => null };
  const renderer = createRenderer({
    createComment: text => ({ text }),
    insert() {},
    remove() {},
    parentNode: () => null,
    nextSibling: () => null,
  });
  const root = {};
  let props = { ...properties };
  let vnode;
  function update(values = {}) {
    props = { ...props, ...values };
    vnode = h(component, props);
    renderer.render(vnode, root);
  }
  update();
  return {
    state: vnode.component.proxy.$.setupState,
    update,
    close: () => renderer.render(null, root),
  };
}

async function settle() {
  await new Promise(resolve => setImmediate(resolve));
  await nextTick();
}

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON");
  const directory = new URL("../src-tauri/migrations/", import.meta.url);
  for (const name of readdirSync(directory).filter(name => name.endsWith(".sql")).sort()) {
    sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
  }
  function bindings(values) {
    return Object.fromEntries(values.map((value, index) => [`$${index + 1}`, value]));
  }
  const db = {
    async select(query, values = []) {
      const statement = sqlite.prepare(query);
      return values.length ? statement.all(bindings(values)) : statement.all();
    },
    async execute(query, values = []) {
      const statement = sqlite.prepare(query);
      const result = values.length ? statement.run(bindings(values)) : statement.run();
      return { rowsAffected: Number(result.changes), lastInsertId: Number(result.lastInsertRowid) };
    },
  };
  return { sqlite, db };
}

function mountApp(db, invoke = async () => {}, load = async () => db) {
  return mount("App.vue", {}, {
    "@tauri-apps/plugin-sql": { default: { load } },
    "@tauri-apps/api/core": { invoke },
    "./services/channels": channels,
    "./services/inviteCode": inviteCode,
    "./services/forwardMessage": forwarding,
    "./services/accounts": accounts,
  });
}

async function ready(app){
  const deadline = Date.now() + 3000;
  while (!app.state.authReady) {
    if (Date.now() > deadline) throw new Error(app.state.authError || "Аккаунты не загрузились");
    await new Promise(resolve => setTimeout(resolve, 10));
  }
}

async function signIn(app){
  await ready(app);
  await app.state.login({ login: "user", password: "123456" });
  await app.state.activateAccount(app.state.authCandidates[0]);
  await settle();
}

test("database startup exposes SQL plugin errors and supports retry without restarting", async () => {
  const { sqlite, db } = database();
  let attempts = 0;
  const app = mountApp(db, undefined, async () => {
    if (++attempts === 1) throw "migration 9 was previously applied but has been modified";
    return db;
  });
  try {
    await settle();
    assert.equal(app.state.authReady, false);
    assert.equal(app.state.isConnecting, false);
    assert.match(app.state.authError, /migration 9/);
    app.state.resetAuth();
    assert.match(app.state.authError, /migration 9/);
    await app.state.connectDatabase();
    assert.equal(app.state.authReady, true);
    assert.equal(app.state.authError, "");
    assert.equal(attempts, 2);
    await signIn(app);
    assert.equal(app.state.currentUser.id, 1);
  } finally { app.close(); sqlite.close(); }
});

test("composer preserves a failed draft and clears it only after saving", async () => {
  const sent = [];
  const composer = mount("components/MessageComposer.vue", {
    disabled: false, isChannel: true, error: "", submittedMessage: 0,
    onSend: body => sent.push(body),
  }, {
    "@tauri-apps/plugin-dialog": { open: async () => null },
    "@tauri-apps/api/core": { invoke: async () => "" },
  });
  try {
    composer.state.draft = "  Мой пост  ";
    composer.state.submitMessage();
    assert.deepEqual(sent, ["Мой пост"]);
    assert.equal(composer.state.draft, "  Мой пост  ");
    composer.update({ error: "Ошибка сохранения" });
    await nextTick();
    assert.equal(composer.state.draft, "  Мой пост  ");
    composer.update({ disabled: true });
    composer.state.submitMessage();
    assert.equal(sent.length, 1);
    composer.update({ disabled: false, error: "", submittedMessage: 1 });
    await nextTick();
    assert.equal(composer.state.draft, "");
  } finally { composer.close(); }
});

test("a saved channel can be loaded again without invoking creation twice", async () => {
  const { sqlite, db } = database();
  let creations = 0;
  let failRefresh = false;
  const select = db.select;
  db.select = async (query, values) => {
    if (failRefresh && query.includes("COUNT(messages.id)")) {
      failRefresh = false;
      throw new Error("Не удалось прочитать список");
    }
    return select(query, values);
  };
  const app = mountApp(db, async (command, { payload }) => {
    assert.equal(command, "create_channel");
    assert.equal(payload.ownerId, 1);
    assert.match(payload.inviteCode, /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{8}$/);
    creations += 1;
    const result = sqlite.prepare(
      "INSERT INTO chats (title, subtitle, kind, owner_id, invite_code) VALUES (?, ?, 'channel', ?, ?)",
    ).run(payload.title, payload.subtitle, payload.ownerId, payload.inviteCode);
    sqlite.prepare("INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, 1, 'owner')").run(result.lastInsertRowid);
    failRefresh = true;
    return Number(result.lastInsertRowid);
  });
  try {
    await signIn(app);
    app.state.openCreateChannel();
    await app.state.createChannel({ title: "Новости", subtitle: "Описание", memberIds: [] });
    assert.equal(app.state.isCreateChannelOpen, false);
    assert.equal(app.state.pendingChannelId, 4);
    assert.match(app.state.forwardNotice, /Канал сохранён/);
    assert.equal(app.state.isBusy, false);
    await app.state.retryChannel();
    assert.equal(app.state.activeChat.id, 4);
    assert.equal(app.state.activeChat.kind, "channel");
    assert.equal(app.state.canPublish, true);
    assert.equal(app.state.pendingChannelId, null);
    assert.equal(app.state.forwardNotice, "");
    assert.equal(creations, 1);
  } finally { app.close(); sqlite.close(); }
});

test("creation errors keep the dialog open for retry", async () => {
  const { sqlite, db } = database();
  const app = mountApp(db, async () => { throw "Не удалось добавить участников. Канал не создан."; });
  try {
    await signIn(app);
    app.state.openCreateChannel();
    await app.state.createChannel({ title: "Новости", subtitle: "", memberIds: [999] });
    assert.equal(app.state.isCreateChannelOpen, true);
    assert.equal(app.state.isBusy, false);
    assert.match(app.state.createChannelError, /Канал не создан/);
    assert.equal(app.state.pendingChannelId, null);
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM chats WHERE kind = 'channel'").get().n, 0);
  } finally { app.close(); sqlite.close(); }
});

test("publication failures allow retry and concurrent submission is blocked", async () => {
  const { sqlite, db } = database();
  const app = mountApp(db);
  try {
    await signIn(app);
    const execute = db.execute;
    let release;
    db.execute = async (query, values) => {
      if (query.includes("INSERT INTO messages")) {
        await new Promise(resolve => { release = resolve; });
        throw new Error("Запись не удалась");
      }
      return execute(query, values);
    };
    const sending = app.state.sendMessage("Первый пост");
    assert.equal(app.state.isBusy, true);
    await app.state.sendMessage("Повторный пост");
    release();
    await sending;
    assert.equal(app.state.isBusy, false);
    assert.equal(app.state.submittedMessage, 0);
    assert.match(app.state.messageError, /Не удалось сохранить/);
    db.execute = execute;
    await app.state.sendMessage("Первый пост");
    assert.equal(app.state.submittedMessage, 1);
    assert.equal(app.state.messageError, "");
    assert.equal(sqlite.prepare("SELECT COUNT(*) AS n FROM messages").get().n, 1);
    await app.state.sendImage("/image.png");
    assert.equal(app.state.submittedMessage, 1);
  } finally { app.close(); sqlite.close(); }
});

test("sessions start at login, switch only authorized profiles and return to login on logout", async () => {
  const { sqlite, db } = database();
  const app = mountApp(db);
  try {
    await ready(app);
    assert.equal(app.state.currentUser, null);
    assert.equal(app.state.chats.length, 0);
    assert.equal(app.state.isAuthOpen, true);
    await app.state.selectUser(app.state.users[1]);
    assert.equal(app.state.currentUser, null);
    await app.state.login({ login: "user", password: "wrong" });
    assert.equal(app.state.currentUser, null);
    assert.match(app.state.authError, /Неверный/);
    await app.state.login({ login: "user", password: "123456" });
    assert.equal(app.state.authCandidates.length, 3);
    assert.equal(app.state.currentUser, null);
    await app.state.activateAccount(app.state.authCandidates[0]);
    assert.equal(app.state.currentUser.id, 1);
    assert.equal(app.state.isAuthOpen, false);
    await app.state.selectUser(app.state.users[1]);
    assert.equal(app.state.currentUser.id, 1);
    app.state.addAccount();
    await app.state.login({ login: "user", password: "123456" });
    await app.state.activateAccount(app.state.authCandidates[1]);
    assert.equal(app.state.currentUser.id, 2);
    assert.equal(app.state.sessionAccounts.length, 2);
    await app.state.saveProfile({ displayName: "Новое имя", status: "Здесь", avatarPath: null });
    assert.equal(app.state.sessionAccounts.find(user => user.id === 2).display_name, "Новое имя");
    await app.state.logout();
    assert.equal(app.state.currentUser.id, 1);
    assert.equal(app.state.sessionAccounts.length, 1);
    await app.state.logout();
    assert.equal(app.state.currentUser, null);
    assert.equal(app.state.chats.length, 0);
    assert.equal(app.state.messages.length, 0);
    assert.equal(app.state.isAuthOpen, true);
    assert.equal(app.state.sessionAccounts.length, 0);
  } finally { app.close(); sqlite.close(); }
});
