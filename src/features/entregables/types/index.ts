export type TipoEntregable = 'receta' | 'orden_lab' | 'informe' | 'constancia';
export type TipoItem = 'medicamento' | 'examen' | 'texto';

export interface PlantillaEntregable {
  id: string;
  nombreConsultorio: string | null;
  encabezado: string | null;
  piePagina: string | null;
}

export interface GuardarPlantillaEntregablePayload {
  nombreConsultorio?: string;
  encabezado?: string;
  piePagina?: string;
}

export interface DatosItem {
  nombre?: string;
  dosis?: string;
  frecuencia?: string;
  duracion?: string;
  via?: string;
  categoria?: string;
  indicaciones?: string;
  texto?: string;
}

export interface EntregableItem extends DatosItem {
  id: string;
  orden: number;
  tipoItem: TipoItem;
}

export interface ItemEntregablePayload extends DatosItem {
  tipoItem: TipoItem;
}

export interface Entregable {
  id: string;
  pacienteId: string;
  consultaId: string;
  tipo: TipoEntregable;
  titulo: string | null;
  fechaEmision: string;
  archivoPdfPath: string | null;
  hashSha256: string | null;
  items: EntregableItem[];
}

export interface CreateEntregablePayload {
  pacienteId: string;
  consultaId: string;
  tipo: TipoEntregable;
  titulo?: string;
  items: ItemEntregablePayload[];
}
