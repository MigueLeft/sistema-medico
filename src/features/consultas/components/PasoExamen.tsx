import { useState } from 'react';
import { Badge, Button, Card, Segmented, TextField, Vacio, VitalField, type Rango } from '@/components/ui';
import { useExamenFisicoConsulta, useExamenFisicoPaciente, useGuardarExamenFisico, type ExamenFisico } from '@/features/examen-fisico';
import { useExamenesPaciente, useRegistrarResultadoExamen, type Examen } from '@/features/examenes';
import { fechaCorta, fmtNumLibre, parseNum } from '@/lib/formato';
import { useExamenSistemas, useGuardarExamenSistema } from '../hooks/useConsultas';
import type { Consulta, EstadoExamenSistema, ExamenSistema } from '../types';

/** Campos que se escriben a mano; el resto de las mediciones se calcula. */
type Clave =
  | 'taSistolica'
  | 'taDiastolica'
  | 'fc'
  | 'saturacionOxigenoPct'
  | 'temperatura'
  | 'frecuenciaRespiratoria'
  | 'pesoKg'
  | 'tallaCm'
  | 'grasaCorporalPct'
  | 'masaMuscularKg'
  | 'circunferenciaAbdominalCm'
  | 'circunferenciaCaderaCm'
  | 'circunferenciaCuelloCm'
  | 'fuerzaManoDerechaKg'
  | 'fuerzaManoIzquierdaKg';

const CLAVES: Clave[] = [
  'taSistolica',
  'taDiastolica',
  'fc',
  'saturacionOxigenoPct',
  'temperatura',
  'frecuenciaRespiratoria',
  'pesoKg',
  'tallaCm',
  'grasaCorporalPct',
  'masaMuscularKg',
  'circunferenciaAbdominalCm',
  'circunferenciaCaderaCm',
  'circunferenciaCuelloCm',
  'fuerzaManoDerechaKg',
  'fuerzaManoIzquierdaKg',
];
const ENTEROS: Clave[] = ['taSistolica', 'taDiastolica', 'fc', 'frecuenciaRespiratoria'];

type Valores = Record<Clave, string>;

function aTexto(examen: ExamenFisico | null): Valores {
  return Object.fromEntries(CLAVES.map((k) => [k, fmtNumLibre(examen?.[k]).replace(/\./g, '')])) as Valores;
}

interface PasoExamenProps {
  consulta: Consulta;
  sexo: string;
  soloLectura: boolean;
}

export function PasoExamen({ consulta, sexo, soloLectura }: PasoExamenProps) {
  return (
    <>
      <Mediciones consulta={consulta} sexo={sexo} soloLectura={soloLectura} />
      <Sistemas consulta={consulta} soloLectura={soloLectura} />
      <Resultados consulta={consulta} soloLectura={soloLectura} />
    </>
  );
}

function Mediciones(props: PasoExamenProps) {
  const { data: actual, isSuccess } = useExamenFisicoConsulta(props.consulta.id);
  // El formulario se monta cuando ya se sabe si la consulta tiene mediciones: las carga una sola vez
  // y después manda lo que el médico escribe.
  return isSuccess ? <FormularioMediciones {...props} inicial={actual ?? null} /> : null;
}

function FormularioMediciones({ consulta, sexo, soloLectura, inicial }: PasoExamenProps & { inicial: ExamenFisico | null }) {
  const { data: historial = [] } = useExamenFisicoPaciente(consulta.pacienteId);
  const guardar = useGuardarExamenFisico();
  const [valores, setValores] = useState<Valores>(() => aTexto(inicial));
  const [guardado, setGuardado] = useState<Valores>(() => aTexto(inicial));

  const n = (k: Clave) => parseNum(valores[k]);
  const peso = n('pesoKg');
  const talla = n('tallaCm');
  const grasaPct = n('grasaCorporalPct');
  const imc = peso && talla ? peso / (talla / 100) ** 2 : null;
  const grasaKg = peso && grasaPct !== null ? (peso * grasaPct) / 100 : null;
  const magra = peso && grasaKg !== null ? peso - grasaKg : null;
  const esMujer = sexo === 'femenino';

  const persistir = () => {
    if (soloLectura || CLAVES.every((k) => valores[k] === guardado[k])) return;
    const numeros = Object.fromEntries(
      CLAVES.map((k) => {
        const v = parseNum(valores[k]);
        return [k, v !== null && ENTEROS.includes(k) ? Math.round(v) : v];
      }),
    ) as Record<Clave, number | null>;
    const enviado = valores;
    guardar.mutate({ pacienteId: consulta.pacienteId, consultaId: consulta.id, notas: inicial?.notas ?? null, ...numeros }, { onSuccess: () => setGuardado(enviado) });
  };

  const campo = (k: Clave, label: string, unit: string, normal?: Rango, critical?: Rango, refDecimals = 0) => (
    <VitalField
      key={k}
      label={label}
      unit={unit}
      value={valores[k]}
      normal={normal}
      critical={critical}
      refDecimals={refDecimals}
      disabled={soloLectura}
      onChange={(v) => setValores((actuales) => ({ ...actuales, [k]: v }))}
      onBlur={persistir}
    />
  );

  const anterior = historial.find((e) => e.consultaId !== consulta.id);
  const ultimaToma = anterior
    ? [
        `Última toma: ${fechaCorta(anterior.fecha)}`,
        anterior.taSistolica && anterior.taDiastolica ? `PA ${anterior.taSistolica}/${anterior.taDiastolica}` : null,
        anterior.pesoKg ? `Peso ${fmtNumLibre(anterior.pesoKg, 1)} kg` : null,
      ]
        .filter(Boolean)
        .join(' · ')
    : null;

  return (
    <Card id="sec-signos" title="Mediciones" actions={ultimaToma ? <span className="cl-hint">{ultimaToma}</span> : null}>
      <div className="cl-vitals">
        <div className="cl-vitals-group">Signos vitales</div>
        {campo('taSistolica', 'Presión arterial sistólica', 'mmHg', [90, 129], [70, 180])}
        {campo('taDiastolica', 'Presión arterial diastólica', 'mmHg', [60, 79], [40, 120])}
        {campo('fc', 'Frecuencia cardíaca', 'lpm', [60, 100], [40, 130])}
        {campo('saturacionOxigenoPct', 'Saturación de oxígeno', '%', [95, null], [90, null])}
        {campo('temperatura', 'Temperatura', '°C', [36, 37.5], [35, 39.5], 1)}
        {campo('frecuenciaRespiratoria', 'Frecuencia respiratoria', 'rpm', [12, 20], [8, 30])}

        <div className="cl-vitals-group">Antropometría y composición corporal</div>
        {campo('pesoKg', 'Peso', 'kg')}
        {campo('tallaCm', 'Altura', 'cm')}
        <VitalField label="Índice de masa corporal" unit="kg/m²" calc calcValue={imc} formula="Peso ÷ altura²" normal={[18.5, 24.9]} />
        {campo('grasaCorporalPct', 'Grasa corporal', '%')}
        <VitalField label="Grasa corporal" unit="kg" calc calcValue={grasaKg} formula="Peso × % grasa" />
        <VitalField label="Masa magra" unit="kg" calc calcValue={magra} formula="Peso − grasa (kg)" />
        {campo('masaMuscularKg', 'Masa muscular', 'kg')}
        {campo('circunferenciaAbdominalCm', 'Circunferencia abdominal', 'cm', [null, esMujer ? 88 : 102])}
        {campo('circunferenciaCaderaCm', 'Circunferencia de cadera', 'cm')}
        {campo('circunferenciaCuelloCm', 'Circunferencia de cuello', 'cm', [null, esMujer ? 35 : 40])}

        <div className="cl-vitals-group">Fuerza de prensión</div>
        {campo('fuerzaManoDerechaKg', 'Fuerza mano derecha', 'kg')}
        {campo('fuerzaManoIzquierdaKg', 'Fuerza mano izquierda', 'kg')}
      </div>
    </Card>
  );
}

function FilaSistema({ sistema, consultaId, soloLectura }: { sistema: ExamenSistema; consultaId: string; soloLectura: boolean }) {
  const guardar = useGuardarExamenSistema();
  const [descripcion, setDescripcion] = useState(sistema.descripcion ?? '');

  const cambiarEstado = (estado: EstadoExamenSistema) => {
    if (soloLectura) return;
    // Volver a pulsar el estado activo deja el sistema sin examinar.
    if (estado === sistema.estado) {
      guardar.mutate({ consultaId, sistemaId: sistema.sistemaId, estado: null });
      return;
    }
    guardar.mutate({ consultaId, sistemaId: sistema.sistemaId, estado, descripcion: estado === 'normal' ? sistema.textoNormal : '' });
  };

  return (
    <div className="ap-sistema">
      <span className="ap-sistema-nombre">{sistema.sistemaNombre}</span>
      <Segmented<EstadoExamenSistema>
        value={sistema.estado}
        onChange={cambiarEstado}
        size="sm"
        ariaLabel={`Examen de ${sistema.sistemaNombre}`}
        options={[
          { value: 'normal', label: 'Normal', tone: 'soft' },
          { value: 'hallazgos', label: 'Con hallazgos', tone: 'warning' },
        ]}
      />
      {sistema.estado === 'hallazgos' ? (
        <TextField
          value={descripcion}
          placeholder="Describa el hallazgo"
          readOnly={soloLectura}
          onChange={setDescripcion}
          onBlur={() => descripcion !== (sistema.descripcion ?? '') && guardar.mutate({ consultaId, sistemaId: sistema.sistemaId, estado: 'hallazgos', descripcion })}
        />
      ) : (
        <span className="cl-muted">{sistema.estado === 'normal' ? (sistema.descripcion ?? sistema.textoNormal) : ''}</span>
      )}
    </div>
  );
}

function Sistemas({ consulta, soloLectura }: Omit<PasoExamenProps, 'sexo'>) {
  const { data: sistemas = [] } = useExamenSistemas(consulta.id);
  const guardar = useGuardarExamenSistema();
  const sinExaminar = sistemas.filter((s) => s.estado === null);

  return (
    <Card
      id="sec-sistemas"
      title="Examen por aparatos y sistemas"
      flush
      actions={
        soloLectura || sinExaminar.length === 0 ? null : (
          <Button
            variant="quiet"
            onClick={() => sinExaminar.forEach((s) => guardar.mutate({ consultaId: consulta.id, sistemaId: s.sistemaId, estado: 'normal', descripcion: s.textoNormal }))}
          >
            Marcar el resto como normal
          </Button>
        )
      }
    >
      {sistemas.length === 0 ? <Vacio>No hay aparatos y sistemas activos en el catálogo.</Vacio> : null}
      {sistemas.map((s) => (
        // El estado va en la `key` para que la descripción local se reinicie al cambiarlo.
        <FilaSistema key={`${s.sistemaId}:${s.estado}`} sistema={s} consultaId={consulta.id} soloLectura={soloLectura} />
      ))}
    </Card>
  );
}

const BANDERA = { alto: { tone: 'warning', label: 'Alto' }, bajo: { tone: 'warning', label: 'Bajo' }, normal: { tone: 'neutral', label: 'Normal' } } as const;

function FilaResultado({ examen, soloLectura }: { examen: Examen; soloLectura: boolean }) {
  const registrar = useRegistrarResultadoExamen();
  const [valor, setValor] = useState(examen.valor === null ? '' : fmtNumLibre(examen.valor).replace(/\./g, ''));
  const numero = parseNum(valor);
  return (
    <div className="ap-resultado">
      <div className="cl-entry-main">
        <div className="cl-entry-term">{examen.tipoExamenNombre}</div>
        <div className="cl-entry-sub">
          {examen.codigoLoinc ? <span className="cl-sys cl-sys-loinc">LOINC {examen.codigoLoinc}</span> : null}
          <span>{examen.fechaResultado ? `Resultado del ${fechaCorta(examen.fechaResultado)}` : `Solicitado el ${fechaCorta(examen.fechaSolicitud)}`}</span>
        </div>
      </div>
      <TextField value={valor} unit={examen.unidad ?? undefined} inputMode="decimal" placeholder="Resultado" readOnly={soloLectura} onChange={(v) => setValor(v.replace(/[^0-9,.]/g, ''))} />
      <div className="ap-inline" style={{ minWidth: 150, justifyContent: 'flex-end' }}>
        {examen.bandera ? (
          <Badge tone={BANDERA[examen.bandera].tone} dot>
            {BANDERA[examen.bandera].label}
          </Badge>
        ) : null}
        {soloLectura ? null : (
          <Button size="sm" disabled={numero === null || numero === examen.valor || registrar.isPending} onClick={() => registrar.mutate({ id: examen.id, payload: { valor: numero } })}>
            {examen.valor === null ? 'Registrar' : 'Corregir'}
          </Button>
        )}
      </div>
    </div>
  );
}

function Resultados({ consulta, soloLectura }: Omit<PasoExamenProps, 'sexo'>) {
  const { data: examenes = [] } = useExamenesPaciente(consulta.pacienteId);
  // Lo solicitado en consultas anteriores que aún no tiene resultado, más lo que se registró hoy.
  const hoy = consulta.fecha.slice(0, 10);
  const lista = examenes.filter((e) => e.consultaId !== consulta.id && (e.fechaResultado === null || e.fechaResultado.slice(0, 10) >= hoy));

  return (
    <Card id="sec-paraclinicos" title="Paraclínicos" aside="resultados que trae el paciente" flush>
      {lista.length === 0 ? <Vacio>No hay paraclínicos pendientes de resultado.</Vacio> : null}
      {lista.map((e) => (
        <FilaResultado key={e.id} examen={e} soloLectura={soloLectura} />
      ))}
    </Card>
  );
}
