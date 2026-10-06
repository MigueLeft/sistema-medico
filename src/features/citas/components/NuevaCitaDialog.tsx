import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { AlertBanner, Button, Checkbox, ESTADOS_CITA, Field, Modal, Select, TextField } from '@/components/ui';
import { useConfiguracionAgenda, useTiposCita, type ConfiguracionAgenda, type TipoCita } from '@/features/agenda';
import { useSesionActual } from '@/features/auth';
import { PatientFormDialog, usePacientes, type PacienteConExpediente } from '@/features/patients';
import { edad, hhmmA12, hora12 } from '@/lib/formato';
import { useCitas, useCrearCita } from '../hooks/useCitas';
import { ocupaAgenda, opcionesDeHora } from './horario';

interface NuevaCitaDialogProps {
  open: boolean;
  onClose: () => void;
  /** Fecha y hora propuestas (p. ej. el espacio libre sobre el que se hizo clic). */
  inicio?: Date;
  /** Paciente ya elegido (p. ej. al agendar un control desde la consulta). */
  pacienteId?: string;
  tipoCitaId?: string | null;
  motivo?: string;
}

const DURACIONES = [15, 20, 30, 45, 60, 90, 120];

export function NuevaCitaDialog(props: NuevaCitaDialogProps) {
  const { data: cfg } = useConfiguracionAgenda();
  const { data: tipos } = useTiposCita();
  // El formulario se monta al abrir, con la agenda ya cargada, para calcular sus valores iniciales una sola vez.
  if (!props.open || !cfg || !tipos) return null;
  return <Formulario {...props} cfg={cfg} tipos={tipos} />;
}

function Formulario({ onClose, inicio, pacienteId, tipoCitaId, motivo: motivoInicial, cfg, tipos }: NuevaCitaDialogProps & { cfg: ConfiguracionAgenda; tipos: TipoCita[] }) {
  const { data: pacientes = [] } = usePacientes();
  const { data: sesion } = useSesionActual();
  const crear = useCrearCita();

  const tiposActivos = useMemo(() => tipos.filter((t) => t.activo), [tipos]);
  const horas = useMemo(() => opcionesDeHora(cfg), [cfg]);
  const [tipoInicial] = useState(() => tiposActivos.find((t) => t.id === tipoCitaId) ?? tiposActivos.find((t) => t.nombre === 'Control') ?? tiposActivos[0]);
  const [base] = useState(() => inicio ?? new Date());

  const [busqueda, setBusqueda] = useState('');
  // `undefined` = todavía vale el paciente precargado; `null` = el usuario lo quitó.
  const [elegido, setElegido] = useState<PacienteConExpediente | null | undefined>(undefined);
  const [fecha, setFecha] = useState(() => format(base, 'yyyy-MM-dd'));
  const [hora, setHora] = useState(() => {
    // Si la hora propuesta no cae en el horario, se elige la siguiente disponible.
    const horaBase = format(base, 'HH:mm');
    return horas.includes(horaBase) ? horaBase : (horas.find((h) => h >= horaBase) ?? horas[0] ?? '');
  });
  const [duracion, setDuracion] = useState(tipoInicial?.duracionMin ?? cfg.duracionDefectoMin);
  const [tipoId, setTipoId] = useState(tipoInicial?.id ?? '');
  const [motivo, setMotivo] = useState(motivoInicial ?? '');
  const [recordatorio, setRecordatorio] = useState(cfg.recordatorioCanal !== 'ninguno');
  const [registrando, setRegistrando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string>>({});

  const paciente = elegido === undefined ? (pacientes.find((p) => p.id === pacienteId) ?? null) : elegido;
  const setPaciente = setElegido;

  const { data: citasDelDia = [] } = useCitas(fecha || '0000-00-00', fecha || '0000-00-00');
  const citaPrevia = paciente ? citasDelDia.find((c) => c.pacienteId === paciente.id && ocupaAgenda(c)) : undefined;

  const aguja = busqueda.trim().toLowerCase();
  const sugerencias =
    aguja.length >= 2
      ? pacientes
          .filter((p) =>
            [`${p.nombres} ${p.apellidos}`, p.documentoIdentidad, p.expediente.codigo].some((t) => t.toLowerCase().includes(aguja)),
          )
          .slice(0, 5)
      : [];

  function enviar() {
    const e: Record<string, string> = {};
    if (!paciente) e.paciente = 'Seleccione un paciente.';
    if (!fecha) e.fecha = 'Indique la fecha.';
    if (!hora) e.hora = 'Indique la hora.';
    if (!tipoId) e.tipo = 'Seleccione el tipo de cita.';
    setErrores(e);
    if (Object.keys(e).length > 0 || !paciente) return;
    crear.mutate(
      {
        pacienteId: paciente.id,
        fechaHora: `${fecha}T${hora}:00`,
        duracionMin: duracion,
        tipoCitaId: tipoId,
        motivo: motivo.trim(),
        enviarRecordatorio: recordatorio,
      },
      { onSuccess: onClose },
    );
  }

  return (
    <>
      <Modal
        open={!registrando}
        title="Nueva cita"
        onClose={onClose}
        footer={
          <>
            <Button onClick={onClose}>Cancelar</Button>
            <Button variant="primary" disabled={crear.isPending} onClick={enviar}>
              Agendar cita
            </Button>
          </>
        }
      >
        {paciente ? (
          <Field label="Paciente" required>
            <div className="ap-elegido">
              <span>
                <b>
                  {paciente.nombres} {paciente.apellidos}
                </b>
                <span className="cl-muted">
                  {' '}
                  · {edad(paciente.fechaNacimiento)} años · {paciente.documentoIdentidad}
                </span>
              </span>
              <span className="ap-inline">
                <span className="cl-code">{paciente.expediente.codigo}</span>
                <Button size="sm" variant="quiet" onClick={() => setPaciente(null)}>
                  Cambiar
                </Button>
              </span>
            </div>
          </Field>
        ) : (
          <div>
            <TextField
              label="Paciente"
              required
              autoFocus
              value={busqueda}
              onChange={setBusqueda}
              error={errores.paciente}
              hint="Busque por nombre, cédula o historia. Si no existe, créelo desde aquí."
            />
            {aguja.length >= 2 ? (
              <ul className="ap-sugerencias">
                {sugerencias.map((p) => (
                  <li key={p.id} onClick={() => setPaciente(p)}>
                    <span>
                      <b>
                        {p.nombres} {p.apellidos}
                      </b>
                      <span className="cl-muted">
                        {' '}
                        · {edad(p.fechaNacimiento)} años · {p.documentoIdentidad}
                      </span>
                    </span>
                    <span className="cl-code">{p.expediente.codigo}</span>
                  </li>
                ))}
                <li onClick={() => setRegistrando(true)}>
                  <b>+ Registrar paciente nuevo</b>
                </li>
              </ul>
            ) : null}
          </div>
        )}

        <div className="ap-grid ap-grid-3">
          <TextField label="Fecha" required type="date" value={fecha} onChange={setFecha} error={errores.fecha} />
          <Select label="Hora" required value={hora} onChange={setHora} error={errores.hora} options={horas.map((h) => ({ value: h, label: hhmmA12(h) }))} />
          <Select
            label="Duración"
            value={String(duracion)}
            onChange={(v) => setDuracion(Number(v))}
            options={[...new Set([...DURACIONES, duracion])].sort((a, b) => a - b).map((d) => ({ value: String(d), label: `${d} min` }))}
          />
        </div>
        <div className="ap-grid ap-grid-2">
          <Select
            label="Tipo de cita"
            required
            value={tipoId}
            error={errores.tipo}
            onChange={(v) => {
              setTipoId(v);
              const tipo = tiposActivos.find((t) => t.id === v);
              if (tipo) setDuracion(tipo.duracionMin);
            }}
            options={tiposActivos.map((t) => ({ value: t.id, label: t.nombre }))}
          />
          <Select label="Médico" value="yo" onChange={() => undefined} disabled options={[{ value: 'yo', label: sesion?.nombreCompleto ?? '' }]} />
        </div>
        <TextField label="Motivo" multiline rows={3} value={motivo} onChange={setMotivo} />
        {cfg.recordatorioCanal !== 'ninguno' ? (
          <Checkbox checked={recordatorio} onChange={setRecordatorio}>
            Enviar recordatorio al paciente {cfg.recordatorioAnticipacionH} h antes
          </Checkbox>
        ) : null}
        {citaPrevia ? (
          <AlertBanner tone="warning" title="El paciente ya tiene una cita ese día">
            {ESTADOS_CITA[citaPrevia.estado]?.label ?? 'Programada'} a las {hora12(citaPrevia.fechaHora)} ¿Desea agendar otra de todas formas?
          </AlertBanner>
        ) : null}
      </Modal>
      <PatientFormDialog
        open={registrando}
        nombreInicial={busqueda}
        onClose={() => setRegistrando(false)}
        onGuardado={(p) => {
          setPaciente(p);
          setBusqueda('');
        }}
      />
    </>
  );
}
