import { useState } from 'react';
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { AddOutlined, DeleteOutlined } from '@mui/icons-material';
import { useGuardarTratamiento, useTratamientoPorConsulta } from '../hooks/useTratamientos';
import { MedicamentoAutocomplete } from './MedicamentoAutocomplete';
import type { Tratamiento, MedicamentoCatalogo } from '../types';

interface FilaMedicamento {
  medicamento: MedicamentoCatalogo | null;
  dosis: string;
  frecuencia: string;
  duracion: string;
  via: string;
  indicaciones: string;
}

const FILA_VACIA: FilaMedicamento = { medicamento: null, dosis: '', frecuencia: '', duracion: '', via: '', indicaciones: '' };

function filasIniciales(existente: Tratamiento | null | undefined): FilaMedicamento[] {
  if (!existente || existente.medicamentos.length === 0) return [FILA_VACIA];
  return existente.medicamentos.map((m) => ({
    medicamento: { id: m.medicamentoId, nombreComercial: m.medicamentoNombre, principioActivo: '', presentacion: null, concentracion: null },
    dosis: m.dosis,
    frecuencia: m.frecuencia,
    duracion: m.duracion ?? '',
    via: m.via ?? '',
    indicaciones: m.indicaciones ?? '',
  }));
}

interface TratamientoFormDialogProps {
  open: boolean;
  consultaId: string;
  onClose: () => void;
}

export function TratamientoFormDialog({ open, consultaId, onClose }: TratamientoFormDialogProps) {
  const { data: existente } = useTratamientoPorConsulta(open ? consultaId : undefined);

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700 }}>Tratamiento</DialogTitle>
      {open && (
        <TratamientoFormContent key={`${consultaId}-${existente?.id ?? 'nuevo'}`} consultaId={consultaId} existente={existente} onClose={onClose} />
      )}
    </Dialog>
  );
}

function TratamientoFormContent({
  consultaId,
  existente,
  onClose,
}: {
  consultaId: string;
  existente: Tratamiento | null | undefined;
  onClose: () => void;
}) {
  const guardar = useGuardarTratamiento();
  const [indicacionesGenerales, setIndicacionesGenerales] = useState(existente?.indicacionesGenerales ?? '');
  const [filas, setFilas] = useState<FilaMedicamento[]>(() => filasIniciales(existente));

  const actualizarFila = (index: number, cambios: Partial<FilaMedicamento>) => {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  };

  const guardarTratamiento = () => {
    const medicamentosValidos = filas.filter((f) => f.medicamento && f.dosis.trim() && f.frecuencia.trim());
    guardar.mutate(
      {
        consultaId,
        indicacionesGenerales: indicacionesGenerales || undefined,
        medicamentos: medicamentosValidos.map((f) => ({
          medicamentoId: f.medicamento!.id,
          dosis: f.dosis,
          frecuencia: f.frecuencia,
          duracion: f.duracion || undefined,
          via: f.via || undefined,
          indicaciones: f.indicaciones || undefined,
        })),
      },
      { onSuccess: onClose },
    );
  };

  return (
    <>
      <DialogContent>
        <Stack spacing={2.5}>
          <TextField
            label="Indicaciones generales (opcional)"
            multiline
            minRows={2}
            value={indicacionesGenerales}
            onChange={(e) => setIndicacionesGenerales(e.target.value)}
          />

          <Typography variant="subtitle2">Medicamentos</Typography>
          <Stack spacing={1.5}>
            {filas.map((fila, index) => (
              <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <MedicamentoAutocomplete value={fila.medicamento} onChange={(m) => actualizarFila(index, { medicamento: m })} />
                <TextField size="small" label="Dosis" value={fila.dosis} onChange={(e) => actualizarFila(index, { dosis: e.target.value })} sx={{ width: 110 }} />
                <TextField size="small" label="Frecuencia" value={fila.frecuencia} onChange={(e) => actualizarFila(index, { frecuencia: e.target.value })} sx={{ width: 130 }} />
                <TextField size="small" label="Duración" value={fila.duracion} onChange={(e) => actualizarFila(index, { duracion: e.target.value })} sx={{ width: 110 }} />
                <TextField size="small" label="Vía" value={fila.via} onChange={(e) => actualizarFila(index, { via: e.target.value })} sx={{ width: 100 }} />
                <IconButton onClick={() => setFilas((prev) => prev.filter((_, i) => i !== index))} disabled={filas.length === 1}>
                  <DeleteOutlined fontSize="small" />
                </IconButton>
              </Stack>
            ))}
          </Stack>
          <Button startIcon={<AddOutlined />} onClick={() => setFilas((prev) => [...prev, FILA_VACIA])} sx={{ alignSelf: 'flex-start' }}>
            Agregar medicamento
          </Button>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} color="inherit">Cancelar</Button>
        <Button variant="contained" onClick={guardarTratamiento} loading={guardar.isPending}>Guardar tratamiento</Button>
      </DialogActions>
    </>
  );
}
