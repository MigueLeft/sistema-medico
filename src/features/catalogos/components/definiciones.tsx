import { Badge, Dato, type Opcion, type Tono } from '@/components/ui';
import { fmtNumLibre } from '@/lib/formato';
import type {
  CentroSaludCatalogo,
  EnfermedadCatalogo,
  MedicamentoCatalogoEntrada,
  MotivoIngresoCatalogo,
  ParaclinicoCatalogo,
  ProcedimientoCatalogo,
  ServicioCatalogo,
  SistemaCatalogo,
} from '../types';
import type { DefCatalogoPanel } from './CatalogoPanel';

const etiqueta = (opciones: Opcion[], valor: string | null) => opciones.find((o) => o.value === valor)?.label ?? valor ?? '—';
const pieSnomed = (n: number) => `${n} conceptos en el subconjunto del consultorio. Agregue aquí los que use; el sistema no incluye SNOMED CT completo.`;

/** «12,0–15,5», «≤ 5,6», «50+». */
function rango(min: number | null, max: number | null): string {
  if (min !== null && max !== null) return `${fmtNumLibre(min)}–${fmtNumLibre(max)}`;
  if (max !== null) return `≤ ${fmtNumLibre(max)}`;
  if (min !== null) return `${fmtNumLibre(min)}+`;
  return '—';
}

const SISTEMAS_CODIGO: Opcion[] = [
  { value: 'SCT', label: 'SNOMED CT' },
  { value: '10', label: 'CIE-10' },
  { value: '11', label: 'CIE-11' },
  { value: 'LOCAL', label: 'Local (sin código)' },
];

export const DEF_ENFERMEDADES: DefCatalogoPanel<EnfermedadCatalogo> = {
  catalogo: 'enfermedades',
  textoAgregar: 'Agregar enfermedad',
  placeholderBusqueda: 'Término, sinónimo o código',
  filtro: { label: 'Terminología', clave: 'versionCie', opciones: SISTEMAS_CODIGO },
  columnas: [
    { key: 'codigo', label: 'Código', width: 130, mono: true, render: (e) => e.codigo },
    { key: 'nombre', label: 'Enfermedad', render: (e) => e.nombre },
    { key: 'sistema', label: 'Terminología', width: 130, muted: true, render: (e) => etiqueta(SISTEMAS_CODIGO, e.versionCie) },
    { key: 'sinonimos', label: 'Sinónimos', muted: true, render: (e) => e.sinonimos ?? '—' },
  ],
  campos: [
    { clave: 'nombre', label: 'Nombre', requerido: true },
    { clave: 'codigo', label: 'Código', mitad: true, hint: 'Vacío = código local.' },
    { clave: 'versionCie', label: 'Terminología', tipo: 'select', opciones: SISTEMAS_CODIGO, requerido: true, mitad: true },
    { clave: 'sinonimos', label: 'Sinónimos', placeholder: 'Separados por coma' },
  ],
  nuevo: { versionCie: 'SCT' },
  titulo: (e) => e.nombre,
  subtitulo: (e) => (
    <>
      <span className="cl-sys">{e.codigo}</span>
      <span>{etiqueta(SISTEMAS_CODIGO, e.versionCie)} · trastorno</span>
    </>
  ),
  pie: pieSnomed,
};

const CATEGORIAS_EXAMEN: Opcion[] = [
  { value: 'laboratorio', label: 'Laboratorio' },
  { value: 'imagenologia', label: 'Imagenología' },
  { value: 'otro', label: 'Otro' },
];

export const DEF_PARACLINICOS: DefCatalogoPanel<ParaclinicoCatalogo> = {
  catalogo: 'paraclinicos',
  textoAgregar: 'Agregar desde LOINC',
  placeholderBusqueda: 'Nombre o código LOINC',
  filtro: { label: 'Grupo', clave: 'grupo' },
  columnas: [
    { key: 'loinc', label: 'LOINC', width: 100, mono: true, render: (p) => p.codigoLoinc ?? '—' },
    { key: 'prueba', label: 'Prueba', render: (p) => p.nombre },
    { key: 'grupo', label: 'Grupo', width: 130, muted: true, render: (p) => p.grupo ?? '—' },
    { key: 'unidad', label: 'Unidad', width: 90, render: (p) => p.unidad ?? '—' },
    { key: 'ref', label: 'Ref. (mujeres)', width: 120, align: 'right', render: (p) => rango(p.refMinMujer, p.refMaxMujer) },
  ],
  campos: [
    { clave: 'nombre', label: 'Nombre LOINC', requerido: true },
    { clave: 'nombreMostrar', label: 'Nombre para mostrar' },
    { clave: 'codigoLoinc', label: 'Código LOINC', mitad: true },
    { clave: 'categoria', label: 'Categoría', tipo: 'select', opciones: CATEGORIAS_EXAMEN, requerido: true, mitad: true },
    { clave: 'grupo', label: 'Grupo', placeholder: 'Hematología, Química…', mitad: true },
    { clave: 'unidad', label: 'Unidad', mitad: true },
    { clave: 'refMinMujer', label: 'Mujeres · mínimo', tipo: 'numero', mitad: true },
    { clave: 'refMaxMujer', label: 'Mujeres · máximo', tipo: 'numero', mitad: true },
    { clave: 'refMinHombre', label: 'Hombres · mínimo', tipo: 'numero', mitad: true },
    {
      clave: 'refMaxHombre',
      label: 'Hombres · máximo',
      tipo: 'numero',
      mitad: true,
    },
    { clave: 'favorito', label: 'Mostrar en favoritos al solicitar', tipo: 'bool' },
  ],
  nuevo: { categoria: 'laboratorio', favorito: true },
  titulo: (p) => p.nombreMostrar ?? p.nombre,
  subtitulo: (p) => (
    <>
      {p.codigoLoinc ? <span className="cl-sys cl-sys-loinc">LOINC {p.codigoLoinc}</span> : null}
      <span>{p.grupo ?? etiqueta(CATEGORIAS_EXAMEN, p.categoria)}</span>
    </>
  ),
  extra: () => (
    <span className="cl-hint">Rangos de referencia para adultos. Un campo vacío significa sin límite. Estos rangos generan las banderas Alto / Bajo en los resultados.</span>
  ),
  pie: (n) => `${n} pruebas en el catálogo del consultorio.`,
};

const TIPOS_PROCEDIMIENTO: Opcion[] = [
  { value: 'diagnostico', label: 'Diagnóstico' },
  { value: 'quirurgico', label: 'Quirúrgico' },
  { value: 'terapeutico', label: 'Terapéutico' },
];
const TONO_PROCEDIMIENTO: Record<string, Tono> = { diagnostico: 'info', quirurgico: 'slate', terapeutico: 'accent' };
const AMBITOS: Opcion[] = [
  { value: 'consultorio', label: 'Consultorio' },
  { value: 'ambulatorio', label: 'Ambulatorio' },
  { value: 'hospitalario', label: 'Hospitalario' },
];

export const DEF_PROCEDIMIENTOS: DefCatalogoPanel<ProcedimientoCatalogo> = {
  catalogo: 'procedimientos',
  textoAgregar: 'Agregar desde SNOMED CT',
  placeholderBusqueda: 'Término, sinónimo o código',
  filtro: { label: 'Tipo', clave: 'tipo', opciones: TIPOS_PROCEDIMIENTO },
  columnas: [
    { key: 'sct', label: 'SNOMED CT', width: 130, mono: true, render: (p) => p.codigoSnomed ?? '—' },
    { key: 'nombre', label: 'Procedimiento', render: (p) => p.nombreMostrar ?? p.nombre },
    { key: 'tipo', label: 'Tipo', width: 140, render: (p) => <Badge tone={TONO_PROCEDIMIENTO[p.tipo]}>{etiqueta(TIPOS_PROCEDIMIENTO, p.tipo)}</Badge> },
    { key: 'ambito', label: 'Ámbito', width: 140, muted: true, render: (p) => etiqueta(AMBITOS, p.ambito) },
  ],
  campos: [
    { clave: 'nombre', label: 'Nombre', requerido: true },
    { clave: 'nombreMostrar', label: 'Nombre para mostrar' },
    { clave: 'codigoSnomed', label: 'Código SNOMED CT' },
    { clave: 'tipo', label: 'Tipo', tipo: 'select', opciones: TIPOS_PROCEDIMIENTO, requerido: true, mitad: true },
    { clave: 'ambito', label: 'Ámbito', tipo: 'select', opciones: AMBITOS, requerido: true, mitad: true },
    { clave: 'estanciaTipica', label: 'Estancia típica', placeholder: '1–2 días' },
    { clave: 'sinonimos', label: 'Sinónimos', placeholder: 'Separados por coma' },
    { clave: 'requiereHospitalizacion', label: 'Requiere hospitalización', tipo: 'bool' },
    { clave: 'favorito', label: 'Mostrar en favoritos al registrar', tipo: 'bool' },
  ],
  nuevo: { tipo: 'quirurgico', ambito: 'hospitalario', favorito: true },
  titulo: (p) => p.nombreMostrar ?? p.nombre,
  subtitulo: (p) => (
    <>
      {p.codigoSnomed ? <span className="cl-sys">SCT {p.codigoSnomed}</span> : null}
      <span>procedimiento</span>
    </>
  ),
  extra: () => <Dato label="Se usa en">Antecedentes · Cirugías y procedimientos</Dato>,
  pie: pieSnomed,
};

const TIPOS_INGRESO: Opcion[] = [
  { value: 'urgencia', label: 'Urgencia' },
  { value: 'programado', label: 'Programado' },
];

export const DEF_MOTIVOS_INGRESO: DefCatalogoPanel<MotivoIngresoCatalogo> = {
  catalogo: 'motivos_ingreso',
  textoAgregar: 'Agregar motivo',
  placeholderBusqueda: 'Término o código',
  filtro: { label: 'Servicio', clave: 'servicioHabitual' },
  columnas: [
    { key: 'sct', label: 'SNOMED CT', width: 130, mono: true, render: (m) => m.codigoSnomed ?? '—' },
    { key: 'nombre', label: 'Motivo de ingreso', render: (m) => m.nombreMostrar ?? m.nombre },
    { key: 'servicio', label: 'Servicio habitual', muted: true, render: (m) => m.servicioHabitual ?? '—' },
    { key: 'estancia', label: 'Estancia típica', width: 130, align: 'right', render: (m) => m.estanciaTipica ?? '—' },
  ],
  campos: [
    { clave: 'nombre', label: 'Nombre', requerido: true },
    { clave: 'nombreMostrar', label: 'Nombre para mostrar' },
    { clave: 'codigoSnomed', label: 'Código SNOMED CT' },
    { clave: 'servicioHabitual', label: 'Servicio habitual', mitad: true },
    { clave: 'tipoIngreso', label: 'Tipo de ingreso', tipo: 'select', opciones: TIPOS_INGRESO, requerido: true, mitad: true },
    { clave: 'estanciaTipica', label: 'Estancia típica', placeholder: '5–7 días' },
    { clave: 'favorito', label: 'Mostrar en favoritos al registrar', tipo: 'bool' },
  ],
  nuevo: { tipoIngreso: 'urgencia', favorito: true },
  titulo: (m) => m.nombreMostrar ?? m.nombre,
  subtitulo: (m) => (
    <>
      {m.codigoSnomed ? <span className="cl-sys">SCT {m.codigoSnomed}</span> : null}
      <span>trastorno · motivo de ingreso</span>
    </>
  ),
  extra: () => (
    <div>
      <div className="cl-label" style={{ marginBottom: 6 }}>
        Campos que se piden al registrar una hospitalización
      </div>
      <div className="cl-row" style={{ gap: 6 }}>
        {['Fecha de ingreso', 'Días de estancia', 'Centro de salud', 'Servicio', 'Estado', 'Detalle'].map((c) => (
          <Badge key={c}>{c}</Badge>
        ))}
      </div>
    </div>
  ),
  pie: pieSnomed,
};

export const DEF_SERVICIOS: DefCatalogoPanel<ServicioCatalogo> = {
  catalogo: 'servicios',
  textoAgregar: 'Agregar servicio',
  placeholderBusqueda: 'Nombre del servicio',
  columnas: [{ key: 'nombre', label: 'Servicio', render: (s) => s.nombre }],
  campos: [{ clave: 'nombre', label: 'Nombre', requerido: true }],
  nuevo: {},
  titulo: (s) => s.nombre,
  pie: (n) => `${n} servicios hospitalarios.`,
};

const TIPOS_CENTRO: Opcion[] = [
  { value: 'publico', label: 'Público' },
  { value: 'privado', label: 'Privado' },
];

export const DEF_CENTROS: DefCatalogoPanel<CentroSaludCatalogo> = {
  catalogo: 'centros_salud',
  textoAgregar: 'Agregar centro',
  placeholderBusqueda: 'Nombre o ciudad',
  columnas: [
    { key: 'nombre', label: 'Centro de salud', render: (c) => c.nombre },
    { key: 'tipo', label: 'Tipo', width: 120, muted: true, render: (c) => etiqueta(TIPOS_CENTRO, c.tipo) },
    { key: 'ciudad', label: 'Ciudad', width: 180, muted: true, render: (c) => c.ciudad ?? '—' },
  ],
  campos: [
    { clave: 'nombre', label: 'Nombre', requerido: true },
    { clave: 'tipo', label: 'Tipo', tipo: 'select', opciones: TIPOS_CENTRO, mitad: true },
    { clave: 'ciudad', label: 'Ciudad', mitad: true },
  ],
  nuevo: {},
  titulo: (c) => c.nombre,
  pie: (n) => `${n} centros de salud.`,
};

export const DEF_SISTEMAS: DefCatalogoPanel<SistemaCatalogo> = {
  catalogo: 'sistemas',
  textoAgregar: 'Agregar aparato o sistema',
  placeholderBusqueda: 'Nombre',
  columnas: [
    { key: 'orden', label: 'Orden', width: 70, align: 'right', render: (s) => s.orden },
    { key: 'nombre', label: 'Aparato o sistema', width: 200, render: (s) => s.nombre },
    { key: 'normal', label: 'Texto al marcar «Normal»', muted: true, render: (s) => s.textoNormal ?? '—' },
    { key: 'estado', label: 'Estado', width: 110, render: (s) => <Badge dot tone={s.activo ? 'slate' : 'neutral'}>{s.activo ? 'Activo' : 'Inactivo'}</Badge> },
  ],
  campos: [
    { clave: 'nombre', label: 'Nombre', requerido: true },
    { clave: 'orden', label: 'Orden en el examen', tipo: 'entero', requerido: true },
    { clave: 'textoNormal', label: 'Texto al marcar «Normal»', tipo: 'area' },
    { clave: 'activo', label: 'Mostrar en el examen por sistemas', tipo: 'bool' },
  ],
  nuevo: { orden: 99, activo: true },
  titulo: (s) => s.nombre,
  extra: () => <Dato label="Se usa en">Consulta · Examen por aparatos y sistemas</Dato>,
  pie: (n) => `${n} aparatos y sistemas.`,
};

export const DEF_MEDICAMENTOS: DefCatalogoPanel<MedicamentoCatalogoEntrada> = {
  catalogo: 'medicamentos',
  textoAgregar: 'Agregar medicamento',
  placeholderBusqueda: 'Principio activo o marca',
  columnas: [
    { key: 'principio', label: 'Principio activo', render: (m) => m.principioActivo },
    { key: 'marca', label: 'Nombre comercial', muted: true, render: (m) => m.nombreComercial },
    { key: 'presentacion', label: 'Presentación', width: 130, render: (m) => m.presentacion ?? '—' },
    { key: 'concentracion', label: 'Concentración', width: 130, render: (m) => m.concentracion ?? '—' },
    { key: 'estado', label: 'Estado', width: 110, render: (m) => <Badge dot tone={m.activo ? 'slate' : 'neutral'}>{m.activo ? 'Activo' : 'Inactivo'}</Badge> },
  ],
  campos: [
    { clave: 'principioActivo', label: 'Principio activo', requerido: true },
    { clave: 'nombreComercial', label: 'Nombre comercial', requerido: true },
    { clave: 'presentacion', label: 'Presentación', placeholder: 'Tableta, cápsula…', mitad: true },
    { clave: 'concentracion', label: 'Concentración', placeholder: '50 mg', mitad: true },
    {
      clave: 'alergenos',
      label: 'Palabras clave de alergia',
      placeholder: 'amoxicilina,penicilina',
      hint: 'Separadas por coma. Si alguna aparece en una alergia del paciente, la prescripción muestra una alerta.',
    },
    { clave: 'activo', label: 'Disponible al prescribir', tipo: 'bool' },
  ],
  nuevo: { activo: true },
  titulo: (m) => m.principioActivo,
  subtitulo: (m) => <span>{[m.presentacion, m.concentracion].filter(Boolean).join(' ')}</span>,
  pie: (n) => `${n} medicamentos en el catálogo.`,
};
