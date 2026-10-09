import { readFileSync, readdirSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { createServer } from "vite";

// Только для проверки интерфейса: отдельная база в памяти, без доступа к messenger.db.
const sqlite = new DatabaseSync(":memory:");
sqlite.exec("PRAGMA foreign_keys = ON");
const directory = new URL("../src-tauri/migrations/", import.meta.url);
for (const name of readdirSync(directory).filter(name => name.endsWith(".sql")).sort()) {
  sqlite.exec(readFileSync(new URL(name, directory), "utf8"));
}
sqlite.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (1, 2, ?)").run("Привет! Как вам идея собрать здесь наши планы на выходные?");
sqlite.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (1, 1, ?)").run("Отличная идея. Давайте начнём с прогулки и кофе ☕");
sqlite.prepare("INSERT INTO messages (chat_id, author_id, body) VALUES (1, 3, ?)").run("Я с вами! В субботу после двух свободен.");

const server = await createServer({
  server: { host: "127.0.0.1", port: 1422, strictPort: true },
  plugins: [{
    name: "local-ui-preview",
    configureServer(server) {
      server.middlewares.use("/__preview/ipc", async (request, response) => {
        response.setHeader("Content-Type", "application/json");
        try {
          if (request.method !== "POST") throw new Error("POST required");
          let body = "";
          for await (const chunk of request) body += chunk;
          const { command, payload } = JSON.parse(body);
          let result;
          if (command === "plugin:sql|load") result = "sqlite:messenger.db";
          else if (["plugin:sql|execute", "plugin:sql|select"].includes(command)) {
            const statement = sqlite.prepare(payload.query);
            const bindings = Object.fromEntries(payload.values.map((value, index) => [`$${index + 1}`, value]));
            if (command.endsWith("select")) result = payload.values.length ? statement.all(bindings) : statement.all();
            else {
              const saved = payload.values.length ? statement.run(bindings) : statement.run();
              result = [Number(saved.changes), Number(saved.lastInsertRowid)];
            }
          } else if (command === "create_channel") {
            const channel = payload.payload;
            sqlite.exec("BEGIN");
            try {
              const saved = sqlite.prepare("INSERT INTO chats (title, subtitle, kind, owner_id, invite_code) VALUES (?, ?, 'channel', ?, ?)").run(channel.title, channel.subtitle, channel.ownerId, channel.inviteCode);
              result = Number(saved.lastInsertRowid);
              for (const userId of new Set([channel.ownerId, ...channel.memberIds])) {
                sqlite.prepare("INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)").run(result, userId, userId === channel.ownerId ? "owner" : "member");
              }
              sqlite.exec("COMMIT");
            } catch (error) { sqlite.exec("ROLLBACK"); throw error; }
          } else throw new Error("Команда недоступна в предпросмотре");
          response.end(JSON.stringify(result));
        } catch (error) {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: String(error) }));
        }
      });
    },
  }],
});
await server.listen();
console.log("UI preview: http://127.0.0.1:1422/tests/ui-preview.html");
