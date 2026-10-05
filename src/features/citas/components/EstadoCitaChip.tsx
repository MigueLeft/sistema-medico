import { Chip } from '@mui/material';
import type { EstadoCita } from '../types';

const LABELS: Record<EstadoCita, string> = {
  solicitada: 'Solicitada',
  agendada: 'Agendada',
  atendida: 'Atendida',
  cancelada: 'Cancelada',
};

const COLORS: Record<EstadoCita, { bg: string; color: string }> = {
  solicitada: { bg: '#c2dfe3', color: '#253237' },
  agendada: { bg: '#9db4c0', color: '#182226' },
  atendida: { bg: '#253237', color: '#e0fbfc' },
  cancelada: { bg: '#f1e3e3', color: '#8a3b3b' },
};

export function EstadoCitaChip({ estado }: { estado: EstadoCita }) {
  const { bg, color } = COLORS[estado];
  return <Chip label={LABELS[estado]} size="small" sx={{ bgcolor: bg, color, fontWeight: 700 }} />;
}
