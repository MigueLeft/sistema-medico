export {
  useConsultasPorPaciente,
  useConsultas,
  useConsulta,
  useIniciarConsulta,
  useGuardarConsulta,
  useCerrarConsulta,
  useSintomasConsulta,
  useExamenSistemas,
  useDiagnosticosConsulta,
  consultasPorPacienteKey,
  consultaKey,
  CONSULTAS_KEY,
} from './hooks/useConsultas';
export { consultasService } from './services/consultas.service';
export { PasoSubjetivo } from './components/PasoSubjetivo';
export { PasoExamen } from './components/PasoExamen';
export { PasoDiagnostico } from './components/PasoDiagnostico';
export { PasoPlan } from './components/PasoPlan';
export { PasoEntregables } from './components/PasoEntregables';
export type {
  CertezaDiagnostico,
  Consulta,
  ConsultaDiagnostico,
  ConsultaSintoma,
  EstadoConsulta,
  ExamenSistema,
  GuardarConsultaPayload,
  IniciarConsultaPayload,
  RolDiagnostico,
} from './types';
