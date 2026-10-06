/** Nombres de catálogo que acepta `listar_catalogo` / `guardar_catalogo`. */
export type NombreCatalogo =
  | 'enfermedades'
  | 'paraclinicos'
  | 'procedimientos'
  | 'motivos_ingreso'
  | 'servicios'
  | 'centros_salud'
  | 'sistemas'
  | 'medicamentos'
  | 'terminos';

export interface EntradaCatalogo {
  id: string;
}

export interface EnfermedadCatalogo extends EntradaCatalogo {
  codigo: string;
  /** '10' | '11' (CIE), 'SCT' (SNOMED CT) o 'LOCAL'. */
  versionCie: string;
  nombre: string;
  sinonimos: string | null;
}

export interface ParaclinicoCatalogo extends EntradaCatalogo {
  nombre: string;
  nombreMostrar: string | null;
  categoria: string;
  codigoLoinc: string | null;
  grupo: string | null;
  unidad: string | null;
  refMinMujer: number | null;
  refMaxMujer: number | null;
  refMinHombre: number | null;
  refMaxHombre: number | null;
  favorito: boolean;
}

export interface ProcedimientoCatalogo extends EntradaCatalogo {
  codigoSnomed: string | null;
  nombre: string;
  nombreMostrar: string | null;
  tipo: 'diagnostico' | 'quirurgico' | 'terapeutico';
  ambito: 'consultorio' | 'ambulatorio' | 'hospitalario';
  requiereHospitalizacion: boolean;
  estanciaTipica: string | null;
  sinonimos: string | null;
  favorito: boolean;
}

export interface MotivoIngresoCatalogo extends EntradaCatalogo {
  codigoSnomed: string | null;
  nombre: string;
  nombreMostrar: string | null;
  servicioHabitual: string | null;
  tipoIngreso: 'urgencia' | 'programado';
  estanciaTipica: string | null;
  favorito: boolean;
}

export interface ServicioCatalogo extends EntradaCatalogo {
  nombre: string;
}

export interface CentroSaludCatalogo extends EntradaCatalogo {
  nombre: string;
  tipo: string | null;
  ciudad: string | null;
}

export interface SistemaCatalogo extends EntradaCatalogo {
  nombre: string;
  orden: number;
  textoNormal: string | null;
  activo: boolean;
}

export interface MedicamentoCatalogoEntrada extends EntradaCatalogo {
  nombreComercial: string;
  principioActivo: string;
  presentacion: string | null;
  concentracion: string | null;
  /** Palabras clave separadas por coma que se cruzan con las alergias del paciente. */
  alergenos: string | null;
  activo: boolean;
}

export type CategoriaTermino = 'sintoma' | 'alergia' | 'habito';

export interface TerminoCatalogo extends EntradaCatalogo {
  categoria: CategoriaTermino;
  codigo: string | null;
  nombre: string;
  etiqueta: string | null;
  sinonimos: string | null;
}

export interface OpcionesCatalogo {
  query?: string;
  filtros?: Record<string, string>;
  limite?: number;
}
