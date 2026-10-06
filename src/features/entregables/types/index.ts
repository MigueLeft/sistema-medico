/** Membrete común a todos los documentos. */
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

export type ModoBloque = 'automatico' | 'texto';

/** Bloque de una plantilla, en orden de impresión. Los de modo `texto` se escriben al preparar el documento. */
export interface BloquePlantilla {
  clave: string;
  titulo: string;
  descripcion?: string | null;
  modo: ModoBloque;
}

export type ClavePlantilla = 'recipe' | 'orden_lab' | 'orden_imagen' | 'referencia' | 'indicaciones' | 'informe' | 'constancia' | 'otro';
export type Papel = 'carta' | 'media_carta';

/** Tipo de documento configurable (récipe, orden de laboratorio, referencia…). */
export interface PlantillaDocumento {
  id: string;
  clave: ClavePlantilla;
  nombre: string;
  prefijo: string;
  siguienteNumero: number;
  papel: Papel;
  bloques: BloquePlantilla[];
  generaPendientes: boolean;
  pendienteTipo: 'paraclinico' | 'documento' | 'registro';
  pendienteCuantos: 'uno_por_documento' | 'uno_por_item';
  /** Admite `{clave_de_bloque}`, p. ej. «Informe de {especialidad}». */
  pendienteTexto: string | null;
  entregaImprimir: boolean;
  entregaWhatsapp: boolean;
  entregaCorreo: boolean;
  requiereFirma: boolean;
  activa: boolean;
  orden: number;
}

export type GuardarPlantillaDocumentoPayload = Omit<PlantillaDocumento, 'id' | 'clave' | 'siguienteNumero' | 'orden'>;

export type TipoItem = 'medicamento' | 'examen' | 'texto';

export interface DatosItem {
  nombre?: string | null;
  dosis?: string | null;
  frecuencia?: string | null;
  duracion?: string | null;
  via?: string | null;
  categoria?: string | null;
  indicaciones?: string | null;
  texto?: string | null;
  /** Récipe: cantidad a dispensar, p. ej. «60 (sesenta)». */
  cantidad?: string | null;
  /** Código LOINC de la prueba. */
  codigo?: string | null;
  /** Id de la entrada de catálogo de la que salió (medicamento o tipo de examen). */
  referenciaId?: string | null;
  /** `false` lo deja en el borrador pero fuera del documento emitido. */
  incluido?: boolean | null;
}

export interface ItemEntregablePayload extends DatosItem {
  tipoItem: TipoItem;
}

export interface EntregableItem extends ItemEntregablePayload {
  id: string;
  orden: number;
}

/** Campos del documento que no son items. Cada plantilla usa los de sus bloques. */
export interface DatosEntregable {
  diagnostico?: string;
  prioridad?: string;
  laboratorio?: string;
  preparacion?: string;
  vigenciaDias?: number;
  incluirIndicaciones?: boolean;
  indicacionesGenerales?: string;
  resumen?: string;
  generarPendientes?: boolean;
  /** Texto de los bloques de modo `texto`, por clave de bloque. */
  textos?: Record<string, string>;
}

export type EstadoEntregable = 'borrador' | 'emitido';

export interface Entregable {
  id: string;
  pacienteId: string;
  consultaId: string;
  plantillaDocumentoId: string | null;
  /** Clave de la plantilla. */
  tipo: string;
  plantillaNombre: string | null;
  papel: Papel | null;
  numero: string | null;
  estado: EstadoEntregable;
  titulo: string | null;
  fechaEmision: string;
  emitidoAt: string | null;
  tienePdf: boolean;
  hashSha256: string | null;
  datos: DatosEntregable;
  pendientesGenerados: number;
  items: EntregableItem[];
}

export interface GuardarEntregablePayload {
  datos: DatosEntregable;
  items: ItemEntregablePayload[];
}
