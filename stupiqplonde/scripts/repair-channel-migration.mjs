import { DatabaseSync, backup } from "node:sqlite";
import { accessSync, readFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const directory = new URL("../src-tauri/migrations/", import.meta.url);
const migrations = readdirSync(directory).filter(name => name.endsWith(".sql")).sort();
const checksum = sql => createHash("sha384").update(sql).digest();
const tables = ["chats", "chat_members", "message_reactions", "message_comments"];

function schema(db){
  return db.prepare(`
    SELECT type, name, sql FROM sqlite_master
    WHERE tbl_name IN (${tables.map(() => "?").join(",")}) AND sql IS NOT NULL
    ORDER BY type, name
  `).all(...tables).map(row => ({
    ...row,
    sql: row.sql.replace(/\s+/g, " ").replace(/\s*([(),;])\s*/g, "$1").trim(),
  }));
}

function inspect(db){
  const rows = db.prepare("SELECT version, checksum, success FROM _sqlx_migrations ORDER BY version").all();
  if (rows.length !== 9 || rows.some((row, index) => row.version !== index + 1 || !row.success)) {
    throw new Error("Исправление предназначено только для базы с девятью успешно применёнными миграциями.");
  }
  const expected = new DatabaseSync(":memory:");
  try {
    for (let index = 0; index < 9; index++) {
      const sql = readFileSync(new URL(migrations[index], directory));
      if (index < 8 && !Buffer.from(rows[index].checksum).equals(checksum(sql))) {
        throw new Error(`Не совпадает миграция ${index + 1}. База не изменена.`);
      }
      expected.exec(sql.toString("utf8"));
    }
    if (JSON.stringify(schema(db)) !== JSON.stringify(schema(expected))) {
      throw new Error("Схема каналов отличается от миграции № 9. База не изменена.");
    }
    if (db.prepare("PRAGMA quick_check").all().some(row => row.quick_check !== "ok")) {
      throw new Error("SQLite обнаружил ошибку целостности. База не изменена.");
    }
    const current = checksum(readFileSync(new URL(migrations[8], directory)));
    return { current, previous: Buffer.from(rows[8].checksum) };
  } finally { expected.close(); }
}

// Одноразовое исправление метаданных после проверки схемы и резервного копирования.
export async function repairChannelMigration(path){
  const filename = resolve(path);
  const db = new DatabaseSync(filename, { open: false });
  // Существующий файл обязателен: ошибочный путь не должен создать пустую базу.
  accessSync(filename);
  db.open();
  try {
    const initial = inspect(db);
    if (initial.current.equals(initial.previous)) return { repaired: false };
    const backupPath = `${filename}.before-channel-migration-${Date.now()}.db`;
    await backup(db, backupPath);
    db.exec("BEGIN IMMEDIATE");
    try {
      const checked = inspect(db);
      db.prepare("UPDATE _sqlx_migrations SET checksum = ? WHERE version = 9").run(checked.current);
      db.exec("COMMIT");
    } catch (error) {
      db.exec("ROLLBACK");
      throw error;
    }
    return { repaired: true, backupPath };
  } finally { db.close(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  if (!process.argv[2]) throw new Error("Укажите полный путь существующей messenger.db.");
  console.log(JSON.stringify(await repairChannelMigration(process.argv[2]), null, 2));
}
