import { useState } from 'react';
import { ToggleButton, ToggleButtonGroup } from '@mui/material';
import { createFileRoute } from '@tanstack/react-router';
import { Cargando, Page } from '@/components/AppShell';
import { AlertBanner, Badge, Button, Card, Checkbox, type Columna, DataTable, Field, type GrupoSeccion, Modal, Panel, SectionNav, Select, TextField } from '@/components/ui';
import {
  useConfiguracionAgenda,
  useGuardarConfiguracionAgenda,
  useGuardarTipoCita,
  useTiposCita,
  type CanalRecordatorio,
  type GuardarConfiguracionAgendaPayload,
  type ConfiguracionAgenda,
  type GuardarTipoCitaPayload,
  type SiNoConfirma,
  type TipoCita,
} from '@/features/agenda';
import { PlantillasDocumento, useGuardarPlantillaEntregable, usePlantillaEntregable, type PlantillaEntregable } from '@/features/entregables';
import { hhmmA12 } from '@/lib/formato';
import { TOKENS } from '@/theme/clinica';

export const Route = createFileRoute('/configuracion')({
  component: ConfiguracionPage,
});

const GRUPOS: GrupoSeccion[] = [
  {
    label: 'Consultorio',
    items: [
      { id: 'datos', label: 'Datos del consultorio' },
      { id: 'horario', label: 'Horario y agenda' },
      { id: 'plantillas', label: 'Plantillas de entregables' },
      { id: 'recipe', label: 'Membrete e impresión' },
    ],
  },
  {
    label: 'Clínica',
    items: [
      { id: 'rangos', label: 'Rangos de signos vitales' },
      { id: 'terminologias', label: 'Terminologías' },
      { id: 'favoritos', label: 'Favoritos y plantillas' },
    ],
  },
  {
    label: 'Usuarios y seguridad',
    items: [
      { id: 'usuarios', label: 'Usuarios y roles' },
      { id: 'auditoria', label: 'Registro de auditoría' },
    ],
  },
  {
    label: 'Sistema',
    items: [
      { id: 'respaldos', label: 'Respaldos' },
      { id: 'preferencias', label: 'Preferencias' },
    ],
  },
];
const DISPONIBLES = ['horario', 'plantillas', 'recipe'];
const TITULOS = Object.fromEntries(GRUPOS.flatMap((g) => g.items).map((i) => [i.id, i.label]));

function ConfiguracionPage() {
  const [seccion, setSeccion] = useState('horario');
  return (
    <Page title="Configuración">
      <div className="ap-with-nav">
        <Panel>
          <SectionNav title="Configuración" groups={GRUPOS} active={seccion} onSelect={setSeccion} />
        </Panel>
        <div className="ap-stack">
          {seccion === 'horario' ? <HorarioYAgenda /> : null}
          {seccion === 'plantillas' ? <PlantillasDocumento /> : null}
          {seccion === 'recipe' ? <RecipeEImpresion /> : null}
          {DISPONIBLES.includes(seccion) ? null : (
            <>
              <h2 className="ap-h">{TITULOS[seccion]}</h2>
              <AlertBanner title="Sección no disponible todavía">
                Esta parte de la configuración aún no está implementada en esta versión del sistema.
              </AlertBanner>
            </>
          )}
        </div>
      </div>
    </Page>
  );
}

// ==================== Horario y agenda ====================

const DIAS = [
  { n: '1', label: 'Lun' },
  { n: '2', label: 'Mar' },
  { n: '3', label: 'Mié' },
  { n: '4', label: 'Jue' },
  { n: '5', label: 'Vie' },
  { n: '6', label: 'Sáb' },
  { n: '7', label: 'Dom' },
];
const HORAS = Array.from({ length: 35 }, (_, i) => {
  const minutos = 5 * 60 + i * 30;
  return `${String(Math.floor(minutos / 60)).padStart(2, '0')}:${String(minutos % 60).padStart(2, '0')}`;
});
const PAUSAS = ['11:30-12:30', '12:00-13:00', '12:00-14:00', '12:30-13:30', '13:00-14:00'];
/** "12:00-13:00" -> "12:00 – 1:00 p. m." */
const etiquetaPausa = (p: string) => {
  const [inicio, fin] = p.split('-');
  return `${hhmmA12(inicio).replace(/ [ap]\. m\.$/, '')} – ${hhmmA12(fin)}`;
};

function aPayload(cfg: ConfiguracionAgenda): GuardarConfiguracionAgendaPayload {
  return {
    diasAtencion: cfg.diasAtencion,
    horaInicio: cfg.horaInicio,
    horaCierre: cfg.horaCierre,
    pausaInicio: cfg.pausaInicio,
    pausaFin: cfg.pausaFin,
    duracionDefectoMin: cfg.duracionDefectoMin,
    permitirSobrecupos: cfg.permitirSobrecupos,
    maxSobrecupos: cfg.maxSobrecupos,
    recordatorioAnticipacionH: cfg.recordatorioAnticipacionH,
    recordatorioCanal: cfg.recordatorioCanal,
    siNoConfirma: cfg.siNoConfirma,
    recordatorioMensaje: cfg.recordatorioMensaje,
  };
}

function HorarioYAgenda() {
  const { data: cfg } = useConfiguracionAgenda();
  if (!cfg) return <Cargando />;
  const original = aPayload(cfg);
  // La `key` remonta el formulario cuando cambia lo guardado, para partir siempre de la última versión.
  return <FormularioHorario key={JSON.stringify(original)} original={original} />;
}

function FormularioHorario({ original }: { original: GuardarConfiguracionAgendaPayload }) {
  const guardar = useGuardarConfiguracionAgenda();
  const [form, setForm] = useState(original);

  const cambiar = (cambios: Partial<GuardarConfiguracionAgendaPayload>) => setForm((f) => ({ ...f, ...cambios }));
  const dias = form.diasAtencion.split(',').filter(Boolean);
  const pausa = form.pausaInicio && form.pausaFin ? `${form.pausaInicio}-${form.pausaFin}` : '';
  const hayCambios = JSON.stringify(original) !== JSON.stringify(form);

  return (
    <>
      <div>
        <h2 className="ap-h">Horario y agenda</h2>
        <div className="ap-sub">Define cuándo se pueden agendar citas y cómo se recuerdan.</div>
      </div>

      <Card title="Días y horario de consulta">
        <Field label="Días de atención">
          <ToggleButtonGroup value={dias} aria-label="Días de atención" onChange={(_, nuevos: string[]) => cambiar({ diasAtencion: [...nuevos].sort().join(',') })} sx={{ gap: '6px', '& .MuiToggleButton-root': { minWidth: 52, borderRadius: '8px !important', border: `1px solid ${TOKENS.lineStrong} !important`, marginLeft: '0 !important' } }}>
            {DIAS.map((d) => (
              <ToggleButton key={d.n} value={d.n}>
                {d.label}
              </ToggleButton>
            ))}
          </ToggleButtonGroup>
        </Field>
        <div className="ap-grid ap-grid-4">
          <Select label="Hora de inicio" value={form.horaInicio} onChange={(v) => cambiar({ horaInicio: v })} options={HORAS.map((h) => ({ value: h, label: hhmmA12(h) }))} />
          <Select label="Hora de cierre" value={form.horaCierre} onChange={(v) => cambiar({ horaCierre: v })} options={HORAS.map((h) => ({ value: h, label: hhmmA12(h) }))} />
          <Select
            label="Pausa"
            value={pausa}
            placeholder="Sin pausa"
            options={[...new Set([...PAUSAS, pausa].filter(Boolean))].sort().map((p) => ({ value: p, label: etiquetaPausa(p) }))}
            onChange={(v) => {
              const [inicio, fin] = v ? v.split('-') : [null, null];
              cambiar({ pausaInicio: inicio, pausaFin: fin });
            }}
          />
          <Select
            label="Duración por defecto"
            value={String(form.duracionDefectoMin)}
            onChange={(v) => cambiar({ duracionDefectoMin: Number(v) })}
            options={[15, 20, 30, 45, 60].map((d) => ({ value: String(d), label: `${d} min` }))}
          />
        </div>
        <div className="ap-inline">
          <Checkbox checked={form.permitirSobrecupos} onChange={(v) => cambiar({ permitirSobrecupos: v })}>
            Permitir sobrecupos, máximo
          </Checkbox>
          <Select
            style={{ width: 80 }}
            value={String(form.maxSobrecupos)}
            disabled={!form.permitirSobrecupos}
            onChange={(v) => cambiar({ maxSobrecupos: Number(v) })}
            options={[1, 2, 3, 4, 5].map(String)}
          />
          <span>por día</span>
        </div>
      </Card>

      <TiposDeCita />

      <Card title="Recordatorios" subtitle="Esta versión guarda la preferencia y la marca en cada cita; el envío automático de mensajes aún no está conectado.">
        <div className="ap-grid ap-grid-3">
          <Select
            label="Enviar"
            value={String(form.recordatorioAnticipacionH)}
            onChange={(v) => cambiar({ recordatorioAnticipacionH: Number(v) })}
            options={[2, 12, 24, 48, 72].map((h) => ({ value: String(h), label: `${h} h antes` }))}
          />
          <Select
            label="Canal"
            value={form.recordatorioCanal}
            onChange={(v) => cambiar({ recordatorioCanal: v as CanalRecordatorio })}
            options={[
              { value: 'whatsapp', label: 'WhatsApp' },
              { value: 'sms', label: 'SMS' },
              { value: 'correo', label: 'Correo' },
              { value: 'ninguno', label: 'No enviar' },
            ]}
          />
          <Select
            label="Si no confirma"
            value={form.siNoConfirma}
            onChange={(v) => cambiar({ siNoConfirma: v as SiNoConfirma })}
            options={[
              { value: 'por_confirmar', label: 'Marcar ‘Por confirmar’' },
              { value: 'mantener', label: 'Mantener la cita' },
              { value: 'cancelar', label: 'Cancelar la cita' },
            ]}
          />
        </div>
        <TextField
          label="Mensaje"
          multiline
          rows={3}
          value={form.recordatorioMensaje ?? ''}
          onChange={(v) => cambiar({ recordatorioMensaje: v === '' ? null : v })}
          hint="Variables disponibles: [paciente], [fecha], [hora], [médico], [dirección]."
        />
      </Card>

      <Panel className="ap-foot">
        <span className="cl-hint">{hayCambios ? 'Hay cambios sin guardar.' : 'Sin cambios pendientes.'}</span>
        <Button disabled={!hayCambios} onClick={() => setForm(original)}>
          Descartar
        </Button>
        <Button variant="primary" disabled={!hayCambios || guardar.isPending} onClick={() => guardar.mutate(form)}>
          Guardar cambios
        </Button>
      </Panel>
    </>
  );
}

const AGENDABLE: Record<TipoCita['agendablePor'], string> = { recepcion: 'Recepción', medico: 'Solo el médico' };
const COLUMNAS_TIPOS: Array<Columna<TipoCita>> = [
  { key: 'tipo', label: 'Tipo', render: (t) => t.nombre },
  { key: 'duracion', label: 'Duración', width: 110, align: 'right', render: (t) => `${t.duracionMin} min` },
  { key: 'agendable', label: 'Agendable por', width: 200, muted: true, render: (t) => AGENDABLE[t.agendablePor] },
  {
    key: 'estado',
    label: 'Estado',
    width: 130,
    render: (t) => (
      <Badge dot tone={t.activo ? 'slate' : 'neutral'}>
        {t.activo ? 'Activo' : 'Inactivo'}
      </Badge>
    ),
  },
];
const TIPO_NUEVO: GuardarTipoCitaPayload = { nombre: '', duracionMin: 30, agendablePor: 'recepcion', activo: true };

function TiposDeCita() {
  const { data: tipos = [] } = useTiposCita();
  const guardar = useGuardarTipoCita();
  const [edicion, setEdicion] = useState<{ id: string | null; datos: GuardarTipoCitaPayload } | null>(null);

  return (
    <Card
      title="Tipos de cita"
      actions={
        <Button variant="quiet" icon="plus" onClick={() => setEdicion({ id: null, datos: TIPO_NUEVO })}>
          Agregar tipo
        </Button>
      }
    >
      <DataTable
        columns={COLUMNAS_TIPOS}
        rows={tipos}
        rowKey={(t) => t.id}
        onRowClick={(t) => setEdicion({ id: t.id, datos: { nombre: t.nombre, duracionMin: t.duracionMin, agendablePor: t.agendablePor, activo: t.activo } })}
      />
      <Modal
        open={!!edicion}
        title={edicion?.id ? 'Editar tipo de cita' : 'Agregar tipo de cita'}
        onClose={() => setEdicion(null)}
        width={480}
        footer={
          <>
            <Button onClick={() => setEdicion(null)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={!edicion || edicion.datos.nombre.trim() === '' || guardar.isPending}
              onClick={() => edicion && guardar.mutate({ id: edicion.id, payload: edicion.datos }, { onSuccess: () => setEdicion(null) })}
            >
              Guardar
            </Button>
          </>
        }
      >
        {edicion ? (
          <>
            <TextField label="Nombre" required autoFocus value={edicion.datos.nombre} onChange={(v) => setEdicion({ ...edicion, datos: { ...edicion.datos, nombre: v } })} />
            <div className="ap-grid ap-grid-2">
              <Select
                label="Duración"
                value={String(edicion.datos.duracionMin)}
                onChange={(v) => setEdicion({ ...edicion, datos: { ...edicion.datos, duracionMin: Number(v) } })}
                options={[...new Set([15, 20, 30, 45, 60, 90, 120, edicion.datos.duracionMin])].sort((a, b) => a - b).map((d) => ({ value: String(d), label: `${d} min` }))}
              />
              <Select
                label="Agendable por"
                value={edicion.datos.agendablePor}
                onChange={(v) => setEdicion({ ...edicion, datos: { ...edicion.datos, agendablePor: v as TipoCita['agendablePor'] } })}
                options={Object.entries(AGENDABLE).map(([value, label]) => ({ value, label }))}
              />
            </div>
            <Checkbox checked={edicion.datos.activo} onChange={(v) => setEdicion({ ...edicion, datos: { ...edicion.datos, activo: v } })}>
              Activo (se puede elegir al agendar)
            </Checkbox>
          </>
        ) : null}
      </Modal>
    </Card>
  );
}

// ==================== Récipe e impresión ====================

function RecipeEImpresion() {
  const { data: plantilla } = usePlantillaEntregable();
  if (!plantilla) return <Cargando />;
  return <FormularioPlantilla key={plantilla.id} plantilla={plantilla} />;
}

function FormularioPlantilla({ plantilla }: { plantilla: PlantillaEntregable }) {
  const guardar = useGuardarPlantillaEntregable();
  const [form, setForm] = useState({
    nombreConsultorio: plantilla.nombreConsultorio ?? '',
    encabezado: plantilla.encabezado ?? '',
    piePagina: plantilla.piePagina ?? '',
  });

  return (
    <>
      <div>
        <h2 className="ap-h">Membrete e impresión</h2>
        <div className="ap-sub">Membrete y pie de página comunes a todos los entregables que se generan en PDF.</div>
      </div>
      <Card title="Membrete">
        <TextField label="Nombre del consultorio" value={form.nombreConsultorio} onChange={(v) => setForm({ ...form, nombreConsultorio: v })} />
        <TextField
          label="Encabezado"
          multiline
          rows={4}
          hint="Datos del médico, colegiatura, dirección y teléfonos."
          value={form.encabezado}
          onChange={(v) => setForm({ ...form, encabezado: v })}
        />
        <TextField label="Pie de página" multiline rows={2} value={form.piePagina} onChange={(v) => setForm({ ...form, piePagina: v })} />
        <div className="cl-row" style={{ justifyContent: 'flex-end' }}>
          <Button
            variant="primary"
            disabled={guardar.isPending}
            onClick={() => guardar.mutate({ nombreConsultorio: form.nombreConsultorio || undefined, encabezado: form.encabezado || undefined, piePagina: form.piePagina || undefined })}
          >
            Guardar cambios
          </Button>
        </div>
      </Card>
    </>
  );
}
