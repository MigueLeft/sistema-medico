export { useCatalogo, useGuardarCatalogo, catalogoKey } from './hooks/useCatalogos';
export { catalogosService, buscarConceptos } from './services/catalogos.service';
export type {
  CategoriaTermino,
  CentroSaludCatalogo,
  EnfermedadCatalogo,
  EntradaCatalogo,
  MedicamentoCatalogoEntrada,
  MotivoIngresoCatalogo,
  NombreCatalogo,
  OpcionesCatalogo,
  ParaclinicoCatalogo,
  ProcedimientoCatalogo,
  ServicioCatalogo,
  SistemaCatalogo,
  TerminoCatalogo,
} from './types';
export { CatalogoPanel } from './components/CatalogoPanel';
export type { CampoCatalogo, DefCatalogoPanel } from './components/CatalogoPanel';
export {
  DEF_CENTROS,
  DEF_ENFERMEDADES,
  DEF_MEDICAMENTOS,
  DEF_MOTIVOS_INGRESO,
  DEF_PARACLINICOS,
  DEF_PROCEDIMIENTOS,
  DEF_SERVICIOS,
  DEF_SISTEMAS,
} from './components/definiciones';
