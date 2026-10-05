import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Stack, TextField } from '@mui/material';
import { ConsultaSelect } from '@/components/ConsultaSelect';
import { useConsultasPorPaciente } from '@/features/consultas';
import { useCrearExamen } from '../hooks/useExamenes';
import { TipoExamenAutocomplete } from './TipoExamenAutocomplete';
import type { TipoExamenCatalogo } from '../types';

const schema = z.object({
  fechaSolicitud: z.string().min(1, 'Requerido'),
  notas: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface ExamenFormDialogProps {
  open: boolean;
  pacienteId: string;
  /** Si se provee, el examen se solicita directo en esta consulta (sin selector). */
  consultaId?: string;
  onClose: () => void;
}

export function ExamenFormDialog({ open, pacienteId, consultaId: consultaFija, onClose }: ExamenFormDialogProps) {
  const { data: consultas = [] } = useConsultasPorPaciente(consultaFija ? undefined : pacienteId);
  const crear = useCrearExamen();
  const [tipo, setTipo] = useState<TipoExamenCatalogo | null>(null);
  const [tipoError, setTipoError] = useState(false);
  const [consultaSeleccionada, setConsultaSeleccionada] = useState('');
  const [consultaError, setConsultaError] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { fechaSolicitud: '', notas: '' } });

  const cerrar = () => {
    reset();
    setTipo(null);
    setTipoError(false);
    setConsultaSeleccionada('');
    setConsultaError(false);
    onClose();
  };

  const onSubmit = (values: FormValues) => {
    const consultaId = consultaFija ?? consultaSeleccionada;
    let valido = true;
    if (!tipo) {
      setTipoError(true);
      valido = false;
    }
    if (!consultaId) {
      setConsultaError(true);
      valido = false;
    }
    if (!valido) return;

    crear.mutate(
      { pacienteId, consultaId, tipoExamenId: tipo!.id, fechaSolicitud: values.fechaSolicitud, notas: values.notas || undefined },
      { onSuccess: cerrar },
    );
  };

  return (
    <Dialog open={open} onClose={cerrar} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Solicitar examen</DialogTitle>
      <Stack component="form" onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent>
          <Stack spacing={2.5}>
            {!consultaFija && (
              <ConsultaSelect
                consultas={consultas}
                value={consultaSeleccionada}
                onChange={(v) => { setConsultaSeleccionada(v); setConsultaError(false); }}
                error={consultaError}
                helperText={consultaError ? 'Selecciona una consulta' : undefined}
              />
            )}
            <TipoExamenAutocomplete
              value={tipo}
              onChange={(v) => { setTipo(v); setTipoError(false); }}
              error={tipoError}
              helperText={tipoError ? 'Selecciona un tipo de examen' : undefined}
            />
            <Controller
              name="fechaSolicitud"
              control={control}
              render={({ field }) => (
                <TextField {...field} label="Fecha de solicitud" type="date" slotProps={{ inputLabel: { shrink: true } }} error={!!errors.fechaSolicitud} helperText={errors.fechaSolicitud?.message} />
              )}
            />
            <Controller
              name="notas"
              control={control}
              render={({ field }) => <TextField {...field} label="Notas (opcional)" multiline minRows={2} />}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={cerrar} color="inherit">Cancelar</Button>
          <Button type="submit" variant="contained" loading={crear.isPending} disabled={!consultaFija && consultas.length === 0}>Solicitar</Button>
        </DialogActions>
      </Stack>
    </Dialog>
  );
}
