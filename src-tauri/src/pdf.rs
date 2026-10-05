use std::collections::BTreeMap;

use printpdf::{GeneratePdfOptions, PdfDocument, PdfSaveOptions};

use crate::models::{DatosItem, PlantillaEntregable};

fn escapar_html(texto: &str) -> String {
    texto
        .replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
        .replace('"', "&quot;")
}

fn titulo_por_defecto(tipo: &str) -> String {
    match tipo {
        "receta" => "Récipe médico".to_string(),
        "orden_lab" => "Orden de laboratorio / imagenología".to_string(),
        "informe" => "Informe médico".to_string(),
        "constancia" => "Constancia médica".to_string(),
        otro => otro.to_string(),
    }
}

fn render_medicamentos(items: &[DatosItem]) -> String {
    if items.is_empty() {
        return "<p style=\"color:#5c6b73;\">Sin medicamentos indicados.</p>".to_string();
    }
    let filas: String = items
        .iter()
        .map(|i| {
            format!(
                "<tr>
                    <td style=\"padding:6px;border-bottom:1px solid #c2dfe3;\">{}</td>
                    <td style=\"padding:6px;border-bottom:1px solid #c2dfe3;\">{}</td>
                    <td style=\"padding:6px;border-bottom:1px solid #c2dfe3;\">{}</td>
                    <td style=\"padding:6px;border-bottom:1px solid #c2dfe3;\">{}</td>
                    <td style=\"padding:6px;border-bottom:1px solid #c2dfe3;\">{}</td>
                </tr>",
                escapar_html(i.nombre.as_deref().unwrap_or("")),
                escapar_html(i.dosis.as_deref().unwrap_or("")),
                escapar_html(i.frecuencia.as_deref().unwrap_or("")),
                escapar_html(i.duracion.as_deref().unwrap_or("")),
                escapar_html(i.via.as_deref().unwrap_or("")),
            )
        })
        .collect();

    let indicaciones: String = items
        .iter()
        .filter_map(|i| i.indicaciones.as_ref().filter(|t| !t.trim().is_empty()))
        .map(|t| format!("<p style=\"font-size:11px;color:#5c6b73;\">— {}</p>", escapar_html(t)))
        .collect();

    format!(
        "<table style=\"width:100%;border-collapse:collapse;font-size:12px;\">
            <thead>
                <tr style=\"background:#253237;color:#e0fbfc;\">
                    <th style=\"padding:6px;text-align:left;\">Medicamento</th>
                    <th style=\"padding:6px;text-align:left;\">Dosis</th>
                    <th style=\"padding:6px;text-align:left;\">Frecuencia</th>
                    <th style=\"padding:6px;text-align:left;\">Duración</th>
                    <th style=\"padding:6px;text-align:left;\">Vía</th>
                </tr>
            </thead>
            <tbody>{filas}</tbody>
        </table>
        {indicaciones}"
    )
}

fn render_examenes(items: &[DatosItem]) -> String {
    if items.is_empty() {
        return "<p style=\"color:#5c6b73;\">Sin exámenes solicitados.</p>".to_string();
    }
    let filas: String = items
        .iter()
        .enumerate()
        .map(|(idx, i)| {
            format!(
                "<li style=\"margin-bottom:6px;\"><strong>{}. {}</strong>{}{}</li>",
                idx + 1,
                escapar_html(i.nombre.as_deref().unwrap_or("")),
                i.categoria
                    .as_ref()
                    .filter(|t| !t.trim().is_empty())
                    .map(|c| format!(" <span style=\"color:#5c6b73;\">({})</span>", escapar_html(c)))
                    .unwrap_or_default(),
                i.indicaciones
                    .as_ref()
                    .filter(|t| !t.trim().is_empty())
                    .map(|t| format!("<div style=\"font-size:11px;color:#5c6b73;\">{}</div>", escapar_html(t)))
                    .unwrap_or_default(),
            )
        })
        .collect();

    format!("<ul style=\"font-size:12px;padding-left:18px;\">{filas}</ul>")
}

fn render_texto(items: &[DatosItem]) -> String {
    if items.is_empty() {
        return "<p style=\"color:#5c6b73;\">Sin contenido.</p>".to_string();
    }
    items
        .iter()
        .filter_map(|i| i.texto.as_ref())
        .map(|t| format!("<p style=\"font-size:12px;white-space:pre-wrap;\">{}</p>", escapar_html(t)))
        .collect()
}

#[allow(clippy::too_many_arguments)]
pub fn generar_html_entregable(
    plantilla: &PlantillaEntregable,
    paciente_nombre: &str,
    paciente_documento: &str,
    fecha: &str,
    tipo: &str,
    titulo: &Option<String>,
    items: &[DatosItem],
) -> String {
    let nombre_consultorio = plantilla.nombre_consultorio.clone().unwrap_or_else(|| "Consultorio Médico".to_string());
    let encabezado = plantilla.encabezado.clone().unwrap_or_default();
    let pie = plantilla.pie_pagina.clone().unwrap_or_default();
    let titulo_doc = titulo.clone().unwrap_or_else(|| titulo_por_defecto(tipo));

    let cuerpo = match tipo {
        "receta" => render_medicamentos(items),
        "orden_lab" => render_examenes(items),
        _ => render_texto(items),
    };

    format!(
        "<html>
            <body style=\"padding:15mm;font-family:sans-serif;color:#253237;\">
                <div style=\"text-align:center;border-bottom:2px solid #253237;padding-bottom:8px;margin-bottom:14px;\">
                    <div style=\"font-size:18px;font-weight:bold;\">{}</div>
                    <div style=\"font-size:11px;color:#5c6b73;white-space:pre-wrap;\">{}</div>
                </div>
                <div style=\"font-size:15px;font-weight:bold;margin-bottom:4px;\">{}</div>
                <div style=\"font-size:11px;color:#5c6b73;margin-bottom:14px;\">
                    Paciente: {} ({}) &mdash; Fecha: {}
                </div>
                {}
                <div style=\"margin-top:24mm;font-size:10px;color:#5c6b73;border-top:1px solid #c2dfe3;padding-top:6px;white-space:pre-wrap;\">
                    {}
                </div>
            </body>
        </html>",
        escapar_html(&nombre_consultorio),
        escapar_html(&encabezado),
        escapar_html(&titulo_doc),
        escapar_html(paciente_nombre),
        escapar_html(paciente_documento),
        escapar_html(fecha),
        cuerpo,
        escapar_html(&pie),
    )
}

pub fn generar_pdf(html: &str) -> Result<Vec<u8>, String> {
    let images = BTreeMap::new();
    let fonts = BTreeMap::new();
    let options = GeneratePdfOptions::default();
    let mut warnings = Vec::new();

    let doc = PdfDocument::from_html(html, &images, &fonts, &options, &mut warnings)
        .map_err(|e| format!("No se pudo generar el PDF: {e:?}"))?;

    let mut save_warnings = Vec::new();
    Ok(doc.save(&PdfSaveOptions::default(), &mut save_warnings))
}
