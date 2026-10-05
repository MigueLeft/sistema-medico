import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { AddOutlined, SearchOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { examenesService, CrearTipoExamenCatalogoDialog, type TipoExamenCatalogo } from '@/features/examenes';

export function TiposExamenCatalogoTab() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalogo-tipos-examen-admin', query],
    queryFn: () => examenesService.buscarCatalogoTipos(query),
  });

  const columns = useMemo<ColumnDef<TipoExamenCatalogo>[]>(
    () => [
      { header: 'Nombre', accessorKey: 'nombre' },
      { header: 'Categoría', accessorKey: 'categoria' },
      { header: 'Código LOINC', accessorFn: (r) => r.codigoLoinc ?? '—' },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Catálogo de tipos de examen</Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Nuevo tipo de examen
        </Button>
      </Stack>
      <TextField
        placeholder="Buscar por nombre..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ maxWidth: 360, mb: 2 }}
        slotProps={{ input: { startAdornment: <SearchOutlined sx={{ mr: 1, color: 'text.secondary' }} /> } }}
      />
      <DataTable data={items} columns={columns} isLoading={isLoading} emptyMessage="Sin tipos de examen en el catálogo." showSearch={false} />
      <CrearTipoExamenCatalogoDialog
        open={open}
        nombreSugerido=""
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ['catalogo-tipos-examen-admin'] });
        }}
      />
    </Box>
  );
}
