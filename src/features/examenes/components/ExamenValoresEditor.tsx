import { useState } from 'react';
import {
  Box,
  Checkbox,
  FormControlLabel,
  IconButton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from '@mui/material';
import { AddOutlined } from '@mui/icons-material';
import { useAgregarValorExamen, useValoresExamen } from '../hooks/useExamenes';

export function ExamenValoresEditor({ examenId }: { examenId: string }) {
  const { data: valores = [] } = useValoresExamen(examenId);
  const agregar = useAgregarValorExamen();

  const [analito, setAnalito] = useState('');
  const [valor, setValor] = useState('');
  const [unidad, setUnidad] = useState('');
  const [rango, setRango] = useState('');
  const [fueraRango, setFueraRango] = useState(false);

  const agregarValor = () => {
    if (!analito.trim() || !valor.trim()) return;
    agregar.mutate(
      { examenId, analito, valor, unidad: unidad || undefined, rangoReferencia: rango || undefined, fueraRango },
      {
        onSuccess: () => {
          setAnalito('');
          setValor('');
          setUnidad('');
          setRango('');
          setFueraRango(false);
        },
      },
    );
  };

  return (
    <Box>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>Valores / analitos</Typography>
      {valores.length > 0 && (
        <Table size="small" sx={{ mb: 2 }}>
          <TableHead>
            <TableRow>
              <TableCell>Analito</TableCell>
              <TableCell>Valor</TableCell>
              <TableCell>Unidad</TableCell>
              <TableCell>Rango</TableCell>
              <TableCell>Fuera de rango</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {valores.map((v) => (
              <TableRow key={v.id}>
                <TableCell>{v.analito}</TableCell>
                <TableCell sx={v.fueraRango ? { color: 'error.main', fontWeight: 700 } : undefined}>{v.valor}</TableCell>
                <TableCell>{v.unidad ?? '—'}</TableCell>
                <TableCell>{v.rangoReferencia ?? '—'}</TableCell>
                <TableCell>{v.fueraRango ? 'Sí' : 'No'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}>
        <TextField size="small" label="Analito" value={analito} onChange={(e) => setAnalito(e.target.value)} sx={{ minWidth: 140 }} />
        <TextField size="small" label="Valor" value={valor} onChange={(e) => setValor(e.target.value)} sx={{ minWidth: 100 }} />
        <TextField size="small" label="Unidad" value={unidad} onChange={(e) => setUnidad(e.target.value)} sx={{ minWidth: 90 }} />
        <TextField size="small" label="Rango ref." value={rango} onChange={(e) => setRango(e.target.value)} sx={{ minWidth: 110 }} />
        <FormControlLabel
          control={<Checkbox size="small" checked={fueraRango} onChange={(e) => setFueraRango(e.target.checked)} />}
          label="Fuera de rango"
        />
        <IconButton color="primary" onClick={agregarValor} disabled={agregar.isPending}>
          <AddOutlined />
        </IconButton>
      </Stack>
    </Box>
  );
}
