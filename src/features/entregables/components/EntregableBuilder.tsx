import { useState } from 'react';
import { Box, Button, Card, CardContent, IconButton, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { AddOutlined, DeleteOutlined, DownloadOutlined, PictureAsPdfOutlined } from '@mui/icons-material';
import { useTratamientoPorConsulta } from '@/features/tratamientos';
import { useCrearEntregable } from '../hooks/useEntregables';
import type { DatosItem, TipoEntregable, TipoItem } from '../types';

const TIPOS: { value: TipoEntregable; label: string; tipoItem: TipoItem }[] = [
  { value: 'receta', label: 'Receta', tipoItem: 'medicamento' },
  { value: 'orden_lab', label: 'Orden de laboratorio / imagenología', tipoItem: 'examen' },
  { value: 'informe', label: 'Informe médico', tipoItem: 'texto' },
  { value: 'constancia', label: 'Constancia médica', tipoItem: 'texto' },
];

const FILA_VACIA: DatosItem = {};

interface EntregableBuilderProps {
  pacienteId: string;
  consultaId: string;
}

export function EntregableBuilder({ pacienteId, consultaId }: EntregableBuilderProps) {
  const [tipo, setTipo] = useState<TipoEntregable>('receta');
  const [titulo, setTitulo] = useState('');
  const [filas, setFilas] = useState<DatosItem[]>([FILA_VACIA]);
  const [textoLibre, setTextoLibre] = useState('');
  const { data: tratamiento } = useTratamientoPorConsulta(tipo === 'receta' ? consultaId : undefined);
  const crear = useCrearEntregable();

  const configTipo = TIPOS.find((t) => t.value === tipo)!;
  const esTexto = configTipo.tipoItem === 'texto';

  const actualizarFila = (index: number, cambios: Partial<DatosItem>) => {
    setFilas((prev) => prev.map((f, i) => (i === index ? { ...f, ...cambios } : f)));
  };

  const cargarDesdeTratamiento = () => {
    if (!tratamiento || tratamiento.medicamentos.length === 0) return;
    setFilas(
      tratamiento.medicamentos.map((m) => ({
        nombre: m.medicamentoNombre,
        dosis: m.dosis,
        frecuencia: m.frecuencia,
        duracion: m.duracion ?? undefined,
        via: m.via ?? undefined,
        indicaciones: m.indicaciones ?? undefined,
      })),
    );
  };

  const generar = () => {
    const items = esTexto
      ? (textoLibre.trim() ? [{ tipoItem: configTipo.tipoItem, texto: textoLibre }] : [])
      : filas
          .filter((f) => f.nombre?.trim())
          .map((f) => ({ tipoItem: configTipo.tipoItem, ...f }));

    crear.mutate(
      { pacienteId, consultaId, tipo, titulo: titulo || undefined, items },
      {
        onSuccess: () => {
          setTitulo('');
          setFilas([FILA_VACIA]);
          setTextoLibre('');
        },
      },
    );
  };

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent>
        <Stack spacing={2.5}>
          <Typography variant="h3">Generar documento</Typography>

          <Stack direction="row" spacing={2}>
            <TextField
              select
              label="Tipo de documento"
              value={tipo}
              onChange={(e) => setTipo(e.target.value as TipoEntregable)}
              sx={{ minWidth: 260 }}
            >
              {TIPOS.map((t) => (
                <MenuItem key={t.value} value={t.value}>{t.label}</MenuItem>
              ))}
            </TextField>
            <TextField label="Título (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} fullWidth />
          </Stack>

          {esTexto ? (
            <TextField
              label="Contenido"
              multiline
              minRows={6}
              value={textoLibre}
              onChange={(e) => setTextoLibre(e.target.value)}
            />
          ) : (
            <Box>
              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {tipo === 'receta' ? 'Medicamentos' : 'Exámenes solicitados'}
                </Typography>
                {tipo === 'receta' && tratamiento && tratamiento.medicamentos.length > 0 && (
                  <Button size="small" startIcon={<DownloadOutlined />} onClick={cargarDesdeTratamiento}>
                    Cargar del tratamiento
                  </Button>
                )}
              </Stack>
              <Stack spacing={1.5}>
                {filas.map((fila, index) => (
                  <Stack key={index} direction="row" spacing={1} sx={{ alignItems: 'flex-start', flexWrap: 'wrap' }}>
                    <TextField
                      size="small"
                      label={tipo === 'receta' ? 'Medicamento' : 'Examen'}
                      value={fila.nombre ?? ''}
                      onChange={(e) => actualizarFila(index, { nombre: e.target.value })}
                      sx={{ minWidth: 200, flex: 1 }}
                    />
                    {tipo === 'receta' ? (
                      <>
                        <TextField size="small" label="Dosis" value={fila.dosis ?? ''} onChange={(e) => actualizarFila(index, { dosis: e.target.value })} sx={{ width: 110 }} />
                        <TextField size="small" label="Frecuencia" value={fila.frecuencia ?? ''} onChange={(e) => actualizarFila(index, { frecuencia: e.target.value })} sx={{ width: 130 }} />
                        <TextField size="small" label="Duración" value={fila.duracion ?? ''} onChange={(e) => actualizarFila(index, { duracion: e.target.value })} sx={{ width: 110 }} />
                        <TextField size="small" label="Vía" value={fila.via ?? ''} onChange={(e) => actualizarFila(index, { via: e.target.value })} sx={{ width: 100 }} />
                      </>
                    ) : (
                      <TextField size="small" label="Categoría" value={fila.categoria ?? ''} onChange={(e) => actualizarFila(index, { categoria: e.target.value })} sx={{ width: 160 }} />
                    )}
                    <IconButton onClick={() => setFilas((prev) => prev.filter((_, i) => i !== index))} disabled={filas.length === 1}>
                      <DeleteOutlined fontSize="small" />
                    </IconButton>
                  </Stack>
                ))}
              </Stack>
              <Button startIcon={<AddOutlined />} onClick={() => setFilas((prev) => [...prev, FILA_VACIA])} sx={{ mt: 1 }}>
                Agregar {tipo === 'receta' ? 'medicamento' : 'examen'}
              </Button>
            </Box>
          )}

          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button variant="contained" startIcon={<PictureAsPdfOutlined />} onClick={generar} loading={crear.isPending}>
              Generar PDF
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  );
}
