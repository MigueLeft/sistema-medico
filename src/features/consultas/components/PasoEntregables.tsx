import { useState } from 'react';
import { ButtonBase } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { Badge, Button, Card, Icon, PendingList, Select, TextField, Vacio } from '@/components/ui';
import {
  descripcionPlantilla,
  iconoDe,
  useAbrirEntregable,
  useCrearEntregable,
  useEliminarEntregable,
  useEmitirEntregable,
  useEntregablesConsulta,
  usePlantillasDocumento,
  type Entregable,
} from '@/features/entregables';
import {
  aItemPendiente,
  estaAbierto,
  useAbrirArchivoPendiente,
  useAdjuntarPendiente,
  useCrearPendiente,
  useEliminarPendiente,
  type Pendiente,
  type TipoPendiente,
} from '@/features/pendientes';
import { fechaCorta } from '@/lib/formato';
import type { Consulta } from '../types';

interface PasoEntregablesProps {
  consulta: Consulta;
  pendientes: Pendiente[];
  /** Fecha de la próxima cita del paciente, si la tiene. */
  proximaCita: string | null;
  soloLectura: boolean;
}

/** Resumen de una línea del contenido del documento para la lista. */
function resumen(e: Entregable): string {
  const items = e.items.filter((i) => i.incluido !== false).map((i) => i.nombre);
  const textos = Object.values(e.datos.textos ?? {}).filter((t) => t.trim() !== '');
  return [...items, ...textos, e.datos.preparacion, items.length === 0 ? e.datos.indicacionesGenerales : null].filter(Boolean).join(' · ') || 'Sin contenido todavía';
}

export function PasoEntregables({ consulta, pendientes, proximaCita, soloLectura }: PasoEntregablesProps) {
  const navigate = useNavigate();
  const { data: plantillas = [] } = usePlantillasDocumento();
  const { data: entregables = [] } = useEntregablesConsulta(consulta.id);
  const crear = useCrearEntregable();
  const emitir = useEmitirEntregable();
  const abrir = useAbrirEntregable();
  const eliminar = useEliminarEntregable();
  const crearPendiente = useCrearPendiente();
  const eliminarPendiente = useEliminarPendiente(consulta.pacienteId);
  const adjuntar = useAdjuntarPendiente();
  const abrirArchivo = useAbrirArchivoPendiente();
  const [nuevoPendiente, setNuevoPendiente] = useState<{ tipo: TipoPendiente; nombre: string } | null>(null);

  const editar = (id: string) => navigate({ to: '/entregables/$entregableId', params: { entregableId: id } });
  const abiertos = pendientes.filter(estaAbierto);
  const emitidos = entregables.filter((e) => e.estado === 'emitido');

  return (
    <>
      {soloLectura ? null : (
        <Card id="sec-entregables" title="Nuevo entregable" subtitle="Cada tipo sale de una plantilla configurable. Los que esperan un resultado generan pendientes para la próxima consulta.">
          <div className="ap-plantillas">
            {plantillas
              .filter((p) => p.activa)
              .map((p) => (
                <ButtonBase
                  key={p.id}
                  focusRipple
                  className="ap-plantilla"
                  disabled={crear.isPending}
                  onClick={() => crear.mutate({ consultaId: consulta.id, plantillaDocumentoId: p.id }, { onSuccess: (e) => editar(e.id) })}
                >
                  <Icon name={iconoDe(p.clave)} />
                  <b>{p.nombre}</b>
                  <span>{descripcionPlantilla(p)}</span>
                </ButtonBase>
              ))}
          </div>
          <span className="cl-hint">Las plantillas se administran en Configuración › Plantillas de entregables.</span>
        </Card>
      )}

      <Card
        id={soloLectura ? 'sec-entregables' : undefined}
        title="Entregables de esta consulta"
        flush
        actions={
          emitidos.length > 1 ? (
            <Button size="sm" icon="upload" title="Abre el PDF de cada documento emitido" onClick={() => emitidos.forEach((e) => abrir.mutate(e.id))}>
              Imprimir todos
            </Button>
          ) : null
        }
      >
        {entregables.length === 0 ? <Vacio>Aún no se han preparado documentos en esta consulta.</Vacio> : null}
        {entregables.map((e) => (
          <div key={e.id} className="ap-entregable">
            <Icon name={iconoDe(e.tipo)} />
            <div style={{ minWidth: 0 }}>
              <div>
                <b>{e.plantillaNombre ?? e.titulo ?? 'Documento'}</b> <span className="cl-code cl-muted">{e.numero}</span>
              </div>
              <div className="cl-hint" style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {resumen(e)}
              </div>
              {e.pendientesGenerados > 0 ? (
                <div className="ap-entregable-genera">
                  Genera {e.pendientesGenerados} {e.pendientesGenerados === 1 ? 'pendiente' : 'pendientes'}
                </div>
              ) : null}
            </div>
            <Badge tone={e.estado === 'borrador' ? 'warning' : 'slate'} dot>
              {e.estado === 'borrador' ? 'Borrador' : 'Emitida'}
            </Badge>
            <div className="ap-inline">
              {e.estado === 'borrador' ? (
                <>
                  <Button size="sm" onClick={() => editar(e.id)}>
                    Abrir
                  </Button>
                  <Button size="sm" variant="quiet" disabled={emitir.isPending} onClick={() => emitir.mutate(e.id)}>
                    Emitir
                  </Button>
                  <Button size="sm" variant="quiet" disabled={eliminar.isPending} onClick={() => eliminar.mutate(e.id)}>
                    Descartar
                  </Button>
                </>
              ) : (
                <>
                  <Button size="sm" onClick={() => editar(e.id)}>
                    Abrir
                  </Button>
                  <Button size="sm" variant="quiet" disabled={abrir.isPending} onClick={() => abrir.mutate(e.id)}>
                    Reimprimir
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </Card>

      <Card
        id="sec-pendientes-proxima"
        title="Pendientes que generan"
        subtitle={`Lo que el paciente debe traer a la próxima cita${proximaCita ? ` (${fechaCorta(proximaCita)})` : ''}. Se revisan al iniciar esa consulta; si ya tiene el documento, puede cargarlo aquí.`}
        flush
        actions={
          soloLectura ? null : (
            <Button variant="quiet" icon="plus" onClick={() => setNuevoPendiente({ tipo: 'documento', nombre: '' })}>
              Agregar pendiente
            </Button>
          )
        }
      >
        {nuevoPendiente ? (
          <div className="ap-med-form">
            <div className="ap-inline" style={{ alignItems: 'flex-end' }}>
              <Select
                label="Tipo"
                style={{ width: 160 }}
                value={nuevoPendiente.tipo}
                onChange={(v) => setNuevoPendiente({ ...nuevoPendiente, tipo: v as TipoPendiente })}
                options={[
                  { value: 'documento', label: 'Documento' },
                  { value: 'registro', label: 'Registro' },
                  { value: 'paraclinico', label: 'Paraclínico' },
                ]}
              />
              <TextField
                label="Qué debe traer"
                style={{ flex: 1 }}
                autoFocus
                placeholder="Ej.: registro de presión arterial en casa"
                value={nuevoPendiente.nombre}
                onChange={(v) => setNuevoPendiente({ ...nuevoPendiente, nombre: v })}
              />
              <Button onClick={() => setNuevoPendiente(null)}>Descartar</Button>
              <Button
                variant="primary"
                disabled={nuevoPendiente.nombre.trim() === '' || crearPendiente.isPending}
                onClick={() =>
                  crearPendiente.mutate(
                    { pacienteId: consulta.pacienteId, consultaOrigenId: consulta.id, tipo: nuevoPendiente.tipo, nombre: nuevoPendiente.nombre },
                    { onSuccess: () => setNuevoPendiente(null) },
                  )
                }
              >
                Agregar
              </Button>
            </div>
          </div>
        ) : null}
        <PendingList
          items={abiertos.map((p) => ({
            ...aItemPendiente(p, { consultaId: consulta.id }),
            status: 'pendiente' as const,
            // Solo se quitan desde aquí los agregados a mano en esta consulta; los de un documento salen de él.
            removable: p.consultaOrigenId === consulta.id && !p.entregableId,
          }))}
          uploadable
          emptyText="Sin pendientes para la próxima consulta."
          onUpload={(id, archivo) => adjuntar.mutate({ id, archivo, consultaId: consulta.id })}
          onOpenFile={(id) => abrirArchivo.mutate(id)}
          onRemove={soloLectura ? undefined : (id) => eliminarPendiente.mutate(id)}
        />
      </Card>
    </>
  );
}
