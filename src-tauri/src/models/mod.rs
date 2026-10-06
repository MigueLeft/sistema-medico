/// Declara un modelo de lectura: struct serializable en camelCase + `from_row`
/// que toma cada campo de la columna del mismo nombre.
macro_rules! modelo {
    ($(#[$meta:meta])* $nombre:ident { $($campo:ident : $tipo:ty),* $(,)? }) => {
        $(#[$meta])*
        #[derive(Debug, Clone, serde::Serialize)]
        #[serde(rename_all = "camelCase")]
        pub struct $nombre {
            $(pub $campo: $tipo),*
        }

        impl $nombre {
            pub fn from_row(row: &rusqlite::Row) -> rusqlite::Result<Self> {
                Ok(Self { $($campo: row.get(stringify!($campo))?),* })
            }
        }
    };
}

mod agenda;
mod antecedente;
mod cita;
mod clinica;
mod composicion_corporal;
mod consulta;
mod dashboard;
mod enfermedad;
mod entregable;
mod examen;
mod examen_fisico;
mod paciente;
mod pendiente;
mod tratamiento;

pub use agenda::*;
pub use antecedente::*;
pub use cita::*;
pub use clinica::*;
pub use composicion_corporal::*;
pub use consulta::*;
pub use dashboard::*;
pub use enfermedad::*;
pub use entregable::*;
pub use examen::*;
pub use examen_fisico::*;
pub use paciente::*;
pub use pendiente::*;
pub use tratamiento::*;
