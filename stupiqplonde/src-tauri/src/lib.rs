use std::path::Path;
use std::time::{
    SystemTime,
    UNIX_EPOCH
};

use tauri::Manager;
// импорт типов необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};

// аннотация необходимая tauri для мобильных платформ
#[cfg_attr(mobile, tauri::mobile_entry_point)]

#[tauri::command]
fn save_attachment(app: tauri::AppHandle, source: String) -> Result<String, String> {
    let source_path = Path::new(&source);

    if !source_path.is_file() {
        return Err(
            "Выбранный формат не существует"
                .to_string()
        );
    }

    let extension = source_path.
        extension()
        .and_then(
            |extension| extension.to_str()
        )
        .map(
            |extension| extension.to_lowercase()
        )
        .ok_or_else(
            ||
                "У файла нет расширения"
                    .to_string()
        )?;
    let allowed_extensions = [
        "png",
        "jpg",
        "jpeg",
        "webp",
        "gif",
    ];

    if !allowed_extensions
        .contains(
            &extension.as_str()
        )
    {
        return Err(
            "Этот формат излбражения не поддерживается"
            .to_string()
        );
    }

    let app_data_dir =
        app
            .path()
            .app_data_dir()
            .map_err(
                |error|
                    error.to_string()
            )?;

    let attachments_dir =
        app_data_dir
            .join("attachments");

    std::fs::create_dir_all(
        &attachments_dir
    )
        .map_err(
            |error|
                error.to_string()
        )?;

    let timestamp =
        SystemTime::now()
            .duration_since(
                UNIX_EPOCH
            )
            .map_err(
                |error|
                    error.to_string()
            )?
            .as_nanos();

    let file_name =
    format!(
        "image_{}.{}",
        timestamp,
        extension,
    );

    let destination =
        attachments_dir
            .join(file_name);

    std::fs::copy(
        source_path,
        &destination,
    )
        .map_err(
            |error|
                error.to_string()
        )?;

    let saved_path =
        destination
            .to_str()

            .ok_or_else(
                ||
                    "Не удалось преобразовать путь файла"
                        .to_string()
            )?

            .to_string();

    Ok(saved_path)
}



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
        Migration {
            version: 3,
            description: "message_attachment",
            sql: include_str!("../migrations/0003_message_attachments.sql"),
            kind: MigrationKind::Up,
        }
    ];

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:messanger.db", migrations)
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(
            tauri::generate_handler![
                save_attachment
            ]
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
