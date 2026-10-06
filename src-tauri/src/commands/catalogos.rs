//! Catálogos de referencia (terminologías y listas del consultorio).
//! Todos comparten los mismos dos comandos, `listar_catalogo` y `guardar_catalogo`;
//! lo que cambia entre ellos es la definición de `CATALOGOS`.

use std::collections::HashMap;

use rusqlite::types::Value as SqlValue;
use serde_json::{Map, Value};
use tauri::State;
use uuid::Uuid;

use crate::db::DbPool;
use crate::error::{ErrorApp, Resultado};
use crate::session::SessionState;

#[derive(Clone, Copy, PartialEq)]
enum Tipo {
    Texto,
    Entero,
    Real,
    Bool,
}
use Tipo::{Bool, Entero, Real, Texto};

struct Catalogo {
    nombre: &'static str,
    tabla: &'static str,
    columnas: &'static [(&'static str, Tipo)],
    /// Columnas de texto sobre las que busca `query`.
    buscar: &'static [&'static str],
    orden: &'static str,
    /// `organizacion_id` nulo = entrada global; si no, propia de la organización.
    por_organizacion: bool,
    tiene_updated_at: bool,
}

const CATALOGOS: &[Catalogo] = &[
    Catalogo {
        nombre: "enfermedades",
        tabla: "enfermedad_catalogo",
        columnas: &[("codigo", Texto), ("version_cie", Texto), ("nombre", Texto), ("sinonimos", Texto)],
        buscar: &["nombre", "codigo", "sinonimos"],
        orden: "nombre",
        por_organizacion: false,
        tiene_updated_at: false,
    },
    Catalogo {
        nombre: "paraclinicos",
        tabla: "tipo_examen_catalogo",
        columnas: &[
            ("nombre", Texto),
            ("nombre_mostrar", Texto),
            ("categoria", Texto),
            ("codigo_loinc", Texto),
            ("grupo", Texto),
            ("unidad", Texto),
            ("ref_min_mujer", Real),
            ("ref_max_mujer", Real),
            ("ref_min_hombre", Real),
            ("ref_max_hombre", Real),
            ("favorito", Bool),
        ],
        buscar: &["nombre", "nombre_mostrar", "codigo_loinc"],
        orden: "grupo, nombre",
        por_organizacion: false,
        tiene_updated_at: false,
    },
    Catalogo {
        nombre: "procedimientos",
        tabla: "procedimiento_catalogo",
        columnas: &[
            ("codigo_snomed", Texto),
            ("nombre", Texto),
            ("nombre_mostrar", Texto),
            ("tipo", Texto),
            ("ambito", Texto),
            ("requiere_hospitalizacion", Bool),
            ("estancia_tipica", Texto),
            ("sinonimos", Texto),
            ("favorito", Bool),
        ],
        buscar: &["nombre", "nombre_mostrar", "codigo_snomed", "sinonimos"],
        orden: "created_at, nombre",
        por_organizacion: false,
        tiene_updated_at: true,
    },
    Catalogo {
        nombre: "motivos_ingreso",
        tabla: "motivo_ingreso_catalogo",
        columnas: &[
            ("codigo_snomed", Texto),
            ("nombre", Texto),
            ("nombre_mostrar", Texto),
            ("servicio_habitual", Texto),
            ("tipo_ingreso", Texto),
            ("estancia_tipica", Texto),
            ("favorito", Bool),
        ],
        buscar: &["nombre", "nombre_mostrar", "codigo_snomed"],
        orden: "created_at, nombre",
        por_organizacion: false,
        tiene_updated_at: true,
    },
    Catalogo {
        nombre: "servicios",
        tabla: "servicio_hospitalario_catalogo",
        columnas: &[("nombre", Texto)],
        buscar: &["nombre"],
        orden: "nombre",
        por_organizacion: false,
        tiene_updated_at: true,
    },
    Catalogo {
        nombre: "centros_salud",
        tabla: "centro_salud_catalogo",
        columnas: &[("nombre", Texto), ("tipo", Texto), ("ciudad", Texto)],
        buscar: &["nombre", "ciudad"],
        orden: "nombre",
        por_organizacion: false,
        tiene_updated_at: true,
    },
    Catalogo {
        nombre: "sistemas",
        tabla: "sistema_corporal_catalogo",
        columnas: &[("nombre", Texto), ("orden", Entero), ("texto_normal", Texto), ("activo", Bool)],
        buscar: &["nombre"],
        orden: "orden, nombre",
        por_organizacion: false,
        tiene_updated_at: true,
    },
    Catalogo {
        nombre: "medicamentos",
        tabla: "medicamento_catalogo",
        columnas: &[
            ("nombre_comercial", Texto),
            ("principio_activo", Texto),
            ("presentacion", Texto),
            ("concentracion", Texto),
            ("alergenos", Texto),
            ("activo", Bool),
        ],
        buscar: &["nombre_comercial", "principio_activo"],
        orden: "principio_activo, nombre_comercial",
        por_organizacion: true,
        tiene_updated_at: true,
    },
    Catalogo {
        nombre: "terminos",
        tabla: "termino_catalogo",
        columnas: &[("categoria", Texto), ("codigo", Texto), ("nombre", Texto), ("etiqueta", Texto), ("sinonimos", Texto)],
        buscar: &["nombre", "codigo", "sinonimos"],
        orden: "nombre",
        por_organizacion: false,
        tiene_updated_at: true,
    },
];

fn definicion(nombre: &str) -> Resultado<&'static Catalogo> {
    CATALOGOS
        .iter()
        .find(|c| c.nombre == nombre)
        .ok_or_else(|| ErrorApp::Validacion(format!("Catálogo desconocido: {nombre}")))
}

/// `codigo_snomed` -> `codigoSnomed`, igual que `#[serde(rename_all = "camelCase")]`.
fn a_camel(columna: &str) -> String {
    let mut salida = String::with_capacity(columna.len());
    let mut mayuscula = false;
    for c in columna.chars() {
        if c == '_' {
            mayuscula = true;
        } else if mayuscula {
            salida.extend(c.to_uppercase());
            mayuscula = false;
        } else {
            salida.push(c);
        }
    }
    salida
}

fn fila_a_json(def: &Catalogo, row: &rusqlite::Row) -> rusqlite::Result<Value> {
    let mut mapa = Map::new();
    mapa.insert("id".into(), Value::String(row.get("id")?));
    for (columna, tipo) in def.columnas {
        let valor = match tipo {
            Texto => row.get::<_, Option<String>>(*columna)?.map(Value::String),
            Entero => row.get::<_, Option<i64>>(*columna)?.map(Value::from),
            Real => row.get::<_, Option<f64>>(*columna)?.map(Value::from),
            Bool => row.get::<_, Option<bool>>(*columna)?.map(Value::Bool),
        };
        mapa.insert(a_camel(columna), valor.unwrap_or(Value::Null));
    }
    Ok(Value::Object(mapa))
}

/// Convierte el valor JSON recibido al tipo SQL de la columna. Cadenas vacías se guardan como NULL.
fn json_a_sql(columna: &str, tipo: Tipo, valor: &Value) -> Resultado<SqlValue> {
    let invalido = || ErrorApp::Validacion(format!("Valor inválido para «{columna}»."));
    Ok(match (tipo, valor) {
        (_, Value::Null) => SqlValue::Null,
        (Texto, Value::String(s)) if s.trim().is_empty() => SqlValue::Null,
        (Texto, Value::String(s)) => SqlValue::Text(s.trim().to_string()),
        (Entero, Value::Number(n)) => SqlValue::Integer(n.as_i64().ok_or_else(invalido)?),
        (Real, Value::Number(n)) => SqlValue::Real(n.as_f64().ok_or_else(invalido)?),
        (Bool, Value::Bool(b)) => SqlValue::Integer(i64::from(*b)),
        _ => return Err(invalido()),
    })
}

fn error_de_guardado(e: rusqlite::Error) -> ErrorApp {
    match e {
        rusqlite::Error::SqliteFailure(err, _) if err.code == rusqlite::ErrorCode::ConstraintViolation => {
            ErrorApp::Validacion("Falta un campo obligatorio o ya existe una entrada con ese código o nombre.".into())
        }
        other => ErrorApp::Db(other),
    }
}

/// Lista las entradas de un catálogo. `query` busca por texto y `filtros` exige igualdad en columnas del catálogo
/// (p. ej. `{ "categoria": "sintoma" }`).
#[tauri::command]
pub fn listar_catalogo(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    catalogo: String,
    query: Option<String>,
    filtros: Option<HashMap<String, String>>,
    limite: Option<i64>,
) -> Resultado<Vec<Value>> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let def = definicion(&catalogo)?;
    let conn = pool.get()?;

    let columnas: Vec<&str> = def.columnas.iter().map(|(c, _)| *c).collect();
    let mut sql = format!("SELECT id, {} FROM {} WHERE 1 = 1", columnas.join(", "), def.tabla);
    let mut params: Vec<SqlValue> = Vec::new();

    if def.por_organizacion {
        params.push(SqlValue::Text(session.organizacion_id.clone()));
        sql.push_str(&format!(" AND (organizacion_id IS NULL OR organizacion_id = ?{})", params.len()));
    }
    if let Some(q) = query.as_deref().map(str::trim).filter(|q| !q.is_empty()) {
        params.push(SqlValue::Text(format!("%{q}%")));
        let n = params.len();
        let condiciones: Vec<String> = def.buscar.iter().map(|c| format!("{c} LIKE ?{n}")).collect();
        sql.push_str(&format!(" AND ({})", condiciones.join(" OR ")));
    }
    for (clave, valor) in filtros.unwrap_or_default() {
        // Solo se aceptan columnas declaradas en la definición del catálogo.
        let (columna, _) = def
            .columnas
            .iter()
            .find(|(c, _)| a_camel(c) == clave || *c == clave)
            .ok_or_else(|| ErrorApp::Validacion(format!("Filtro desconocido: {clave}")))?;
        params.push(SqlValue::Text(valor));
        sql.push_str(&format!(" AND {columna} = ?{}", params.len()));
    }
    params.push(SqlValue::Integer(limite.unwrap_or(500).clamp(1, 2000)));
    sql.push_str(&format!(" ORDER BY {} LIMIT ?{}", def.orden, params.len()));

    let mut stmt = conn.prepare(&sql)?;
    let items = stmt
        .query_map(rusqlite::params_from_iter(params), |row| fila_a_json(def, row))?
        .collect::<rusqlite::Result<Vec<_>>>()?;
    Ok(items)
}

/// Crea (`id` nulo) o actualiza una entrada. `datos` usa las mismas claves camelCase que devuelve `listar_catalogo`;
/// al actualizar solo se tocan las claves presentes.
#[tauri::command]
pub fn guardar_catalogo(
    pool: State<DbPool>,
    session_state: State<SessionState>,
    catalogo: String,
    id: Option<String>,
    datos: Map<String, Value>,
) -> Resultado<Value> {
    let session = session_state.get().ok_or(ErrorApp::SinSesion)?;
    let def = definicion(&catalogo)?;
    let conn = pool.get()?;

    let mut columnas: Vec<&str> = Vec::new();
    let mut valores: Vec<SqlValue> = Vec::new();
    for (columna, tipo) in def.columnas {
        if let Some(valor) = datos.get(&a_camel(columna)) {
            columnas.push(columna);
            valores.push(json_a_sql(columna, *tipo, valor)?);
        }
    }
    if columnas.is_empty() {
        return Err(ErrorApp::Validacion("No hay datos que guardar.".into()));
    }

    let entrada_id = match id {
        Some(id) => {
            let mut asignaciones: Vec<String> = columnas.iter().enumerate().map(|(i, c)| format!("{c} = ?{}", i + 1)).collect();
            if def.tiene_updated_at {
                asignaciones.push("updated_at = datetime('now')".into());
            }
            valores.push(SqlValue::Text(id.clone()));
            let sql = format!("UPDATE {} SET {} WHERE id = ?{}", def.tabla, asignaciones.join(", "), valores.len());
            let filas = conn.execute(&sql, rusqlite::params_from_iter(valores)).map_err(error_de_guardado)?;
            if filas == 0 {
                return Err(ErrorApp::NoEncontrado("Entrada de catálogo no encontrada".into()));
            }
            id
        }
        None => {
            // Las enfermedades sin código de terminología reciben uno local para respetar UNIQUE (codigo, version_cie).
            if def.nombre == "enfermedades" {
                let sin_codigo = !columnas.contains(&"codigo")
                    || matches!(valores[columnas.iter().position(|c| *c == "codigo").unwrap()], SqlValue::Null);
                if sin_codigo {
                    if let Some(i) = columnas.iter().position(|c| *c == "codigo") {
                        columnas.remove(i);
                        valores.remove(i);
                    }
                    if let Some(i) = columnas.iter().position(|c| *c == "version_cie") {
                        columnas.remove(i);
                        valores.remove(i);
                    }
                    columnas.push("codigo");
                    valores.push(SqlValue::Text(format!("L-{}", &Uuid::new_v4().simple().to_string()[..8])));
                    columnas.push("version_cie");
                    valores.push(SqlValue::Text("LOCAL".into()));
                }
            }
            let nuevo_id = Uuid::new_v4().to_string();
            columnas.insert(0, "id");
            valores.insert(0, SqlValue::Text(nuevo_id.clone()));
            if def.por_organizacion {
                columnas.push("organizacion_id");
                valores.push(SqlValue::Text(session.organizacion_id.clone()));
            }
            let marcadores: Vec<String> = (1..=columnas.len()).map(|i| format!("?{i}")).collect();
            let sql = format!("INSERT INTO {} ({}) VALUES ({})", def.tabla, columnas.join(", "), marcadores.join(", "));
            conn.execute(&sql, rusqlite::params_from_iter(valores)).map_err(error_de_guardado)?;
            nuevo_id
        }
    };

    let seleccion: Vec<&str> = def.columnas.iter().map(|(c, _)| *c).collect();
    let sql = format!("SELECT id, {} FROM {} WHERE id = ?1", seleccion.join(", "), def.tabla);
    conn.query_row(&sql, rusqlite::params![entrada_id], |row| fila_a_json(def, row))
        .map_err(ErrorApp::from)
}
