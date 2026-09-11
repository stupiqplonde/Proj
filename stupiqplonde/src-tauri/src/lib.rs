// импорт типов необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};

// аннотация необходимая tauri для мобильных платформ
#[cfg_attr(mobile, tauri::mobile_entry_point)]

// главная функция для запуска приложения
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create_message_table",
            sql: include_str!("../migrations/0001_initial.sql"),
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "create_message_reactions_table",
            sql: include_str!("../migrations/0002_reactions.sql"),
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:messanger.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
