export interface MedicamentoCatalogo {
  id: string;
  nombreComercial: string;
  principioActivo: string;
  presentacion: string | null;
  concentracion: string | null;
}

export interface CreateMedicamentoCatalogoPayload {
  nombreComercial: string;
  principioActivo: string;
  presentacion?: string;
  concentracion?: string;
}

export interface TratamientoMedicamento {
  id: string;
  medicamentoId: string;
  medicamentoNombre: string;
  dosis: string;
  frecuencia: string;
  duracion: string | null;
  via: string | null;
  indicaciones: string | null;
}

export interface Tratamiento {
  id: string;
  consultaId: string;
  indicacionesGenerales: string | null;
  medicamentos: TratamientoMedicamento[];
}

export interface ItemMedicamentoPayload {
  medicamentoId: string;
  dosis: string;
  frecuencia: string;
  duracion?: string;
  via?: string;
  indicaciones?: string;
}

export interface GuardarTratamientoPayload {
  consultaId: string;
  indicacionesGenerales?: string;
  medicamentos: ItemMedicamentoPayload[];
}
