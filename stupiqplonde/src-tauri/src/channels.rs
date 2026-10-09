use serde::Deserialize;
use sqlx::SqlitePool;
use tauri_plugin_sql::{DbInstances, DbPool};

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CreateChannel {
    title: String,
    subtitle: String,
    member_ids: Vec<i64>,
    owner_id: i64,
    invite_code: String,
}

// Канал и участников сохраняем одной транзакцией: при ошибке откатываем всё.
async fn persist_channel(pool: &SqlitePool, payload: CreateChannel) -> Result<i64, String> {
    let title = payload.title.trim();
    let subtitle = payload.subtitle.trim();
    if title.is_empty() || title.chars().count() > 80 || subtitle.chars().count() > 120 {
        return Err("Укажите название до 80 символов и описание до 120 символов.".into());
    }
    if payload.owner_id <= 0 || payload.member_ids.iter().any(|id| *id <= 0) {
        return Err("Некорректный пользователь.".into());
    }
    if payload.invite_code.len() != 8
        || !payload
            .invite_code
            .bytes()
            .all(|c| b"ABCDEFGHJKLMNPQRSTUVWXYZ23456789".contains(&c))
    {
        return Err("Некорректный код приглашения.".into());
    }

    let mut tx = pool.begin().await.map_err(|e| e.to_string())?;
    let inserted = sqlx::query(
        "INSERT INTO chats (title, subtitle, kind, owner_id, invite_code) VALUES (?, ?, 'channel', ?, ?)",
    )
    .bind(title)
    .bind(subtitle)
    .bind(payload.owner_id)
    .bind(&payload.invite_code)
    .execute(&mut *tx)
    .await
    .map_err(|e| {
        if e.as_database_error().is_some_and(|e| e.is_unique_violation()) {
            "Код приглашения уже занят. Повторите создание.".to_string()
        } else {
            "Не удалось создать канал: проверьте выбранных пользователей.".to_string()
        }
    })?;
    let chat_id = inserted.last_insert_rowid();
    let mut member_ids = payload.member_ids;
    member_ids.push(payload.owner_id);
    member_ids.sort_unstable();
    member_ids.dedup();
    for user_id in member_ids {
        sqlx::query("INSERT INTO chat_members (chat_id, user_id, role) VALUES (?, ?, ?)")
            .bind(chat_id)
            .bind(user_id)
            .bind(if user_id == payload.owner_id {
                "owner"
            } else {
                "member"
            })
            .execute(&mut *tx)
            .await
            .map_err(|_| "Не удалось добавить участников. Канал не создан.".to_string())?;
    }
    tx.commit().await.map_err(|e| e.to_string())?;
    Ok(chat_id)
}

#[tauri::command]
pub async fn create_channel(
    databases: tauri::State<'_, DbInstances>,
    payload: CreateChannel,
) -> Result<i64, String> {
    let pool = {
        let instances = databases.0.read().await;
        match instances.get("sqlite:messenger.db") {
            Some(DbPool::Sqlite(pool)) => pool.clone(),
            _ => return Err("База данных ещё не подключена.".into()),
        }
    };
    persist_channel(&pool, payload).await
}

#[cfg(test)]
mod tests {
    use super::*;

    fn payload(member_ids: Vec<i64>) -> CreateChannel {
        CreateChannel {
            title: "  Новости  ".into(),
            subtitle: " Описание ".into(),
            member_ids,
            owner_id: 1,
            invite_code: "ABCD2345".into(),
        }
    }

    async fn database() -> SqlitePool {
        let pool = sqlx::sqlite::SqlitePoolOptions::new()
            .max_connections(1)
            .connect("sqlite::memory:")
            .await
            .unwrap();
        for migration in [
            include_str!("../migrations/0001_initial.sql"),
            include_str!("../migrations/0002_chats.sql"),
            include_str!("../migrations/0003_message_attachments.sql"),
            include_str!("../migrations/0004_users.sql"),
            include_str!("../migrations/0005_message_edited.sql"),
            include_str!("../migrations/0006_chat_reads.sql"),
            include_str!("../migrations/0007_message_forwarding.sql"),
            include_str!("../migrations/0008_chat_members.sql"),
            include_str!("../migrations/0009_channels.sql"),
            include_str!("../migrations/0010_channel_permissions.sql"),
        ] {
            sqlx::raw_sql(migration).execute(&pool).await.unwrap();
        }
        pool
    }

    #[test]
    fn creation_is_atomic_and_assigns_roles() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            assert!(persist_channel(&pool, payload(vec![2, 999])).await.is_err());
            let count: i64 =
                sqlx::query_scalar("SELECT COUNT(*) FROM chats WHERE kind = 'channel'")
                    .fetch_one(&pool)
                    .await
                    .unwrap();
            assert_eq!(count, 0);
            let id = persist_channel(&pool, payload(vec![1, 2, 2]))
                .await
                .unwrap();
            let members: Vec<(i64, String)> = sqlx::query_as(
                "SELECT user_id, role FROM chat_members WHERE chat_id = ? ORDER BY user_id",
            )
            .bind(id)
            .fetch_all(&pool)
            .await
            .unwrap();
            assert_eq!(members, vec![(1, "owner".into()), (2, "member".into())]);
            assert!(persist_channel(&pool, payload(vec![])).await.is_err());
            let mut solo = payload(vec![]);
            solo.invite_code = "WXYZ6789".into();
            assert!(persist_channel(&pool, solo).await.is_ok());
            let mut blank = payload(vec![]);
            blank.title = "   ".into();
            assert!(persist_channel(&pool, blank).await.is_err());
        });
    }

    #[test]
    fn invalid_payloads_leave_no_channels_or_members() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            let mut invalid = Vec::new();
            for title in [" ".to_string(), "я".repeat(81)] {
                let mut channel = payload(vec![]);
                channel.title = title;
                invalid.push(channel);
            }
            let mut channel = payload(vec![]);
            channel.subtitle = "я".repeat(121);
            invalid.push(channel);
            for owner_id in [0, -1, 999] {
                let mut channel = payload(vec![2]);
                channel.owner_id = owner_id;
                invalid.push(channel);
            }
            for code in ["", "ABCD234", "ABCD23456", "ABCD01OI", "abcd2345"] {
                let mut channel = payload(vec![]);
                channel.invite_code = code.into();
                invalid.push(channel);
            }
            invalid.push(payload(vec![0]));
            invalid.push(payload(vec![-1]));
            invalid.push(payload(vec![2, 999]));
            for channel in invalid {
                assert!(persist_channel(&pool, channel).await.is_err());
            }
            let channels: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM chats")
                .fetch_one(&pool).await.unwrap();
            let members: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM chat_members")
                .fetch_one(&pool).await.unwrap();
            assert_eq!(channels, 3);
            assert_eq!(members, 9);

            let mut channel = payload(vec![]);
            channel.title = "я".repeat(80);
            channel.subtitle = "я".repeat(120);
            let id = persist_channel(&pool, channel).await.unwrap();
            let saved: (String, String) = sqlx::query_as(
                "SELECT title, subtitle FROM chats WHERE id = ?",
            ).bind(id).fetch_one(&pool).await.unwrap();
            assert_eq!(saved, ("я".repeat(80), "я".repeat(120)));
        });
    }

    #[test]
    fn duplicate_invite_does_not_change_existing_channel() {
        tauri::async_runtime::block_on(async {
            let pool = database().await;
            let id = persist_channel(&pool, payload(vec![2])).await.unwrap();
            assert!(persist_channel(&pool, payload(vec![3])).await.is_err());
            let members: Vec<i64> = sqlx::query_scalar(
                "SELECT user_id FROM chat_members WHERE chat_id = ? ORDER BY user_id",
            ).bind(id).fetch_all(&pool).await.unwrap();
            assert_eq!(members, vec![1, 2]);
            let channels: i64 = sqlx::query_scalar("SELECT COUNT(*) FROM chats WHERE kind = 'channel'")
                .fetch_one(&pool).await.unwrap();
            assert_eq!(channels, 1);
        });
    }
}
