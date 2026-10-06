import { Link } from '@mui/material';
import { useNavigate } from '@tanstack/react-router';
import { Badge, Button, ESTADOS_CITA, Panel, PendingList } from '@/components/ui';
import { useIniciarConsulta } from '@/features/consultas';
import { aItemPendiente, estaAbierto, usePendientesPaciente } from '@/features/pendientes';
import { fechaCorta, horaCorta } from '@/lib/formato';
import { useCambiarEstadoCita } from '../hooks/useCitas';
import type { Cita } from '../types';

/** Panel lateral de la vista día: datos de la cita, lo que el paciente debe traer y las acciones sobre la cita. */
export function DetalleCita({ cita, onReprogramar }: { cita: Cita; onReprogramar: () => void }) {
  const navigate = useNavigate();
  const { data: pendientes = [] } = usePendientesPaciente(cita.pacienteId);
  const cambiarEstado = useCambiarEstadoCita();
  const iniciar = useIniciarConsulta();
  const estado = ESTADOS_CITA[cita.estado];
  const abiertos = pendientes.filter(estaAbierto);
  const cerrada = cita.estado === 'atendida' || cita.estado === 'cancelada' || cita.estado === 'no_asistio';

  const abrirConsulta = () => {
    if (cita.consultaId) {
      navigate({ to: '/consultas/$consultaId', params: { consultaId: cita.consultaId } });
      return;
    }
    iniciar.mutate(
      { pacienteId: cita.pacienteId, citaId: cita.id },
      { onSuccess: (consulta) => navigate({ to: '/consultas/$consultaId', params: { consultaId: consulta.id } }) },
    );
  };
  const marcar = (nuevo: Cita['estado']) => cambiarEstado.mutate({ id: cita.id, estado: nuevo });

  return (
    <Panel className="ap-card">
      <div className="ap-card-body">
        <div className="cl-hint" style={{ fontWeight: 600 }}>
          Cita seleccionada · {horaCorta(cita.fechaHora)} · {cita.duracionMin} min
        </div>
        <div>
          <Link component="button" type="button" underline="hover" sx={{ fontSize: 20, lineHeight: '28px', color: 'text.primary', textAlign: 'left' }} onClick={() => navigate({ to: '/pacientes/$pacienteId', params: { pacienteId: cita.pacienteId } })}>
            {cita.pacienteNombre}
          </Link>
          <div className="cl-row" style={{ gap: 'var(--space-2)', marginTop: 'var(--space-2)' }}>
            {cita.tipoCitaNombre ? <Badge tone="accent">{cita.tipoCitaNombre}</Badge> : null}
            <Badge tone={estado.tone} dot>
              {estado.label}
            </Badge>
          </div>
        </div>
        <div className="cl-stack" style={{ gap: 'var(--space-2)' }}>
          <div className="ap-detalle-fila">
            <span className="cl-muted">Motivo</span>
            <span>{cita.motivo || '—'}</span>
          </div>
          <div className="ap-detalle-fila">
            <span className="cl-muted">Historia</span>
            <span className="cl-code">{cita.expedienteCodigo}</span>
          </div>
          <div className="ap-detalle-fila">
            <span className="cl-muted">Teléfono</span>
            <span>{cita.pacienteTelefono ?? '—'}</span>
          </div>
          <div className="ap-detalle-fila">
            <span className="cl-muted">Última consulta</span>
            <span className="cl-num">{fechaCorta(cita.ultimaConsulta)}</span>
          </div>
        </div>

        <div style={{ borderTop: '1px solid var(--line)', paddingTop: 'var(--space-3)' }}>
          <div className="cl-row" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', alignItems: 'baseline' }}>
            <b>Pendientes para esta cita</b>
            <span className="cl-hint">Se revisan dentro de la consulta</span>
          </div>
          <PendingList items={abiertos.map((p) => aItemPendiente(p))} compact plain emptyText="No tiene pendientes por entregar." />
        </div>

        {cita.estado === 'cancelada' || cita.estado === 'no_asistio' ? null : (
          <Button variant="primary" style={{ justifyContent: 'center' }} disabled={iniciar.isPending} onClick={abrirConsulta}>
            {cita.consultaId ? (cita.estado === 'atendida' ? 'Ver consulta' : 'Continuar consulta') : 'Iniciar consulta'}
          </Button>
        )}
        {cerrada ? (
          cita.estado === 'atendida' ? null : (
            <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
              <Button size="sm" onClick={() => marcar('programada')}>
                Reactivar cita
              </Button>
            </div>
          )
        ) : (
          <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
            {cita.estado === 'programada' || cita.estado === 'por_confirmar' ? <Button onClick={() => marcar('confirmada')}>Confirmar</Button> : null}
            {cita.estado !== 'en_sala' && cita.estado !== 'en_consulta' ? <Button onClick={() => marcar('en_sala')}>Marcar en sala</Button> : null}
            {cita.estado !== 'en_consulta' ? <Button onClick={onReprogramar}>Reprogramar</Button> : null}
            {cita.estado !== 'en_consulta' ? (
              <>
                <Button variant="quiet" onClick={() => marcar('no_asistio')}>
                  No asistió
                </Button>
                <Button variant="quiet" onClick={() => marcar('cancelada')}>
                  Cancelar cita
                </Button>
              </>
            ) : null}
          </div>
        )}
      </div>
    </Panel>
  );
}
