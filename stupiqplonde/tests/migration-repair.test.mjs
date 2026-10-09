import assert from "node:assert/strict";
import { DatabaseSync } from "node:sqlite";
import { mkdtempSync, readFileSync, readdirSync, rmSync } from "node:fs";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { repairChannelMigration } from "../scripts/repair-channel-migration.mjs";

function fixture(){
  const directory = mkdtempSync(join(tmpdir(), "encore-migration-"));
  const filename = join(directory, "messenger.db");
  const db = new DatabaseSync(filename);
  db.exec("CREATE TABLE _sqlx_migrations (version INTEGER PRIMARY KEY, checksum BLOB, success BOOLEAN)");
  const migrations = new URL("../src-tauri/migrations/", import.meta.url);
  for (const name of readdirSync(migrations).filter(name => name.endsWith(".sql")).sort().slice(0, 9)) {
    const sql = readFileSync(new URL(name, migrations));
    const version = Number(name.slice(0, 4));
    db.exec(sql.toString("utf8"));
    const hash = createHash("sha384").update(sql);
    if (version === 9) hash.update("\n-- Previous formatting\n");
    db.prepare("INSERT INTO _sqlx_migrations VALUES (?, ?, 1)").run(version, hash.digest());
  }
  db.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (1, 1, ?)").run("Сохранённая история");
  return { db, filename, close(){ db.close(); rmSync(directory, { recursive: true, force: true }); } };
}

test("migration repair preserves history and makes a backup of the original metadata", async () => {
  const { db, filename, close } = fixture();
  try {
    const oldHash = db.prepare("SELECT checksum FROM _sqlx_migrations WHERE version=9").get().checksum;
    const result = await repairChannelMigration(filename);
    assert.equal(result.repaired, true);
    const backup = new DatabaseSync(result.backupPath, { readOnly: true });
    try {
      assert.deepEqual(backup.prepare("SELECT checksum FROM _sqlx_migrations WHERE version=9").get().checksum, oldHash);
      assert.deepEqual(db.prepare("SELECT * FROM messages").all(), backup.prepare("SELECT * FROM messages").all());
      assert.deepEqual(db.prepare("SELECT * FROM chat_members").all(), backup.prepare("SELECT * FROM chat_members").all());
    } finally { backup.close(); }
    assert.deepEqual(await repairChannelMigration(filename), { repaired: false });
    db.exec(readFileSync(new URL("../src-tauri/migrations/0010_channel_permissions.sql", import.meta.url), "utf8"));
    assert.equal(db.prepare("SELECT COUNT(*) AS n FROM sqlite_master WHERE type='trigger'").get().n, 4);
  } finally { close(); }
});

test("migration repair refuses changes to the actual schema or earlier migrations", async () => {
  for (const change of [
    "ALTER TABLE chats ADD COLUMN unexpected TEXT",
    "UPDATE _sqlx_migrations SET checksum = X'00' WHERE version = 8",
  ]) {
    const { db, filename, close } = fixture();
    try {
      db.exec(change);
      const original = db.prepare("SELECT * FROM _sqlx_migrations").all();
      await assert.rejects(repairChannelMigration(filename), /База не изменена/);
      assert.deepEqual(db.prepare("SELECT * FROM _sqlx_migrations").all(), original);
    } finally { close(); }
  }
});
