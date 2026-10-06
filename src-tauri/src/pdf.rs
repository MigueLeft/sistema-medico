use std::collections::BTreeMap;

use printpdf::{GeneratePdfOptions, PdfDocument, PdfSaveOptions};
use serde_json::Value;

use crate::models::{BloquePlantilla, DatosItem, PlantillaEntregable};

/// Todo lo que hace falta para armar un documento a partir de su plantilla.
pub struct ContextoDocumento<'a> {
    pub membrete: &'a PlantillaEntregable,
    pub titulo: &'a str,
    pub clave: &'a str,
    pub bloques: &'a [BloquePlantilla],
    pub numero: &'a str,
    /// dd/mm/aaaa
    pub fecha: &'a str,
    pub paciente_nombre: &'a str,
    pub paciente_documento: &'a str,
    pub paciente_edad: i64,
    pub paciente_sexo: &'a str,
    pub paciente_historia: &'a str,
    pub medico_nombre: &'a str,
    /// Especialidad y colegiatura, si están registradas.
    pub medico_detalle: &'a str,
    pub datos: &'a Value,
    /// Solo los items incluidos en el documento.
    pub items: &'a [DatosItem],
}

const GRIS: &str = "#526071";
const LINEA: &str = "#c9d1da";
const TINTA: &str = "#1d2430";

fn escapar_html(texto: &str) -> String {
    texto
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn texto_de<'a>(datos: &'a Value, clave: &str) -> &'a str {
    datos.get(clave).and_then(Value::as_str).map(str::trim).unwrap_or("")
}

fn seccion(titulo: &str, cuerpo: &str) -> String {
    format!(
        "<div style=\"margin-top:12px;\">
            <div style=\"font-size:11px;font-weight:bold;margin-bottom:4px;\">{}</div>
            {cuerpo}
        </div>",
        escapar_html(titulo)
    )
}

fn parrafo(texto: &str) -> String {
    format!("<div style=\"font-size:11px;white-space:pre-wrap;\">{}</div>", escapar_html(texto))
}

fn bloque_membrete(ctx: &ContextoDocumento) -> String {
    let consultorio = ctx.membrete.nombre_consultorio.clone().unwrap_or_else(|| "Consultorio médico".to_string());
    let encabezado = ctx.membrete.encabezado.clone().unwrap_or_default();
    format!(
        "<div style=\"border-bottom:2px solid {TINTA};padding-bottom:8px;margin-bottom:10px;\">
            <div style=\"font-size:16px;font-weight:bold;\">{}</div>
            <div style=\"font-size:10px;\">{}</div>
            <div style=\"font-size:10px;color:{GRIS};white-space:pre-wrap;\">{}</div>
            <div style=\"font-size:12px;font-weight:bold;margin-top:8px;\">{} &nbsp; {} &nbsp;&middot;&nbsp; {}</div>
        </div>",
        escapar_html(&consultorio),
        escapar_html(&[ctx.medico_nombre, ctx.medico_detalle].iter().filter(|t| !t.is_empty()).copied().collect::<Vec<_>>().join(" · ")),
        escapar_html(&encabezado),
        escapar_html(&ctx.titulo.to_uppercase()),
        escapar_html(ctx.numero),
        escapar_html(ctx.fecha),
    )
}

fn bloque_paciente(ctx: &ContextoDocumento) -> String {
    format!(
        "<div style=\"font-size:11px;\">
            <div><strong>Paciente:</strong> {} &nbsp; <strong>C.I.:</strong> {}</div>
            <div><strong>Edad:</strong> {} años · {} &nbsp; <strong>Historia:</strong> {}</div>
        </div>",
        escapar_html(ctx.paciente_nombre),
        escapar_html(ctx.paciente_documento),
        ctx.paciente_edad,
        escapar_html(ctx.paciente_sexo),
        escapar_html(ctx.paciente_historia),
    )
}

fn bloque_medicamentos(ctx: &ContextoDocumento, titulo: &str) -> String {
    if ctx.items.is_empty() {
        return String::new();
    }
    let filas: String = ctx
        .items
        .iter()
        .enumerate()
        .map(|(i, m)| {
            let cantidad = m
                .cantidad
                .as_deref()
                .filter(|c| !c.trim().is_empty())
                .map(|c| format!("<div style=\"font-size:11px;\">Cantidad: {}</div>", escapar_html(c)))
                .unwrap_or_default();
            format!(
                "<div style=\"padding:5px 0;border-bottom:1px solid {LINEA};\">
                    <div style=\"font-size:11px;font-weight:bold;\">{}. {}</div>{cantidad}
                </div>",
                i + 1,
                escapar_html(m.nombre.as_deref().unwrap_or("")),
            )
        })
        .collect();
    seccion(titulo, &filas)
}

fn bloque_posologia(ctx: &ContextoDocumento, titulo: &str) -> String {
    if ctx.items.is_empty() {
        return String::new();
    }
    let filas: String = ctx
        .items
        .iter()
        .map(|m| {
            let pauta = [
                m.dosis.as_deref().map(|d| format!("Tomar {d}")),
                m.via.as_deref().map(|v| format!("vía {}", v.to_lowercase())),
                m.frecuencia.as_deref().map(|f| f.to_lowercase()),
                // «7 días» -> «por 7 días»; «Continuo» -> «de forma continua».
                m.duracion.as_deref().map(|d| {
                    if d.trim().to_lowercase().starts_with("continu") { "de forma continua".to_string() } else { format!("por {}", d.to_lowercase()) }
                }),
            ]
            .into_iter()
            .flatten()
            .filter(|t| !t.trim().is_empty())
            .collect::<Vec<_>>()
            .join(", ");
            let nota = m
                .indicaciones
                .as_deref()
                .filter(|t| !t.trim().is_empty())
                .map(|t| format!(" {}", escapar_html(t)))
                .unwrap_or_default();
            format!(
                "<div style=\"padding:5px 0;border-bottom:1px solid {LINEA};font-size:11px;\">
                    <div style=\"font-weight:bold;\">{}</div>
                    <div>{}.{nota}</div>
                </div>",
                escapar_html(m.nombre.as_deref().unwrap_or("")),
                escapar_html(&pauta),
            )
        })
        .collect();
    seccion(titulo, &filas)
}

fn bloque_pruebas(ctx: &ContextoDocumento, titulo: &str) -> String {
    if ctx.items.is_empty() {
        return String::new();
    }
    let filas: String = ctx
        .items
        .iter()
        .enumerate()
        .map(|(i, p)| {
            let codigo = p
                .codigo
                .as_deref()
                .filter(|c| !c.trim().is_empty())
                .map(|c| format!(" <span style=\"color:{GRIS};\">(LOINC {})</span>", escapar_html(c)))
                .unwrap_or_default();
            format!(
                "<div style=\"padding:4px 0;border-bottom:1px solid {LINEA};font-size:11px;\">{}. {}{codigo}</div>",
                i + 1,
                escapar_html(p.nombre.as_deref().unwrap_or("")),
            )
        })
        .collect();
    // La prioridad y el laboratorio sugerido solo existen en las órdenes.
    let extras: String = [("Prioridad", "prioridad"), ("Laboratorio sugerido", "laboratorio")]
        .iter()
        .filter_map(|(etiqueta, clave)| {
            let valor = texto_de(ctx.datos, clave);
            (!valor.is_empty()).then(|| format!("<div style=\"font-size:11px;\"><strong>{etiqueta}:</strong> {}</div>", escapar_html(valor)))
        })
        .collect();
    format!("{extras}{}", seccion(titulo, &filas))
}

fn bloque_firma(ctx: &ContextoDocumento) -> String {
    let vigencia = ctx
        .datos
        .get("vigenciaDias")
        .and_then(Value::as_i64)
        .filter(|_| ctx.clave == "recipe")
        .map(|d| format!("<div style=\"font-size:10px;color:{GRIS};\">Válido por {d} días</div>"))
        .unwrap_or_default();
    format!(
        "<div style=\"margin-top:28mm;text-align:center;\">
            <div style=\"font-size:11px;\">______________________________</div>
            <div style=\"font-size:11px;\">Firma y sello</div>
            <div style=\"font-size:10px;color:{GRIS};\">{}</div>{vigencia}
        </div>",
        escapar_html(ctx.medico_nombre),
    )
}

/// Arma el HTML del documento recorriendo los bloques de la plantilla en su orden de impresión.
/// Los bloques sin contenido no se imprimen.
pub fn generar_html_documento(ctx: &ContextoDocumento) -> String {
    let mut cuerpo = String::new();
    for bloque in ctx.bloques {
        let titulo = bloque.titulo.as_str();
        let html = match bloque.clave.as_str() {
            "membrete" => bloque_membrete(ctx),
            "datos_paciente" => bloque_paciente(ctx),
            "medicamentos" => bloque_medicamentos(ctx, titulo),
            "posologia" => bloque_posologia(ctx, titulo),
            "pruebas" => bloque_pruebas(ctx, "Se solicita"),
            "firma" => bloque_firma(ctx),
            "codigo_verificacion" => format!(
                "<div style=\"margin-top:10px;font-size:9px;color:{GRIS};\">Código de verificación: {}</div>",
                escapar_html(ctx.numero)
            ),
            "indicaciones_generales" => {
                let incluir = ctx.datos.get("incluirIndicaciones").and_then(Value::as_bool).unwrap_or(true);
                let texto = texto_de(ctx.datos, "indicacionesGenerales");
                if incluir && !texto.is_empty() { seccion(titulo, &parrafo(texto)) } else { String::new() }
            }
            "diagnostico" | "preparacion" | "resumen_clinico" => {
                let clave_dato = if bloque.clave == "resumen_clinico" { "resumen" } else { bloque.clave.as_str() };
                let texto = texto_de(ctx.datos, clave_dato);
                if texto.is_empty() { String::new() } else { seccion(titulo, &parrafo(texto)) }
            }
            // Bloques de texto propios de la plantilla.
            clave => {
                let texto = ctx.datos.get("textos").and_then(|t| t.get(clave)).and_then(Value::as_str).map(str::trim).unwrap_or("");
                if texto.is_empty() { String::new() } else { seccion(titulo, &parrafo(texto)) }
            }
        };
        cuerpo.push_str(&html);
    }

    let pie = ctx.membrete.pie_pagina.clone().unwrap_or_default();
    format!(
        "<html>
            <body style=\"padding:12mm;font-family:sans-serif;color:{TINTA};\">
                {cuerpo}
                <div style=\"margin-top:10mm;font-size:9px;color:{GRIS};border-top:1px solid {LINEA};padding-top:5px;white-space:pre-wrap;\">{}</div>
            </body>
        </html>",
        escapar_html(&pie),
    )
}

/// `papel`: "media_carta" (139,7 × 215,9 mm) o carta (215,9 × 279,4 mm).
pub fn generar_pdf(html: &str, papel: &str) -> Result<Vec<u8>, String> {
    let images = BTreeMap::new();
    let fonts = BTreeMap::new();
    let (ancho, alto) = if papel == "media_carta" { (139.7, 215.9) } else { (215.9, 279.4) };
    let options = GeneratePdfOptions { page_width: Some(ancho), page_height: Some(alto), ..Default::default() };
    let mut warnings = Vec::new();

    let doc = PdfDocument::from_html(html, &images, &fonts, &options, &mut warnings)
        .map_err(|e| format!("No se pudo generar el PDF: {e:?}"))?;

    let mut save_warnings = Vec::new();
    Ok(doc.save(&PdfSaveOptions::default(), &mut save_warnings))
}
