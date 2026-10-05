import { useMemo, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Box, Button, Stack, TextField, Typography } from '@mui/material';
import { AddOutlined, SearchOutlined } from '@mui/icons-material';
import type { ColumnDef } from '@tanstack/react-table';
import { DataTable } from '@/components/DataTable';
import { tratamientosService, CrearMedicamentoCatalogoDialog, type MedicamentoCatalogo } from '@/features/tratamientos';

export function MedicamentosCatalogoTab() {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ['catalogo-medicamentos-admin', query],
    queryFn: () => tratamientosService.buscarCatalogoMedicamentos(query),
  });

  const columns = useMemo<ColumnDef<MedicamentoCatalogo>[]>(
    () => [
      { header: 'Nombre comercial', accessorKey: 'nombreComercial' },
      { header: 'Principio activo', accessorKey: 'principioActivo' },
      { header: 'Presentación', accessorFn: (r) => r.presentacion ?? '—' },
      { header: 'Concentración', accessorFn: (r) => r.concentracion ?? '—' },
    ],
    [],
  );

  return (
    <Box>
      <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h3">Catálogo de medicamentos</Typography>
        <Button variant="contained" startIcon={<AddOutlined />} onClick={() => setOpen(true)}>
          Nuevo medicamento
        </Button>
      </Stack>
      <TextField
        placeholder="Buscar por nombre o principio activo..."
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        sx={{ maxWidth: 360, mb: 2 }}
        slotProps={{ input: { startAdornment: <SearchOutlined sx={{ mr: 1, color: 'text.secondary' }} /> } }}
      />
      <DataTable data={items} columns={columns} isLoading={isLoading} emptyMessage="Sin medicamentos en el catálogo." showSearch={false} />
      <CrearMedicamentoCatalogoDialog
        open={open}
        nombreSugerido=""
        onClose={() => setOpen(false)}
        onCreated={() => {
          setOpen(false);
          queryClient.invalidateQueries({ queryKey: ['catalogo-medicamentos-admin'] });
        }}
      />
    </Box>
  );
}
