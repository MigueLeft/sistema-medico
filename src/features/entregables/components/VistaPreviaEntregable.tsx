import type { ReactNode } from 'react';
import type { BloquePlantilla, DatosEntregable, ItemEntregablePayload, PlantillaDocumento, PlantillaEntregable } from '../types';

export interface DatosPreviaPaciente {
  nombre: string;
  documento: string;
  edad: number;
  sexo: string;
  historia: string;
}

interface VistaPreviaEntregableProps {
  plantilla: PlantillaDocumento;
  membrete: PlantillaEntregable | undefined;
  numero: string;
  /** dd/mm/aaaa */
  fecha: string;
  paciente: DatosPreviaPaciente;
  medico: string;
  datos: DatosEntregable;
  /** Solo los items incluidos. */
  items: ItemEntregablePayload[];
}

function Seccion({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="ap-papel-seccion">
      <div className="ap-papel-titulo">{titulo}</div>
      {children}
    </div>
  );
}

/** «7 días» -> «por 7 días»; «Continuo» -> «de forma continua». */
function duracion(valor: string | null | undefined): string | null {
  if (!valor) return null;
  return valor.trim().toLowerCase().startsWith('continu') ? 'de forma continua' : `por ${valor.toLowerCase()}`;
}

function pauta(m: ItemEntregablePayload): string {
  const partes = [m.dosis ? `Tomar ${m.dosis}` : null, m.via ? `vía ${m.via.toLowerCase()}` : null, m.frecuencia?.toLowerCase(), duracion(m.duracion)];
  return `${partes.filter(Boolean).join(', ')}.${m.indicaciones ? ` ${m.indicaciones}` : ''}`;
}

/** Vista previa en pantalla del documento: recorre los bloques de la plantilla igual que el PDF. */
export function VistaPreviaEntregable({ plantilla, membrete, numero, fecha, paciente, medico, datos, items }: VistaPreviaEntregableProps) {
  const texto = (valor: string | undefined) => (valor && valor.trim() !== '' ? valor.trim() : null);

  const bloque = (b: BloquePlantilla): ReactNode => {
    switch (b.clave) {
      case 'membrete':
        return (
          <div className="ap-papel-membrete">
            <div>
              <b>{membrete?.nombreConsultorio || '[Nombre del consultorio]'}</b>
              <div>{medico}</div>
              {membrete?.encabezado ? <div className="cl-muted">{membrete.encabezado}</div> : null}
            </div>
            <div style={{ textAlign: 'right' }}>
              <b>{plantilla.nombre.toUpperCase()}</b>
              <div className="cl-code">{numero}</div>
              <div className="cl-code">{fecha}</div>
            </div>
          </div>
        );
      case 'datos_paciente':
        return (
          <div className="ap-papel-paciente">
            <span>
              <b>Paciente:</b> {paciente.nombre}
            </span>
            <span>
              <b>C.I.:</b> {paciente.documento}
            </span>
            <span>
              <b>Edad:</b> {paciente.edad} años · {paciente.sexo}
            </span>
            <span>
              <b>Historia:</b> {paciente.historia}
            </span>
          </div>
        );
      case 'medicamentos':
        return items.length > 0 ? (
          <Seccion titulo={b.titulo}>
            {items.map((m, i) => (
              <div key={`${m.nombre}-${i}`} className="ap-papel-fila">
                <b>
                  {i + 1}. {m.nombre}
                </b>
                {m.cantidad ? <div>Cantidad: {m.cantidad}</div> : null}
              </div>
            ))}
          </Seccion>
        ) : null;
      case 'posologia':
        return items.length > 0 ? (
          <Seccion titulo={b.titulo}>
            {items.map((m, i) => (
              <div key={`${m.nombre}-${i}`} className="ap-papel-fila">
                <b>{m.nombre}</b>
                <div>{pauta(m)}</div>
              </div>
            ))}
          </Seccion>
        ) : null;
      case 'pruebas':
        return items.length > 0 ? (
          <>
            {texto(datos.prioridad) ? (
              <div>
                <b>Prioridad:</b> {datos.prioridad}
              </div>
            ) : null}
            {texto(datos.laboratorio) ? (
              <div>
                <b>Laboratorio sugerido:</b> {datos.laboratorio}
              </div>
            ) : null}
            <Seccion titulo="Se solicita">
              {items.map((p, i) => (
                <div key={`${p.nombre}-${i}`} className="ap-papel-fila ap-papel-prueba">
                  <span>
                    {i + 1}. {p.nombre}
                  </span>
                  {p.codigo ? <span className="cl-code cl-muted">LOINC {p.codigo}</span> : null}
                </div>
              ))}
            </Seccion>
          </>
        ) : null;
      case 'indicaciones_generales':
        return datos.incluirIndicaciones !== false && texto(datos.indicacionesGenerales) ? <Seccion titulo={b.titulo}>{datos.indicacionesGenerales}</Seccion> : null;
      case 'diagnostico':
        return texto(datos.diagnostico) ? <Seccion titulo={b.titulo}>{datos.diagnostico}</Seccion> : null;
      case 'preparacion':
        return texto(datos.preparacion) ? <Seccion titulo={b.titulo}>{datos.preparacion}</Seccion> : null;
      case 'resumen_clinico':
        return texto(datos.resumen) ? <Seccion titulo={b.titulo}>{datos.resumen}</Seccion> : null;
      case 'firma':
        return (
          <div className="ap-papel-firma">
            <div />
            Firma y sello
            <span className="cl-muted">{medico}</span>
            {plantilla.clave === 'recipe' && datos.vigenciaDias ? <span className="cl-muted">Válido por {datos.vigenciaDias} días</span> : null}
          </div>
        );
      case 'codigo_verificacion':
        return <div className="cl-muted ap-papel-codigo">Código de verificación: {numero}</div>;
      default: {
        const valor = texto(datos.textos?.[b.clave]);
        return valor ? <Seccion titulo={b.titulo}>{valor}</Seccion> : null;
      }
    }
  };

  return (
    <div className={`ap-papel${plantilla.papel === 'media_carta' ? ' ap-papel-media' : ''}`}>
      {plantilla.bloques.map((b) => (
        <div key={b.clave}>{bloque(b)}</div>
      ))}
      {membrete?.piePagina ? <div className="ap-papel-pie cl-muted">{membrete.piePagina}</div> : null}
    </div>
  );
}
