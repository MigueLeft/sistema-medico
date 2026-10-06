export { EditorEntregable } from './components/EditorEntregable';
export { PlantillasDocumento } from './components/PlantillasDocumento';
export { VistaPreviaEntregable } from './components/VistaPreviaEntregable';
export { descripcionPlantilla, iconoDe, PAPELES } from './components/bloques';
export {
  usePlantillaEntregable,
  useGuardarPlantillaEntregable,
  usePlantillasDocumento,
  useGuardarPlantillaDocumento,
  useEntregablesPaciente,
  useEntregablesConsulta,
  useEntregable,
  useCrearEntregable,
  useGuardarEntregable,
  useEmitirEntregable,
  useEliminarEntregable,
  useAbrirEntregable,
} from './hooks/useEntregables';
export { entregablesService } from './services/entregables.service';
export type {
  BloquePlantilla,
  DatosEntregable,
  Entregable,
  EntregableItem,
  EstadoEntregable,
  GuardarEntregablePayload,
  GuardarPlantillaDocumentoPayload,
  GuardarPlantillaEntregablePayload,
  ItemEntregablePayload,
  Papel,
  PlantillaDocumento,
  PlantillaEntregable,
} from './types';
