import { useState } from 'react';
import { Badge, Button, Card, CodedEntry, type Concepto, PendingList, Select, TerminologySearch, TextField, Vacio } from '@/components/ui';
import { useTiposCita } from '@/features/agenda';
import { buscarConceptos } from '@/features/catalogos';
import { aEstadoBackend, aItemPendiente, useAbrirArchivoPendiente, useAdjuntarPendiente, useMarcarPendiente, type Pendiente } from '@/features/pendientes';
import { fechaCorta } from '@/lib/formato';
import { useAgregarSintoma, useEliminarSintoma, useSintomasConsulta } from '../hooks/useConsultas';
import type { Consulta, GuardarConsultaPayload } from '../types';

interface PasoSubjetivoProps {
  consulta: Consulta;
  borrador: GuardarConsultaPayload;
  onCambiar: (cambios: Partial<GuardarConsultaPayload>) => void;
  onGuardar: () => void;
  /** Pendientes de consultas anteriores que se revisan en esta. */
  pendientesAnteriores: Pendiente[];
  soloLectura: boolean;
}

export function PasoSubjetivo({ consulta, borrador, onCambiar, onGuardar, pendientesAnteriores, soloLectura }: PasoSubjetivoProps) {
  const { data: tipos = [] } = useTiposCita();
  const { data: sintomas = [] } = useSintomasConsulta(consulta.id);
  const agregarSintoma = useAgregarSintoma();
  const eliminarSintoma = useEliminarSintoma(consulta.id);
  const marcar = useMarcarPendiente();
  const adjuntar = useAdjuntarPendiente();
  const abrirArchivo = useAbrirArchivoPendiente();
  const [nuevoSintoma, setNuevoSintoma] = useState<{ concepto: Pick<Concepto, 'nombre' | 'codigo'>; detalle: string } | null>(null);

  const sinEntregar = pendientesAnteriores.filter((p) => p.estado !== 'entregado').length;
  const origen = pendientesAnteriores.map((p) => p.consultaOrigenFecha).filter(Boolean).sort().at(-1);

  const confirmarSintoma = () => {
    if (!nuevoSintoma) return;
    agregarSintoma.mutate(
      { consultaId: consulta.id, nombre: nuevoSintoma.concepto.nombre, codigoSnomed: nuevoSintoma.concepto.codigo, detalle: nuevoSintoma.detalle },
      { onSuccess: () => setNuevoSintoma(null) },
    );
  };

  return (
    <>
      <Card
        id="sec-pendientes-anteriores"
        title="Pendientes de la consulta anterior"
        subtitle={
          pendientesAnteriores.length > 0
            ? `${origen ? `Consulta del ${fechaCorta(origen)} · ` : ''}marque si se entregó y cargue el documento; lo no entregado sigue pendiente.`
            : undefined
        }
        actions={
          sinEntregar > 0 ? (
            <Badge tone="warning" dot>
              {sinEntregar} sin entregar
            </Badge>
          ) : null
        }
        flush
      >
        <PendingList
          items={pendientesAnteriores.map((p) => aItemPendiente(p, { consultaId: consulta.id }))}
          editable={!soloLectura}
          emptyText="El paciente no tenía pendientes de consultas anteriores."
          onChange={(id, estado) => marcar.mutate({ id, estado: aEstadoBackend(estado), consultaId: consulta.id })}
          onUpload={(id, archivo) => adjuntar.mutate({ id, archivo, consultaId: consulta.id })}
          onOpenFile={(id) => abrirArchivo.mutate(id)}
        />
      </Card>

      <Card id="sec-motivo" title="Motivo de consulta">
        <Select
          label="Tipo de consulta"
          value={borrador.tipoCitaId ?? ''}
          disabled={soloLectura}
          placeholder="Sin especificar"
          options={tipos.filter((t) => t.activo || t.id === borrador.tipoCitaId).map((t) => ({ value: t.id, label: t.nombre }))}
          onChange={(v) => onCambiar({ tipoCitaId: v === '' ? null : v })}
        />
        <TextField label="Motivo" required value={borrador.motivoConsulta} readOnly={soloLectura} onChange={(v) => onCambiar({ motivoConsulta: v })} onBlur={onGuardar} />
        <TextField
          label="Enfermedad actual"
          multiline
          rows={6}
          value={borrador.enfermedadActual ?? ''}
          readOnly={soloLectura}
          onChange={(v) => onCambiar({ enfermedadActual: v })}
          onBlur={onGuardar}
        />
      </Card>

      <Card id="sec-sintomas" title="Síntomas" aside="SNOMED CT, hallazgos" flush>
        {soloLectura ? null : (
          <div className="ap-card-body" style={{ borderBottom: sintomas.length > 0 || nuevoSintoma ? '1px solid var(--line)' : undefined }}>
            <TerminologySearch
              label="Agregar síntoma"
              placeholder="Ej.: dolor torácico, disnea, 29857009"
              claveCache="sintoma"
              buscar={buscarConceptos.terminos('sintoma')}
              onSelect={(c) => setNuevoSintoma({ concepto: c, detalle: '' })}
              onCrear={(texto) => setNuevoSintoma({ concepto: { nombre: texto, codigo: null }, detalle: '' })}
            />
          </div>
        )}
        {nuevoSintoma ? (
          <div className="ap-med-form">
            <b>{nuevoSintoma.concepto.nombre}</b>
            <div className="ap-inline" style={{ alignItems: 'flex-end' }}>
              <TextField
                label="Detalle"
                style={{ flex: 1 }}
                autoFocus
                placeholder="Localización · duración · intensidad. Ej.: Occipital · 3 días · Moderada"
                value={nuevoSintoma.detalle}
                onChange={(v) => setNuevoSintoma({ ...nuevoSintoma, detalle: v })}
              />
              <Button onClick={() => setNuevoSintoma(null)}>Descartar</Button>
              <Button variant="primary" disabled={agregarSintoma.isPending} onClick={confirmarSintoma}>
                Agregar
              </Button>
            </div>
          </div>
        ) : null}
        {sintomas.length === 0 && !nuevoSintoma ? <Vacio>Sin síntomas registrados.</Vacio> : null}
        <div className="ap-list">
          {sintomas.map((s) => (
            <CodedEntry
              key={s.id}
              term={s.nombre}
              code={s.codigoSnomed}
              detail={s.detalle}
              acciones={soloLectura ? [] : [{ label: 'Quitar', danger: true, onClick: () => eliminarSintoma.mutate(s.id) }]}
            />
          ))}
        </div>
      </Card>
    </>
  );
}
