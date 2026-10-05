use r2d2_sqlite::SqliteConnectionManager;
use rusqlite::Connection;
use std::fs;
use std::path::Path;

pub type DbPool = r2d2::Pool<SqliteConnectionManager>;

const SCHEMA_SQL: &str = include_str!("schema.sql");
const SCHEMA_VERSION: i64 = 1;

/// Crea el pool de conexiones apuntando a `<app_data_dir>/sistema_medico.sqlite`,
/// creando el directorio si hace falta, y corre el schema completo si la BD es nueva.
pub fn init_pool(app_data_dir: &Path) -> Result<DbPool, Box<dyn std::error::Error>> {
    fs::create_dir_all(app_data_dir)?;
    let db_path = app_data_dir.join("sistema_medico.sqlite");

    let manager = SqliteConnectionManager::file(&db_path).with_init(|conn| {
        conn.execute_batch("PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;")
    });
    let pool = r2d2::Pool::builder().max_size(8).build(manager)?;

    let conn = pool.get()?;
    run_migrations(&conn)?;

    Ok(pool)
}

fn run_migrations(conn: &Connection) -> rusqlite::Result<()> {
    let version: i64 = conn.query_row("PRAGMA user_version", [], |row| row.get(0))?;
    if version < SCHEMA_VERSION {
        conn.execute_batch(SCHEMA_SQL)?;
        conn.pragma_update(None, "user_version", SCHEMA_VERSION)?;
    }
    Ok(())
}
