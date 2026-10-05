export type CategoriaExamen = 'laboratorio' | 'imagenologia' | 'otro';
export type EstadoExamen = 'solicitado' | 'en_proceso' | 'completado' | 'cancelado';

export interface TipoExamenCatalogo {
  id: string;
  nombre: string;
  categoria: CategoriaExamen;
  codigoLoinc: string | null;
}

export interface CreateTipoExamenCatalogoPayload {
  nombre: string;
  categoria: CategoriaExamen;
  codigoLoinc?: string;
}

export interface Examen {
  id: string;
  pacienteId: string;
  consultaId: string;
  tipoExamenId: string;
  tipoExamenNombre: string;
  tipoExamenCategoria: CategoriaExamen;
  fechaSolicitud: string;
  fechaResultado: string | null;
  estado: EstadoExamen;
  notas: string | null;
}

export interface CreateExamenPayload {
  pacienteId: string;
  consultaId: string;
  tipoExamenId: string;
  fechaSolicitud: string;
  notas?: string;
}

export interface ActualizarResultadoExamenPayload {
  fechaResultado: string;
  estado: EstadoExamen;
  notas?: string;
}

export interface ExamenValor {
  id: string;
  examenId: string;
  analito: string;
  valor: string;
  unidad: string | null;
  rangoReferencia: string | null;
  fueraRango: boolean;
}

export interface CreateExamenValorPayload {
  examenId: string;
  analito: string;
  valor: string;
  unidad?: string;
  rangoReferencia?: string;
  fueraRango: boolean;
}
