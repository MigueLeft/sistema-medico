import { Chip } from '@mui/material';
import type { EstadoExamen } from '../types';

const LABELS: Record<EstadoExamen, string> = {
  solicitado: 'Solicitado',
  en_proceso: 'En proceso',
  completado: 'Completado',
  cancelado: 'Cancelado',
};

const COLORS: Record<EstadoExamen, { bg: string; color: string }> = {
  solicitado: { bg: '#c2dfe3', color: '#253237' },
  en_proceso: { bg: '#9db4c0', color: '#182226' },
  completado: { bg: '#253237', color: '#e0fbfc' },
  cancelado: { bg: '#f1e3e3', color: '#8a3b3b' },
};

export function EstadoExamenChip({ estado }: { estado: EstadoExamen }) {
  const { bg, color } = COLORS[estado];
  return <Chip label={LABELS[estado]} size="small" sx={{ bgcolor: bg, color, fontWeight: 700 }} />;
}
