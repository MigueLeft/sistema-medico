import { MenuItem, TextField } from '@mui/material';
import { format, parseISO } from 'date-fns';
import { es } from 'date-fns/locale';
import type { Consulta } from '@/features/consultas';

interface ConsultaSelectProps {
  consultas: Consulta[];
  value: string;
  onChange: (consultaId: string) => void;
  error?: boolean;
  helperText?: string;
}

export function ConsultaSelect({ consultas, value, onChange, error, helperText }: ConsultaSelectProps) {
  return (
    <TextField
      select
      label="Consulta asociada"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      error={error}
      helperText={helperText ?? (consultas.length === 0 ? 'Este paciente no tiene consultas registradas todavía.' : undefined)}
      disabled={consultas.length === 0}
    >
      {consultas.map((c) => (
        <MenuItem key={c.id} value={c.id}>
          {format(parseISO(c.fecha), "d MMM yyyy, HH:mm", { locale: es })} — {c.motivoConsulta}
        </MenuItem>
      ))}
    </TextField>
  );
}
