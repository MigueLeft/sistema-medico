import { useMemo, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useCatalogoTiposExamen } from '../hooks/useExamenes';
import { CrearTipoExamenCatalogoDialog } from './CrearTipoExamenCatalogoDialog';
import type { TipoExamenCatalogo } from '../types';

const OPCION_CREAR: TipoExamenCatalogo = { id: '__crear__', nombre: '', categoria: 'otro', codigoLoinc: null };

interface TipoExamenAutocompleteProps {
  value: TipoExamenCatalogo | null;
  onChange: (tipo: TipoExamenCatalogo | null) => void;
  error?: boolean;
  helperText?: string;
}

export function TipoExamenAutocomplete({ value, onChange, error, helperText }: TipoExamenAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [openCrear, setOpenCrear] = useState(false);
  const { data: resultados = [], isFetching } = useCatalogoTiposExamen(inputValue);

  const options = useMemo(() => {
    if (inputValue.trim().length < 2) return resultados;
    return [...resultados, { ...OPCION_CREAR, nombre: `Agregar "${inputValue}" al catálogo…` }];
  }, [resultados, inputValue]);

  return (
    <>
      <Autocomplete
        options={options}
        value={value}
        inputValue={inputValue}
        onInputChange={(_, newValue) => setInputValue(newValue)}
        loading={isFetching}
        getOptionLabel={(option) => option.nombre}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        onChange={(_, selected) => {
          if (selected?.id === '__crear__') {
            setOpenCrear(true);
            return;
          }
          onChange(selected);
        }}
        renderInput={(params) => (
          <TextField {...params} label="Tipo de examen" error={error} helperText={helperText} placeholder="Buscar tipo de examen..." />
        )}
      />
      <CrearTipoExamenCatalogoDialog
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
