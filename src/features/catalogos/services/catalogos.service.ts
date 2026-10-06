import { invoke } from '@/lib/tauri';
import type { Concepto } from '@/components/ui';
import type {
  CategoriaTermino,
  EnfermedadCatalogo,
  EntradaCatalogo,
  MedicamentoCatalogoEntrada,
  MotivoIngresoCatalogo,
  NombreCatalogo,
  OpcionesCatalogo,
  ParaclinicoCatalogo,
  ProcedimientoCatalogo,
  TerminoCatalogo,
} from '../types';

const LIMITE_BUSQUEDA = 8;

export const catalogosService = {
  async listar<T extends EntradaCatalogo>(catalogo: NombreCatalogo, opciones: OpcionesCatalogo = {}): Promise<T[]> {
    return invoke<T[]>('listar_catalogo', {
      catalogo,
      query: opciones.query ?? null,
      filtros: opciones.filtros ?? null,
      limite: opciones.limite ?? null,
    });
  },

  /** `id` nulo crea la entrada; al actualizar solo se modifican las claves presentes en `datos`. */
  async guardar<T extends EntradaCatalogo>(catalogo: NombreCatalogo, id: string | null, datos: Partial<Omit<T, 'id'>>): Promise<T> {
    return invoke<T>('guardar_catalogo', { catalogo, id, datos });
  },
};

/** Búsquedas para `TerminologySearch`: adaptan cada catálogo a la forma común `Concepto`. */
export const buscarConceptos = {
  async trastornos(query: string): Promise<Concepto[]> {
    const items = await catalogosService.listar<EnfermedadCatalogo>('enfermedades', { query, limite: LIMITE_BUSQUEDA });
    return items.map((e) => ({
      id: e.id,
      codigo: e.codigo,
      nombre: e.nombre,
      etiqueta: e.versionCie === 'SCT' ? 'trastorno' : e.versionCie === 'LOCAL' ? 'local' : `CIE-${e.versionCie}`,
      sinonimos: e.sinonimos,
    }));
  },

  terminos(categoria: CategoriaTermino) {
    return async (query: string): Promise<Concepto[]> => {
      const items = await catalogosService.listar<TerminoCatalogo>('terminos', { query, filtros: { categoria }, limite: LIMITE_BUSQUEDA });
      return items.map((t) => ({ id: t.id, codigo: t.codigo, nombre: t.nombre, etiqueta: t.etiqueta, sinonimos: t.sinonimos }));
    };
  },

  async procedimientos(query: string): Promise<Concepto[]> {
    const items = await catalogosService.listar<ProcedimientoCatalogo>('procedimientos', { query, limite: LIMITE_BUSQUEDA });
    return items.map((p) => ({ id: p.id, codigo: p.codigoSnomed, nombre: p.nombreMostrar ?? p.nombre, etiqueta: 'procedimiento', sinonimos: p.sinonimos }));
  },

  async motivosIngreso(query: string): Promise<Concepto[]> {
    const items = await catalogosService.listar<MotivoIngresoCatalogo>('motivos_ingreso', { query, limite: LIMITE_BUSQUEDA });
    return items.map((m) => ({ id: m.id, codigo: m.codigoSnomed, nombre: m.nombreMostrar ?? m.nombre, etiqueta: m.servicioHabitual }));
  },

  async paraclinicos(query: string): Promise<Concepto[]> {
    const items = await catalogosService.listar<ParaclinicoCatalogo>('paraclinicos', { query, limite: LIMITE_BUSQUEDA });
    return items.map((p) => ({ id: p.id, codigo: p.codigoLoinc, nombre: p.nombre, etiqueta: p.grupo }));
  },

  async medicamentos(query: string): Promise<Concepto[]> {
    const items = await catalogosService.listar<MedicamentoCatalogoEntrada>('medicamentos', { query, filtros: { activo: '1' }, limite: LIMITE_BUSQUEDA });
    return items.map((m) => ({
      id: m.id,
      codigo: null,
      nombre: m.principioActivo === m.nombreComercial ? m.principioActivo : `${m.principioActivo} (${m.nombreComercial})`,
      etiqueta: [m.presentacion, m.concentracion].filter(Boolean).join(' '),
    }));
  },
};
