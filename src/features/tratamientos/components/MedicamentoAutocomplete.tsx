import { useMemo, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useCatalogoMedicamentos } from '../hooks/useTratamientos';
import { CrearMedicamentoCatalogoDialog } from './CrearMedicamentoCatalogoDialog';
import type { MedicamentoCatalogo } from '../types';

const OPCION_CREAR: MedicamentoCatalogo = { id: '__crear__', nombreComercial: '', principioActivo: '', presentacion: null, concentracion: null };

interface MedicamentoAutocompleteProps {
  value: MedicamentoCatalogo | null;
  onChange: (medicamento: MedicamentoCatalogo | null) => void;
  error?: boolean;
}

export function MedicamentoAutocomplete({ value, onChange, error }: MedicamentoAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [openCrear, setOpenCrear] = useState(false);
  const { data: resultados = [], isFetching } = useCatalogoMedicamentos(inputValue);

  const options = useMemo(() => {
    if (inputValue.trim().length < 2) return resultados;
    return [...resultados, { ...OPCION_CREAR, nombreComercial: `Agregar "${inputValue}" al catálogo…` }];
  }, [resultados, inputValue]);

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        inputValue={inputValue}
        onInputChange={(_, newValue) => setInputValue(newValue)}
        loading={isFetching}
        getOptionLabel={(option) => (option.id === '__crear__' ? option.nombreComercial : `${option.nombreComercial} (${option.principioActivo})`)}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        onChange={(_, selected) => {
          if (selected?.id === '__crear__') {
            setOpenCrear(true);
            return;
          }
          onChange(selected);
        }}
        renderInput={(params) => <TextField {...params} label="Medicamento" size="small" error={error} placeholder="Buscar medicamento..." />}
        sx={{ minWidth: 220, flex: 1 }}
      />
      <CrearMedicamentoCatalogoDialog
        open={openCrear}
        nombreSugerido={inputValue}
        onClose={() => setOpenCrear(false)}
        onCreated={(nuevo) => {
          onChange(nuevo);
          setOpenCrear(false);
        }}
      />
    </>
  );
}
