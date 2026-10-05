export type TipoAntecedente = 'personal' | 'psicobiologico' | 'familiar';

export interface Antecedente {
  id: string;
  pacienteId: string;
  tipo: TipoAntecedente;
  subcategoria: string | null;
  descripcion: string;
  fechaRegistro: string;
}

export interface CreateAntecedentePayload {
  pacienteId: string;
  tipo: TipoAntecedente;
  subcategoria?: string;
  descripcion: string;
}

export interface IntervencionQx {
  id: string;
  pacienteId: string;
  antecedenteId: string | null;
  consultaId: string | null;
  nombre: string;
  fecha: string;
  notas: string | null;
}

export interface CreateIntervencionQxPayload {
  pacienteId: string;
  antecedenteId?: string;
  consultaId?: string;
  nombre: string;
  fecha: string;
  notas?: string;
}
