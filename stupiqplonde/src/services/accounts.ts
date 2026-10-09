import type Database from "@tauri-apps/plugin-sql";
import type { Login, Registration, User } from "../types/user";

type AccountDatabase = Pick<Database, "select" | "execute">;

interface Credentials extends User {
  login: string;
  password_hash: string;
  password_salt: string;
}

function createSalt(){
  return Array.from(crypto.getRandomValues(new Uint8Array(16)), byte =>
    byte.toString(16).padStart(2, "0"),
  ).join("");
}

async function hashPassword(password: string, salt: string){
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: encoder.encode(salt), iterations: 100000, hash: "SHA-256" },
    key, 256,
  );
  return Array.from(new Uint8Array(bits), byte => byte.toString(16).padStart(2, "0")).join("");
}

function publicUser(account: Credentials): User {
  return {
    id: account.id,
    username: account.username,
    display_name: account.display_name,
    avatar_path: account.avatar_path,
    status: account.status,
    created_at: account.created_at,
  };
}

// Дополняем локальную базу через существующий SQL-плагин, не меняя Rust-миграции.
export async function initializeAccounts(db: AccountDatabase){
  const columns = await db.select<{ name: string }[]>("PRAGMA table_info(users)");
  for (const name of ["login", "password_hash", "password_salt"]) {
    if (!columns.some(column => column.name === name)) {
      await db.execute(`ALTER TABLE users ADD COLUMN ${name} TEXT`);
    }
  }

  const salt = createSalt();
  const hash = await hashPassword("123456", salt);
  await db.execute(`
    UPDATE users SET login = 'user', password_hash = $1, password_salt = $2
    WHERE login IS NULL AND password_hash IS NULL
  `, [hash, salt]);
  await db.execute(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_users_login ON users(login)
    WHERE login != 'user'
  `);
}

export async function loginAccount(db: AccountDatabase, payload: Login): Promise<User[]> {
  const accounts = await db.select<Credentials[]>(
    "SELECT * FROM users WHERE login = $1 ORDER BY id", [payload.login.trim().toLowerCase()],
  );
  const matching: User[] = [];
  for (const account of accounts) {
    if (await hashPassword(payload.password, account.password_salt) === account.password_hash) {
      matching.push(publicUser(account));
    }
  }
  if (matching.length === 0) throw new Error("Неверный логин или пароль.");
  return matching;
}

export async function registerAccount(db: AccountDatabase, payload: Registration): Promise<User> {
  const login = payload.login.trim().toLowerCase();
  const name = payload.displayName.trim();
  if (!/^[a-z0-9_]{3,32}$/.test(login)) {
    throw new Error("Логин: от 3 до 32 латинских букв, цифр или символов подчёркивания.");
  }
  if (!name || name.length > 40) throw new Error("Укажите имя до 40 символов.");
  if (payload.password.length < 6 || payload.password.length > 128) {
    throw new Error("Пароль должен содержать от 6 до 128 символов.");
  }
  const existing = await db.select<{ id: number }[]>(
    "SELECT id FROM users WHERE login = $1 OR username = $1", [login],
  );
  if (login === "user" || existing.length > 0) throw new Error("Этот логин уже занят.");

  const salt = createSalt();
  const hash = await hashPassword(payload.password, salt);
  // Пользователь и данные для входа создаются одним INSERT.
  try {
    await db.execute(`
      INSERT INTO users (username, display_name, login, password_hash, password_salt)
      VALUES ($1, $2, $1, $3, $4)
    `, [login, name, hash, salt]);
  } catch {
    throw new Error("Не удалось зарегистрироваться. Возможно, логин уже занят.");
  }
  const users = await db.select<Credentials[]>("SELECT * FROM users WHERE login = $1", [login]);
  if (!users[0]) throw new Error("Аккаунт сохранён. Войдите с указанными данными.");
  return publicUser(users[0]);
}

export async function changePassword(db: AccountDatabase, userId: number, currentPassword: string, newPassword: string){
  if (newPassword.length < 6 || newPassword.length > 128) {
    throw new Error("Новый пароль должен содержать от 6 до 128 символов.");
  }
  const accounts = await db.select<Credentials[]>("SELECT * FROM users WHERE id = $1", [userId]);
  const account = accounts[0];
  if (!account || await hashPassword(currentPassword, account.password_salt) !== account.password_hash) {
    throw new Error("Текущий пароль неверный.");
  }
  const salt = createSalt();
  await db.execute("UPDATE users SET password_hash = $1, password_salt = $2 WHERE id = $3", [
    await hashPassword(newPassword, salt), salt, userId,
  ]);
}
