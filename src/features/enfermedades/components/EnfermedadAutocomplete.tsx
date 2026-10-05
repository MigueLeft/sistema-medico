import { useMemo, useState } from 'react';
import { Autocomplete, TextField } from '@mui/material';
import { useCatalogoEnfermedades } from '../hooks/useEnfermedades';
import { CrearEnfermedadCatalogoDialog } from './CrearEnfermedadCatalogoDialog';
import type { EnfermedadCatalogo } from '../types';

const OPCION_CREAR: EnfermedadCatalogo = { id: '__crear__', codigo: '', versionCie: '', nombre: '' };

interface EnfermedadAutocompleteProps {
  value: EnfermedadCatalogo | null;
  onChange: (enfermedad: EnfermedadCatalogo | null) => void;
  error?: boolean;
  helperText?: string;
}

export function EnfermedadAutocomplete({ value, onChange, error, helperText }: EnfermedadAutocompleteProps) {
  const [inputValue, setInputValue] = useState('');
  const [openCrear, setOpenCrear] = useState(false);
  const { data: resultados = [], isFetching } = useCatalogoEnfermedades(inputValue);

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
        getOptionLabel={(option) => (option.id === '__crear__' ? option.nombre : `${option.nombre} (${option.codigo})`)}
        isOptionEqualToValue={(option, val) => option.id === val.id}
        onChange={(_, selected) => {
          if (selected?.id === '__crear__') {
            setOpenCrear(true);
            return;
          }
          onChange(selected);
        }}
        renderInput={(params) => (
          <TextField {...params} label="Enfermedad (CIE)" error={error} helperText={helperText} placeholder="Buscar por nombre o código..." />
        )}
      />
      <CrearEnfermedadCatalogoDialog
        open={openCrear}
        nombreSugerido={inputValue}
        onClose={() => setOpenCrear(false)}
        onCreated={(nueva) => {
          onChange(nueva);
          setOpenCrear(false);
        }}
      />
    </>
  );
}
