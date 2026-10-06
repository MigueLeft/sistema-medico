import { useState } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { addDays, addMonths, addWeeks } from 'date-fns';
import { AlertBanner, Button, Card, type Concepto, MedicationItem, Select, TerminologySearch, TextField, Vacio } from '@/components/ui';
import { useTiposCita } from '@/features/agenda';
import { alergiaQueChoca, sustanciaAlergia, type Antecedente } from '@/features/antecedentes';
import { buscarConceptos } from '@/features/catalogos';
import { useGuardarTratamiento, useTratamientoPorConsulta, type ItemMedicamentoPayload, type TratamientoMedicamento } from '@/features/tratamientos';
import { isoDia } from '@/lib/formato';
import type { Consulta, GuardarConsultaPayload } from '../types';

interface PasoPlanProps {
  consulta: Consulta;
  borrador: GuardarConsultaPayload;
  /** Aplica los cambios al borrador de la consulta y lo guarda. */
  onGuardar: (cambios?: Partial<GuardarConsultaPayload>) => void;
  alergias: Antecedente[];
  soloLectura: boolean;
}

export const CONTROLES: Array<{ value: string; fecha: (desde: Date) => Date }> = [
  { value: 'En 1 semana', fecha: (d) => addWeeks(d, 1) },
  { value: 'En 2 semanas', fecha: (d) => addWeeks(d, 2) },
  { value: 'En 1 mes', fecha: (d) => addMonths(d, 1) },
  { value: 'En 3 meses', fecha: (d) => addMonths(d, 3) },
  { value: 'En 6 meses', fecha: (d) => addMonths(d, 6) },
  { value: 'En 1 año', fecha: (d) => addDays(d, 365) },
];

const VIAS = ['Oral', 'Sublingual', 'Tópica', 'Inhalada', 'Intramuscular', 'Intravenosa', 'Subcutánea', 'Oftálmica', 'Ótica', 'Rectal', 'Vaginal'];
const ITEM_VACIO = { dosis: '', via: 'Oral', frecuencia: '', duracion: '', indicaciones: '' };

function aPayload(m: TratamientoMedicamento): ItemMedicamentoPayload {
  return {
    medicamentoId: m.medicamentoId,
    dosis: m.dosis,
    frecuencia: m.frecuencia,
    duracion: m.duracion ?? undefined,
    via: m.via ?? undefined,
    indicaciones: m.indicaciones ?? undefined,
  };
}

/** Se monta con el tratamiento ya cargado: toma el texto guardado una vez y lo guarda al salir del campo. */
function IndicacionesGenerales({ inicial, soloLectura, onGuardar }: { inicial: string; soloLectura: boolean; onGuardar: (texto: string) => void }) {
  const [texto, setTexto] = useState(inicial);
  return <TextField label="Indicaciones generales" multiline rows={4} value={texto} readOnly={soloLectura} onChange={setTexto} onBlur={() => !soloLectura && onGuardar(texto)} />;
}

export function PasoPlan({ consulta, borrador, onGuardar, alergias, soloLectura }: PasoPlanProps) {
  const navigate = useNavigate();
  const { data: tratamiento, isSuccess } = useTratamientoPorConsulta(consulta.id);
  const indicacionesGuardadas = tratamiento?.indicacionesGenerales ?? '';
  const { data: tipos = [] } = useTiposCita();
  const guardar = useGuardarTratamiento();

  const medicamentos = tratamiento?.medicamentos ?? [];
  const [nuevo, setNuevo] = useState<{ concepto: Concepto } & typeof ITEM_VACIO | null>(null);

  const persistir = (items: ItemMedicamentoPayload[], despues?: () => void, indicaciones = indicacionesGuardadas) =>
    guardar.mutate({ consultaId: consulta.id, indicacionesGenerales: indicaciones.trim() || undefined, medicamentos: items }, { onSuccess: despues });

  const agregar = () => {
    if (!nuevo) return;
    persistir(
      [
        ...medicamentos.map(aPayload),
        {
          medicamentoId: nuevo.concepto.id,
          dosis: nuevo.dosis.trim(),
          frecuencia: nuevo.frecuencia.trim(),
          via: nuevo.via || undefined,
          duracion: nuevo.duracion.trim() || undefined,
          indicaciones: nuevo.indicaciones.trim() || undefined,
        },
      ],
      () => setNuevo(null),
    );
  };

  const conAlerta = medicamentos.map((m) => ({ m, alergia: alergiaQueChoca(m.alergenos, alergias) })).filter((x) => x.alergia);
  const controlElegido = CONTROLES.find((c) => c.value === borrador.proximoControl);

  return (
    <>
      {conAlerta.map(({ m, alergia }) => (
        <AlertBanner key={m.id} tone="danger" title={`${m.medicamentoNombre}: alergia registrada a ${sustanciaAlergia(alergia!).toLowerCase()}`}>
          Está relacionado con una alergia de la historia. Quítelo de la prescripción o confirme que es seguro: el récipe lo deja fuera por defecto.
        </AlertBanner>
      ))}

      <Card id="sec-tratamiento" title="Prescripción" flush>
        {soloLectura ? null : (
          <div className="ap-card-body" style={{ borderBottom: '1px solid var(--line)' }}>
            <TerminologySearch
              label="Agregar medicamento"
              placeholder="Principio activo o marca"
              sistema="Catálogo de medicamentos"
              claveCache="medicamento"
              buscar={buscarConceptos.medicamentos}
              onSelect={(c) => setNuevo({ concepto: c, ...ITEM_VACIO })}
            />
          </div>
        )}
        {nuevo ? (
          <div className="ap-med-form">
            <div>
              <b>{nuevo.concepto.nombre}</b>
              {nuevo.concepto.etiqueta ? <span className="cl-muted"> · {nuevo.concepto.etiqueta}</span> : null}
            </div>
            <div className="ap-grid ap-grid-4">
              <TextField label="Dosis" required autoFocus placeholder="1 tableta" value={nuevo.dosis} onChange={(v) => setNuevo({ ...nuevo, dosis: v })} />
              <Select label="Vía" value={nuevo.via} onChange={(v) => setNuevo({ ...nuevo, via: v })} options={VIAS} />
              <TextField label="Frecuencia" required placeholder="Cada 12 h" value={nuevo.frecuencia} onChange={(v) => setNuevo({ ...nuevo, frecuencia: v })} />
              <TextField label="Duración" placeholder="7 días · Continuo" value={nuevo.duracion} onChange={(v) => setNuevo({ ...nuevo, duracion: v })} />
            </div>
            <div className="ap-inline" style={{ alignItems: 'flex-end' }}>
              <TextField label="Indicaciones" style={{ flex: 1 }} placeholder="Ej.: tomar en la mañana" value={nuevo.indicaciones} onChange={(v) => setNuevo({ ...nuevo, indicaciones: v })} />
              <Button onClick={() => setNuevo(null)}>Descartar</Button>
              <Button variant="primary" disabled={nuevo.dosis.trim() === '' || nuevo.frecuencia.trim() === '' || guardar.isPending} onClick={agregar}>
                Agregar al récipe
              </Button>
            </div>
          </div>
        ) : null}
        {medicamentos.length === 0 && !nuevo ? <Vacio>Sin medicamentos indicados.</Vacio> : null}
        {medicamentos.map((m, i) => {
          const alergia = alergiaQueChoca(m.alergenos, alergias);
          return (
            <MedicationItem
              key={m.id}
              index={i + 1}
              drug={m.medicamentoNombre}
              presentation={[m.presentacion, m.concentracion].filter(Boolean).join(' ')}
              dose={m.dosis}
              route={m.via}
              frequency={m.frecuencia}
              duration={m.duracion}
              instructions={m.indicaciones}
              warning={alergia ? `Alergia: ${sustanciaAlergia(alergia).toLowerCase()}` : null}
              onRemove={soloLectura ? undefined : () => persistir(medicamentos.filter((x) => x.id !== m.id).map(aPayload))}
            />
          );
        })}
      </Card>

      <Card id="sec-indicaciones" title="Indicaciones y seguimiento">
        {isSuccess ? (
          <IndicacionesGenerales
            inicial={indicacionesGuardadas}
            soloLectura={soloLectura}
            onGuardar={(texto) => texto !== indicacionesGuardadas && persistir(medicamentos.map(aPayload), undefined, texto)}
          />
        ) : null}
        <div className="ap-grid ap-grid-2">
          <Select
            label="Próximo control"
            value={borrador.proximoControl ?? ''}
            disabled={soloLectura}
            placeholder="Sin control programado"
            options={CONTROLES.map((c) => c.value)}
            onChange={(v) => onGuardar({ proximoControl: v === '' ? null : v })}
          />
          <Select
            label="Tipo"
            value={borrador.proximoControlTipoId ?? ''}
            disabled={soloLectura}
            placeholder="Sin especificar"
            options={tipos.filter((t) => t.activo || t.id === borrador.proximoControlTipoId).map((t) => ({ value: t.id, label: t.nombre }))}
            onChange={(v) => onGuardar({ proximoControlTipoId: v === '' ? null : v })}
          />
        </div>
        <div>
          <Button
            variant="quiet"
            icon="calendar"
            disabled={!controlElegido}
            title={controlElegido ? undefined : 'Elija primero cuándo será el próximo control'}
            onClick={() =>
              controlElegido &&
              navigate({
                to: '/citas',
                search: {
                  nueva: true,
                  fecha: isoDia(controlElegido.fecha(new Date())),
                  pacienteId: consulta.pacienteId,
                  tipoCitaId: borrador.proximoControlTipoId ?? undefined,
                },
              })
            }
          >
            Agendar control ahora
          </Button>
        </div>
      </Card>

    </>
  );
}
