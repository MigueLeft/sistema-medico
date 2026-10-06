import { type ReactNode, useMemo, useState } from 'react';
import { Link } from '@mui/material';
import { AlertBanner, BotonIcono, Button, Card, Checkbox, type Concepto, Select, TerminologySearch, TextField, Vacio } from '@/components/ui';
import { buscarConceptos, useCatalogo, type ParaclinicoCatalogo } from '@/features/catalogos';
import { fechaCorta } from '@/lib/formato';
import { useAbrirEntregable, useEmitirEntregable, useGuardarEntregable } from '../hooks/useEntregables';
import type { DatosEntregable, Entregable, ItemEntregablePayload, PlantillaDocumento, PlantillaEntregable } from '../types';
import { PAPELES, tieneBloque } from './bloques';
import { type DatosPreviaPaciente, VistaPreviaEntregable } from './VistaPreviaEntregable';

interface EditorEntregableProps {
  entregable: Entregable;
  plantilla: PlantillaDocumento;
  membrete: PlantillaEntregable | undefined;
  paciente: DatosPreviaPaciente;
  medico: string;
  /** Texto de la consulta para la línea de contexto: «Consulta del 05/10/2026». */
  consultaFecha: string;
  /** Diagnósticos de la consulta, como opciones de «Diagnóstico que la justifica». */
  diagnosticos: string[];
  /** Medicamentos del tratamiento con alerta de alergia: id de catálogo -> texto de la alerta. */
  alertasMedicamento: Record<string, string>;
  /** Fecha de la próxima cita del paciente, si la tiene. */
  proximaCita: string | null;
  onVolver: () => void;
  onEditarTratamiento: () => void;
}

function sinId(items: Entregable['items']): ItemEntregablePayload[] {
  return items.map((it) => {
    const copia: ItemEntregablePayload & { id?: string; orden?: number } = { ...it };
    delete copia.id;
    delete copia.orden;
    return copia;
  });
}

const ARTICULO: Record<string, string> = { recipe: 'récipe', orden_lab: 'orden', orden_imagen: 'orden', referencia: 'referencia', informe: 'informe', constancia: 'constancia' };

/** Editor de un entregable: una tarjeta por cada bloque editable de su plantilla y la vista previa al lado. */
export function EditorEntregable({
  entregable,
  plantilla,
  membrete,
  paciente,
  medico,
  consultaFecha,
  diagnosticos,
  alertasMedicamento,
  proximaCita,
  onVolver,
  onEditarTratamiento,
}: EditorEntregableProps) {
  const guardar = useGuardarEntregable();
  const emitir = useEmitirEntregable();
  const abrir = useAbrirEntregable();
  const soloLectura = entregable.estado !== 'borrador';

  const [datos, setDatos] = useState<DatosEntregable>(() => ({ textos: {}, ...entregable.datos }));
  // Los medicamentos con alerta de alergia sin resolver quedan fuera del documento.
  const [items, setItems] = useState<ItemEntregablePayload[]>(() =>
    sinId(entregable.items).map((it) => (it.referenciaId && alertasMedicamento[it.referenciaId] && !soloLectura ? { ...it, incluido: false } : it)),
  );
  const { data: catalogo = [] } = useCatalogo<ParaclinicoCatalogo>('paraclinicos', { filtros: { favorito: '1' } });

  const cambiar = (cambios: Partial<DatosEntregable>) => setDatos((d) => ({ ...d, ...cambios }));
  const cambiarItem = (indice: number, cambios: Partial<ItemEntregablePayload>) => setItems((lista) => lista.map((it, i) => (i === indice ? { ...it, ...cambios } : it)));
  const incluidos = items.filter((it) => it.incluido !== false);

  const conMedicamentos = tieneBloque(plantilla, 'medicamentos', 'posologia');
  const conPruebas = tieneBloque(plantilla, 'pruebas');
  const bloquesTexto = plantilla.bloques.filter((b) => b.modo === 'texto');
  const excluidosPorAlerta = items.filter((it) => it.referenciaId && alertasMedicamento[it.referenciaId]);
  const generaPendientes = plantilla.generaPendientes && datos.generarPendientes !== false;
  const totalPendientes = !generaPendientes ? 0 : plantilla.pendienteCuantos === 'uno_por_item' ? incluidos.length : 1;

  const perfiles = useMemo(() => {
    const esImagen = plantilla.clave === 'orden_imagen';
    const grupos = new Map<string, ParaclinicoCatalogo[]>();
    for (const p of catalogo) {
      if (!p.grupo || (p.categoria === 'imagenologia') !== esImagen) continue;
      grupos.set(p.grupo, [...(grupos.get(p.grupo) ?? []), p]);
    }
    return [...grupos.entries()];
  }, [catalogo, plantilla.clave]);

  const agregarPrueba = (p: { id?: string; nombre: string; codigo: string | null }) =>
    setItems((lista) =>
      lista.some((it) => (p.id && it.referenciaId === p.id) || it.nombre === p.nombre)
        ? lista
        : [...lista, { tipoItem: 'examen', nombre: p.nombre, codigo: p.codigo, referenciaId: p.id ?? null, incluido: true }],
    );

  const payload = () => ({ datos, items });
  const guardarYLuego = (despues: (e: Entregable) => void) => guardar.mutate({ id: entregable.id, payload: payload() }, { onSuccess: despues });
  const ocupado = guardar.isPending || emitir.isPending;
  const articulo = ARTICULO[plantilla.clave] ?? 'documento';

  const acciones: ReactNode = soloLectura ? (
    <Button variant="primary" disabled={abrir.isPending} onClick={() => abrir.mutate(entregable.id)}>
      Abrir PDF
    </Button>
  ) : (
    <>
      <Button disabled={ocupado} onClick={() => guardarYLuego(() => undefined)}>
        Guardar borrador
      </Button>
      <Button disabled={ocupado} title="Abre una vista previa en PDF para imprimirla" onClick={() => guardarYLuego((e) => abrir.mutate(e.id))}>
        Imprimir
      </Button>
      <Button variant="primary" disabled={ocupado} onClick={() => guardarYLuego((e) => emitir.mutate(e.id, { onSuccess: onVolver }))}>
        Emitir {articulo}
      </Button>
    </>
  );

  return (
    <>
      <div className="cl-row" style={{ gap: 'var(--space-3)' }}>
        <Link component="button" type="button" underline="hover" onClick={onVolver}>
          ‹ Entregables de la consulta
        </Link>
        <span className="cl-muted" style={{ flex: 1 }}>
          {paciente.nombre} · {paciente.historia} · Consulta del {consultaFecha}
        </span>
        {acciones}
      </div>

      <div className="ap-editor">
        <div className="ap-stack">
          {soloLectura ? <AlertBanner title="Documento emitido">Se emitió el {fechaCorta(entregable.emitidoAt)}. Ya no admite cambios.</AlertBanner> : null}

          {conMedicamentos && excluidosPorAlerta.length > 0 && !soloLectura ? (
            <AlertBanner tone="warning" title={`${excluidosPorAlerta.map((it) => it.nombre).join(', ')} no se incluye`}>
              Tiene una alerta de alergia en Tratamiento ({excluidosPorAlerta.map((it) => alertasMedicamento[it.referenciaId!]).join(', ')}). Quítelo del tratamiento o
              márquelo aquí si confirma que es seguro.
            </AlertBanner>
          ) : null}

          {conMedicamentos ? (
            <>
              <Card
                title="Medicamentos del tratamiento"
                flush
                actions={
                  soloLectura ? null : (
                    <Link component="button" type="button" onClick={onEditarTratamiento}>
                      Editar tratamiento
                    </Link>
                  )
                }
              >
                {items.length === 0 ? <Vacio>El tratamiento de la consulta no tiene medicamentos.</Vacio> : null}
                {items.map((m, i) => (
                  <div key={`${m.referenciaId}-${i}`} className="ap-item-med">
                    <Checkbox checked={m.incluido !== false} disabled={soloLectura} onChange={(v) => cambiarItem(i, { incluido: v })}>
                      <b>{m.nombre}</b>
                      <div className="cl-hint">{[m.dosis, m.frecuencia?.toLowerCase(), m.duracion?.toLowerCase()].filter(Boolean).join(' · ')}</div>
                    </Checkbox>
                    <TextField label="Cantidad" placeholder="30 (treinta)" value={m.cantidad ?? ''} readOnly={soloLectura} onChange={(v) => cambiarItem(i, { cantidad: v })} />
                  </div>
                ))}
              </Card>

              <Card title="Formato">
                <div className="ap-grid ap-grid-2">
                  <Select label="Papel" value={plantilla.papel} disabled onChange={() => undefined} options={Object.entries(PAPELES).map(([value, label]) => ({ value, label }))} hint="Se define en la plantilla." />
                  <Select
                    label="Vigencia"
                    value={String(datos.vigenciaDias ?? 30)}
                    disabled={soloLectura}
                    onChange={(v) => cambiar({ vigenciaDias: Number(v) })}
                    options={[7, 15, 30, 60, 90].map((d) => ({ value: String(d), label: `${d} días` }))}
                  />
                </div>
                {tieneBloque(plantilla, 'indicaciones_generales') ? (
                  <>
                    <Checkbox checked={datos.incluirIndicaciones !== false} disabled={soloLectura} onChange={(v) => cambiar({ incluirIndicaciones: v })}>
                      Incluir indicaciones generales (dieta, actividad, controles)
                    </Checkbox>
                    {datos.incluirIndicaciones !== false ? (
                      <TextField label="Indicaciones generales" multiline rows={3} value={datos.indicacionesGenerales ?? ''} readOnly={soloLectura} onChange={(v) => cambiar({ indicacionesGenerales: v })} />
                    ) : null}
                  </>
                ) : null}
              </Card>
            </>
          ) : null}

          {conPruebas ? (
            <>
              <Card title="Datos de la orden">
                <div className="ap-grid ap-grid-2">
                  <Select label="Plantilla" value="p" disabled onChange={() => undefined} options={[{ value: 'p', label: plantilla.nombre }]} />
                  <Select label="Prioridad" value={datos.prioridad ?? 'Rutina'} disabled={soloLectura} onChange={(v) => cambiar({ prioridad: v })} options={['Rutina', 'Preferente', 'Urgente']} />
                </div>
                {tieneBloque(plantilla, 'diagnostico') ? (
                  <Select
                    label="Diagnóstico que la justifica"
                    value={datos.diagnostico ?? ''}
                    disabled={soloLectura}
                    placeholder="Sin diagnóstico"
                    onChange={(v) => cambiar({ diagnostico: v })}
                    options={[...new Set([...diagnosticos, datos.diagnostico ?? ''].filter(Boolean))]}
                  />
                ) : null}
                <TextField label="Laboratorio sugerido" placeholder="Cualquier laboratorio" value={datos.laboratorio ?? ''} readOnly={soloLectura} onChange={(v) => cambiar({ laboratorio: v })} />
              </Card>

              <Card title={plantilla.clave === 'orden_imagen' ? 'Estudios' : 'Pruebas'} aside={plantilla.clave === 'orden_imagen' ? undefined : 'LOINC'} flush>
                {soloLectura ? null : (
                  <div className="ap-card-body" style={{ borderBottom: '1px solid var(--line)' }}>
                    <TerminologySearch
                      label={plantilla.clave === 'orden_imagen' ? 'Agregar estudio' : 'Agregar prueba'}
                      placeholder="Ej.: glucosa, perfil lipídico, 2345-7"
                      sistema="LOINC"
                      claveCache="paraclinico"
                      buscar={buscarConceptos.paraclinicos}
                      onSelect={(c: Concepto) => agregarPrueba(c)}
                      onCrear={(nombre) => agregarPrueba({ nombre, codigo: null })}
                    />
                    {perfiles.length > 0 ? (
                      <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
                        <span className="cl-hint">Perfiles frecuentes:</span>
                        {perfiles.map(([grupo, pruebas]) => (
                          <Button key={grupo} size="sm" onClick={() => pruebas.forEach((p) => agregarPrueba({ id: p.id, nombre: p.nombre, codigo: p.codigoLoinc }))}>
                            {grupo}
                          </Button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                )}
                {items.length === 0 ? <Vacio>Agregue al menos una prueba.</Vacio> : null}
                {items.map((p, i) => (
                  <div key={`${p.nombre}-${i}`} className="cl-entry ap-entry-2">
                    <div className="cl-entry-main">
                      <div className="cl-entry-term">{p.nombre}</div>
                      <div className="cl-entry-sub">{p.codigo ? <span className="cl-sys cl-sys-loinc">LOINC {p.codigo}</span> : <span className="cl-sys cl-sys-local">sin código</span>}</div>
                    </div>
                    {soloLectura ? null : (
                      <BotonIcono icon="x" label={`Quitar ${p.nombre}`} onClick={() => setItems((lista) => lista.filter((_, j) => j !== i))} />
                    )}
                  </div>
                ))}
              </Card>
            </>
          ) : null}

          {tieneBloque(plantilla, 'diagnostico') && !conPruebas ? (
            <Card title="Diagnóstico">
              <TextField value={datos.diagnostico ?? ''} readOnly={soloLectura} onChange={(v) => cambiar({ diagnostico: v })} />
            </Card>
          ) : null}

          {tieneBloque(plantilla, 'indicaciones_generales') && !conMedicamentos ? (
            <Card title="Indicaciones generales">
              <TextField multiline rows={5} value={datos.indicacionesGenerales ?? ''} readOnly={soloLectura} onChange={(v) => cambiar({ indicacionesGenerales: v })} />
            </Card>
          ) : null}

          {tieneBloque(plantilla, 'resumen_clinico') ? (
            <Card title="Resumen clínico" subtitle="Se precarga con lo registrado en la consulta; ajústelo si hace falta.">
              <TextField multiline rows={7} value={datos.resumen ?? ''} readOnly={soloLectura} onChange={(v) => cambiar({ resumen: v })} />
            </Card>
          ) : null}

          {bloquesTexto.length > 0 ? (
            <Card title="Contenido">
              {bloquesTexto.map((b) => (
                <TextField
                  key={b.clave}
                  label={b.titulo}
                  multiline
                  rows={b.clave === 'especialidad' ? 1 : 3}
                  value={datos.textos?.[b.clave] ?? ''}
                  readOnly={soloLectura}
                  onChange={(v) => cambiar({ textos: { ...datos.textos, [b.clave]: v } })}
                />
              ))}
            </Card>
          ) : null}

          {tieneBloque(plantilla, 'preparacion') || plantilla.generaPendientes ? (
            <Card title={tieneBloque(plantilla, 'preparacion') ? 'Preparación y seguimiento' : 'Seguimiento'}>
              {tieneBloque(plantilla, 'preparacion') ? (
                <TextField label="Indicaciones de preparación" multiline rows={3} value={datos.preparacion ?? ''} readOnly={soloLectura} onChange={(v) => cambiar({ preparacion: v })} />
              ) : null}
              {plantilla.generaPendientes ? (
                <Checkbox checked={datos.generarPendientes !== false} disabled={soloLectura} onChange={(v) => cambiar({ generarPendientes: v })}>
                  <b>Generar pendientes al emitir</b>
                  <div className="cl-hint">
                    {plantilla.pendienteCuantos === 'uno_por_item'
                      ? 'Un pendiente por prueba: el paciente debe traer los resultados a la próxima consulta.'
                      : 'Un pendiente por el documento: el paciente debe traerlo a la próxima consulta.'}
                    {proximaCita ? ` Próxima cita: ${fechaCorta(proximaCita)}.` : ''}
                  </div>
                </Checkbox>
              ) : null}
            </Card>
          ) : null}
        </div>

        <div className="ap-stack" style={{ position: 'sticky', top: 0 }}>
          <div className="cl-row" style={{ justifyContent: 'space-between' }}>
            <span className="cl-hint" style={{ fontWeight: 600 }}>
              Vista previa · {PAPELES[plantilla.papel]}
            </span>
            {totalPendientes > 0 ? (
              <span className="cl-hint">
                Al emitir: {totalPendientes} {totalPendientes === 1 ? 'pendiente' : 'pendientes'}
                {proximaCita ? ` para el ${fechaCorta(proximaCita)}` : ''}
              </span>
            ) : null}
          </div>
          <VistaPreviaEntregable
            plantilla={plantilla}
            membrete={membrete}
            numero={entregable.numero ?? ''}
            fecha={fechaCorta(entregable.fechaEmision)}
            paciente={paciente}
            medico={medico}
            datos={datos}
            items={incluidos}
          />
        </div>
      </div>
    </>
  );
}
