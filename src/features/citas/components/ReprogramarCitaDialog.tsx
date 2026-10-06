import { useMemo, useState } from 'react';
import { format } from 'date-fns';
import { Button, Modal, Select, TextField } from '@/components/ui';
import { useConfiguracionAgenda } from '@/features/agenda';
import { aFecha, hhmmA12 } from '@/lib/formato';
import { useReprogramarCita } from '../hooks/useCitas';
import type { Cita } from '../types';
import { opcionesDeHora } from './horario';

export function ReprogramarCitaDialog({ cita, onClose }: { cita: Cita | null; onClose: () => void }) {
  // `key` reinicia fecha y hora al pasar de una cita a otra.
  return cita ? <Formulario key={cita.id} cita={cita} onClose={onClose} /> : null;
}

function Formulario({ cita, onClose }: { cita: Cita; onClose: () => void }) {
  const { data: cfg } = useConfiguracionAgenda();
  const reprogramar = useReprogramarCita();
  const [fecha, setFecha] = useState(() => format(aFecha(cita.fechaHora), 'yyyy-MM-dd'));
  const [hora, setHora] = useState(() => format(aFecha(cita.fechaHora), 'HH:mm'));

  // La hora actual se conserva como opción aunque hoy quede fuera del horario configurado.
  const horas = useMemo(() => [...new Set([...(cfg ? opcionesDeHora(cfg) : []), hora])].sort(), [cfg, hora]);

  return (
    <Modal
      open
      title="Reprogramar cita"
      onClose={onClose}
      width={460}
      footer={
        <>
          <Button onClick={onClose}>Cancelar</Button>
          <Button
            variant="primary"
            disabled={!fecha || !hora || reprogramar.isPending}
            onClick={() => reprogramar.mutate({ id: cita.id, payload: { fechaHora: `${fecha}T${hora}:00` } }, { onSuccess: onClose })}
          >
            Reprogramar
          </Button>
        </>
      }
    >
      <div>
        <b>{cita.pacienteNombre}</b>
        <div className="cl-hint">{[cita.tipoCitaNombre, cita.motivo].filter(Boolean).join(' · ')}</div>
      </div>
      <div className="ap-grid ap-grid-2">
        <TextField label="Nueva fecha" required type="date" value={fecha} onChange={setFecha} />
        <Select label="Nueva hora" required value={hora} onChange={setHora} options={horas.map((h) => ({ value: h, label: hhmmA12(h) }))} />
      </div>
      <span className="cl-hint">La cita vuelve al estado «Programada» y deberá confirmarse de nuevo.</span>
    </Modal>
  );
}
