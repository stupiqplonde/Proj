use std::path::Path;
use std::ffi::OsStr;
// импорт типов необходимых для migrations
use tauri_plugin_sql::{Migration, MigrationKind};

// аннотация необходимая tauri для мобильных платформ
#[cfg_attr(mobile, tauri::mobile_entry_point)]

#[tauri::command]
fn save_attachment(source: String) -> Result<String, String> {
    let app_dir = std::env::current_dir() // проверка где лежит приложение
        .map_err(|e| e.to_string())?; // функция обработки возможной ошибки
    let attachment_dir = app_dir.join("attachment");
    // join - присоединение к существующему пути до папки

    // fs - файловая система - для раблоты сфайлами
    std::fs::create_dir_all(&attachment_dir)
        .map_err(|e| e.to_string())?;

    // 1. Извлекаем расширение и безопасно переводим его в &str
    let extension = Path::new(&source)
        .extension()
        .and_then(OsStr::to_str)
        .unwrap_or("png"); // Если расширения нет, используем дефолтное (например, bin)

    let file_name = format!("image_{}.{extension}", chrono::Utc::now().timestamp());

    let destination = attachment_dir.join(&file_name);

    std::fs::copy(source, destination).map_err(|e| e.to_string())?;

    Ok(
        format!(
            "attachment/{}",
            file_name
        )
    )
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
