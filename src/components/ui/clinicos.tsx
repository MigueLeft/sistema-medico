import { type ReactNode, useId, useState } from 'react';
import {
  Autocomplete,
  Avatar,
  ButtonBase,
  Chip,
  FormControl,
  FormHelperText,
  FormLabel,
  IconButton,
  InputAdornment,
  InputBase,
  LinearProgress,
  List,
  ListItem,
  ListItemButton,
  ListSubheader,
  Button as MuiButton,
  TextField as MuiTextField,
  OutlinedInput,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fmtNum, iniciales, parseNum, tamanoKb } from '@/lib/formato';
import { TOKENS } from '@/theme/clinica';
import { Icon } from './Icon';
import { type AccionMenu, Badge, MenuAcciones, type Tono, cx } from './basicos';

// ==================== PatientHeader ====================

interface PatientHeaderProps {
  name: string;
  age: string;
  sex: string;
  birthDate?: string;
  documentId?: string;
  recordNo?: string;
  bloodType?: string | null;
  allergies: string[];
  badges?: ReactNode;
  actions?: ReactNode;
}

export function PatientHeader({ name, age, sex, birthDate, documentId, recordNo, bloodType, allergies, badges, actions }: PatientHeaderProps) {
  return (
    <Paper component="section" variant="outlined" aria-label="Paciente">
      <div className="cl-ph">
        <Avatar aria-hidden sx={{ width: 48, height: 48, bgcolor: TOKENS.accentSoft, color: TOKENS.accent, fontWeight: 700, fontSize: 16 }}>
          {iniciales(name)}
        </Avatar>
        <div style={{ minWidth: 0 }}>
          <Typography component="h2" className="cl-ph-name">
            {name}
          </Typography>
          <div className="cl-ph-meta">
            <span>
              <b>{age}</b> · {sex}
            </span>
            {birthDate ? (
              <span>
                Nac. <b className="cl-num">{birthDate}</b>
              </span>
            ) : null}
            {documentId ? (
              <span>
                C.I. <b className="cl-code">{documentId}</b>
              </span>
            ) : null}
            {recordNo ? (
              <span>
                Historia <b className="cl-code">{recordNo}</b>
              </span>
            ) : null}
            {bloodType ? (
              <span>
                Grupo <b>{bloodType}</b>
              </span>
            ) : null}
          </div>
        </div>
        <div className="cl-ph-side">
          {badges}
          {actions}
        </div>
      </div>
      <div className={cx('cl-ph-allergy', allergies.length === 0 && 'cl-none')}>
        <span className="cl-ph-allergy-title">
          {allergies.length > 0 ? <Icon name="alert" /> : null}
          {allergies.length > 0 ? 'Alergias' : 'Sin alergias registradas'}
        </span>
        {allergies.map((a) => (
          <Chip key={a} size="small" label={a} sx={{ bgcolor: TOKENS.surfaceRaised, color: TOKENS.danger }} />
        ))}
      </div>
    </Paper>
  );
}

// ==================== VitalField ====================

export type Rango = [number | null, number | null];

export function banderaDe(valor: number | null, normal?: Rango, critico?: Rango): { tone: Tono; text: string } | null {
  if (valor === null) return null;
  if (critico && ((critico[0] !== null && valor < critico[0]) || (critico[1] !== null && valor > critico[1]))) {
    return { tone: 'danger', text: 'Crítico' };
  }
  if (normal && normal[0] !== null && valor < normal[0]) return { tone: 'warning', text: 'Bajo' };
  if (normal && normal[1] !== null && valor > normal[1]) return { tone: 'warning', text: 'Alto' };
  return null;
}

function textoRango(normal: Rango, decimales: number): string {
  const [min, max] = normal;
  if (min !== null && max !== null) return `Ref. ${fmtNum(min, decimales)}–${fmtNum(max, decimales)}`;
  if (min !== null) return `Ref. ${fmtNum(min, decimales)}+`;
  if (max !== null) return `Ref. ≤${fmtNum(max, decimales)}`;
  return '';
}

interface VitalFieldProps {
  label: string;
  unit: string;
  /** Texto tal como lo escribe el usuario (coma o punto decimal). Ignorado si `calc`. */
  value?: string;
  onChange?: (texto: string) => void;
  onBlur?: () => void;
  normal?: Rango;
  critical?: Rango;
  /** Campo calculado: muestra `calcValue` en solo lectura con la fórmula como ayuda. */
  calc?: boolean;
  calcValue?: number | null;
  formula?: string;
  refDecimals?: number;
  disabled?: boolean;
}

export function VitalField({ label, unit, value = '', onChange, onBlur, normal, critical, calc, calcValue, formula, refDecimals = 0, disabled }: VitalFieldProps) {
  const id = useId();
  const numero = calc ? (calcValue ?? null) : parseNum(value);
  const bandera = banderaDe(numero, normal, critical);
  const texto = calc ? (calcValue === null || calcValue === undefined ? '' : fmtNum(calcValue, 1)) : value;
  const ayuda = calc ? (formula ?? '') : normal ? textoRango(normal, refDecimals) : '';
  return (
    <FormControl fullWidth error={bandera?.tone === 'danger'} sx={{ minWidth: 0 }}>
      <FormLabel htmlFor={id} sx={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
        {label}
        {calc ? (
          <span className="cl-calc" title={formula ?? 'Calculado'}>
            calc.
          </span>
        ) : null}
      </FormLabel>
      <OutlinedInput
        id={id}
        value={texto}
        readOnly={calc || disabled}
        placeholder={calc ? '—' : ''}
        onChange={calc ? undefined : (e) => onChange?.(e.target.value.replace(/[^0-9,.]/g, ''))}
        onBlur={onBlur}
        endAdornment={
          <InputAdornment position="end">
            <Typography variant="caption" color="text.secondary" noWrap>
              {unit}
            </Typography>
          </InputAdornment>
        }
        slotProps={{ input: { inputMode: 'decimal', 'aria-describedby': `${id}-ayuda`, style: { textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 600 } } }}
      />
      <FormHelperText id={`${id}-ayuda`} component="div" className="cl-vital-foot" sx={{ fontWeight: '400 !important', color: `${TOKENS.inkMuted} !important` }}>
        <span>{ayuda}</span>
        {bandera ? (
          <Badge tone={bandera.tone} dot>
            {bandera.text}
          </Badge>
        ) : null}
      </FormHelperText>
    </FormControl>
  );
}

// ==================== TerminologySearch ====================

export interface Concepto {
  id: string;
  codigo: string | null;
  nombre: string;
  etiqueta?: string | null;
  sinonimos?: string | null;
}

function resaltar(termino: string, q: string): ReactNode {
  if (!q) return termino;
  const i = termino.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return termino;
  return (
    <>
      {termino.slice(0, i)}
      <mark>{termino.slice(i, i + q.length)}</mark>
      {termino.slice(i + q.length)}
    </>
  );
}

interface TerminologySearchProps {
  label?: string;
  placeholder?: string;
  /** Nombre del sistema para el pie de la lista: «SNOMED CT», «LOINC», «Catálogo». */
  sistema?: string;
  /** Clave de caché: distingue búsquedas de catálogos distintos. */
  claveCache: string;
  buscar: (query: string) => Promise<Concepto[]>;
  onSelect: (concepto: Concepto) => void;
  /** Si se pasa, ofrece agregar el texto escrito como entrada sin código. */
  onCrear?: (texto: string) => void;
  disabled?: boolean;
}

/** Opción sintética que ofrece agregar el texto escrito como entrada sin código. */
const CREAR = '__crear__';

export function TerminologySearch({ label, placeholder, sistema = 'SNOMED CT', claveCache, buscar, onSelect, onCrear, disabled }: TerminologySearchProps) {
  const id = useId();
  const [q, setQ] = useState('');
  const consulta = q.trim();
  const abierto = consulta.length >= 2;
  const { data: lista = [], isFetching } = useQuery({
    queryKey: ['terminologia', claveCache, consulta],
    queryFn: () => buscar(consulta),
    enabled: abierto,
  });
  // La opción de agregar sin código aparece junto con los resultados, para que el primer resaltado sea un término del catálogo.
  const opciones: Concepto[] = onCrear && abierto && !isFetching ? [...lista, { id: CREAR, codigo: null, nombre: consulta }] : lista;
  const esLoinc = sistema === 'LOINC';

  return (
    <FormControl fullWidth disabled={disabled} sx={{ minWidth: 0 }}>
      {label ? <FormLabel htmlFor={id}>{label}</FormLabel> : null}
      <Autocomplete<Concepto>
        id={id}
        size="small"
        // Es un buscador: tras elegir, vuelve a quedar vacío para agregar otro término.
        value={null}
        inputValue={q}
        onInputChange={(_, texto, motivo) => motivo !== 'reset' && setQ(texto)}
        onChange={(_, elegido) => {
          if (!elegido) return;
          if (elegido.id === CREAR) onCrear?.(elegido.nombre);
          else onSelect(elegido);
          setQ('');
        }}
        open={abierto}
        options={opciones}
        // El filtrado lo hace el catálogo; aquí solo se muestran sus resultados.
        filterOptions={(o) => o}
        getOptionLabel={(o) => o.nombre}
        isOptionEqualToValue={(a, b) => a.id === b.id}
        loading={isFetching}
        loadingText="Buscando…"
        noOptionsText={`Sin coincidencias en ${sistema}. Revise la ortografía o busque por código.`}
        autoHighlight
        disabled={disabled}
        popupIcon={null}
        clearOnBlur={false}
        renderOption={({ key, ...props }, c) => (
          <li key={key} {...props} style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '2px 12px', alignItems: 'start' }}>
            {c.id === CREAR ? (
              <>
                <span className="cl-ts-term">+ Agregar «{c.nombre}» sin código</span>
                <span className="cl-sys cl-sys-local">local</span>
              </>
            ) : (
              <>
                <span className="cl-ts-term">{resaltar(c.nombre, consulta)}</span>
                {c.codigo ? <span className={cx('cl-sys', esLoinc && 'cl-sys-loinc')}>{c.codigo}</span> : <span />}
                <span className="cl-ts-meta" style={{ gridColumn: '1 / -1' }}>
                  {c.etiqueta ? <span>{c.etiqueta}</span> : null}
                  {c.sinonimos ? <span>· {c.sinonimos}</span> : null}
                </span>
              </>
            )}
          </li>
        )}
        renderInput={(params) => (
          <MuiTextField
            {...params}
            placeholder={placeholder ?? 'Buscar por término, sinónimo o código'}
            slotProps={{
              ...params.slotProps,
              input: {
                ...params.slotProps.input,
                startAdornment: (
                  <InputAdornment position="start">
                    <Icon name="search" className="cl-chev" />
                  </InputAdornment>
                ),
              },
            }}
          />
        )}
      />
    </FormControl>
  );
}

// ==================== CodedEntry ====================

interface CodedEntryProps {
  term: string;
  code?: string | null;
  system?: 'SCT' | 'LOINC' | 'Local';
  detail?: ReactNode;
  date?: string | null;
  status?: string | null;
  statusTone?: Tono;
  acciones?: AccionMenu[];
}

export function CodedEntry({ term, code, system = 'SCT', detail, date, status, statusTone = 'neutral', acciones = [] }: CodedEntryProps) {
  const claseSistema = system === 'LOINC' ? 'cl-sys cl-sys-loinc' : system === 'Local' ? 'cl-sys cl-sys-local' : 'cl-sys';
  const prefijo = system === 'LOINC' ? 'LOINC ' : system === 'Local' ? '' : 'SCT ';
  return (
    <div className="cl-entry">
      <div className="cl-entry-main">
        <div className="cl-entry-term">{term}</div>
        <div className="cl-entry-sub">
          {code ? (
            <span className={claseSistema}>
              {prefijo}
              {code}
            </span>
          ) : null}
          {detail ? <span>{detail}</span> : null}
        </div>
      </div>
      {date ? <span className="cl-hint cl-num">{date}</span> : <span />}
      {status ? (
        <Badge tone={statusTone} dot>
          {status}
        </Badge>
      ) : (
        <span />
      )}
      <MenuAcciones acciones={acciones} />
    </div>
  );
}

// ==================== MedicationItem ====================

interface MedicationItemProps {
  index: number;
  drug: string;
  presentation?: string;
  dose?: string;
  route?: string | null;
  frequency?: string;
  duration?: string | null;
  instructions?: string | null;
  warning?: string | null;
  onRemove?: () => void;
  onEdit?: () => void;
}

export function MedicationItem({ index, drug, presentation, dose, route, frequency, duration, instructions, warning, onRemove, onEdit }: MedicationItemProps) {
  const posologia: Array<[string, string | null | undefined]> = [
    ['Dosis', dose],
    ['Vía', route],
    ['Frecuencia', frequency],
    ['Duración', duration],
  ];
  return (
    <div className="cl-med">
      <span className="cl-med-n">{index}</span>
      <div>
        <div>
          <span className="cl-med-drug">{drug}</span>
          {presentation ? <span className="cl-med-pres"> · {presentation}</span> : null}
        </div>
        <div className="cl-med-sig">
          {posologia
            .filter(([, v]) => v)
            .map(([k, v]) => (
              <span key={k}>
                <b>{k}</b>
                {v}
              </span>
            ))}
        </div>
        {instructions ? <div className="cl-med-ins">{instructions}</div> : null}
      </div>
      <div className="cl-row" style={{ gap: 'var(--space-2)' }}>
        {warning ? (
          <Badge tone="danger" dot>
            {warning}
          </Badge>
        ) : null}
        {onEdit ? (
          <MuiButton size="small" variant="text" onClick={onEdit}>
            Editar
          </MuiButton>
        ) : null}
        {onRemove ? (
          <IconButton size="small" aria-label={`Quitar ${drug}`} onClick={onRemove}>
            <Icon name="x" />
          </IconButton>
        ) : null}
      </div>
    </div>
  );
}

// ==================== PendingList ====================

export type EstadoPendienteUi = 'pendiente' | 'entregado' | 'no-entregado';

export interface ItemPendiente {
  id: string;
  label: string;
  code?: string | null;
  kind?: string;
  origin?: string;
  status: EstadoPendienteUi;
  file?: { name: string; size?: number | null } | null;
  /** Muestra el botón de quitar (requiere `onRemove`). */
  removable?: boolean;
}

/** Tipos de archivo que se ofrecen al cargar el documento de un pendiente (el backend acepta cualquiera hasta 25 MB). */
const ARCHIVOS_PENDIENTE = '.pdf,image/*,.heic,.doc,.docx,.xls,.xlsx,.csv,.txt';

const ESTADO_PENDIENTE: Record<EstadoPendienteUi, { tone: Tono; label: string }> = {
  pendiente: { tone: 'warning', label: 'Pendiente' },
  entregado: { tone: 'slate', label: 'Entregado' },
  'no-entregado': { tone: 'neutral', label: 'No lo trajo' },
};

interface PendingListProps {
  items: ItemPendiente[];
  /** Muestra «Cargar documento» y el control Entregado / No lo trajo. */
  editable?: boolean;
  /** Sin el control de estado, pero permite cargar el documento de cada pendiente abierto. */
  uploadable?: boolean;
  compact?: boolean;
  /** Sin insignia de estado ni acciones. */
  plain?: boolean;
  emptyText?: string;
  onChange?: (id: string, estado: EstadoPendienteUi) => void;
  onUpload?: (id: string, archivo: File) => void;
  onOpenFile?: (id: string) => void;
  onRemove?: (id: string) => void;
}

export function PendingList({ items, editable, uploadable, compact, plain, emptyText, onChange, onUpload, onOpenFile, onRemove }: PendingListProps) {
  if (items.length === 0) return <div className="cl-pend-empty">{emptyText ?? 'Sin pendientes.'}</div>;

  const chipArchivo = (it: ItemPendiente) =>
    it.file ? (
      <Chip
        clickable
        size="small"
        icon={<Icon name="file" />}
        title={`Abrir ${it.file.name}`}
        label={
          <>
            {it.file.name}
            {it.file.size ? <span className="cl-pend-size"> {tamanoKb(it.file.size)}</span> : null}
          </>
        }
        onClick={() => onOpenFile?.(it.id)}
        sx={{ height: 28, maxWidth: 240, color: TOKENS.slate, border: `1px solid ${TOKENS.line}`, '& .MuiChip-icon': { color: 'inherit', width: 14, height: 14 } }}
      />
    ) : null;

  const botonCargar = (it: ItemPendiente) => (
    <MuiButton component="label" size="small" variant="text" startIcon={<Icon name="upload" />}>
      Cargar documento
      <input
        type="file"
        hidden
        accept={ARCHIVOS_PENDIENTE}
        aria-label={`Cargar documento de ${it.label}`}
        onChange={(e) => {
          const archivo = e.target.files?.[0];
          if (archivo) onUpload?.(it.id, archivo);
          e.target.value = '';
        }}
      />
    </MuiButton>
  );

  return (
    <List disablePadding className={cx('cl-pend', compact && 'cl-pend-compact')}>
      {items.map((it) => {
        const meta = ESTADO_PENDIENTE[it.status];
        return (
          <ListItem key={it.id} disablePadding className={cx('cl-pend-row', it.status === 'entregado' && 'cl-pend-done')}>
            <div className="cl-pend-main">
              <div className="cl-pend-label">{it.label}</div>
              <div className="cl-entry-sub">
                {it.code ? <span className="cl-sys cl-sys-loinc">LOINC {it.code}</span> : null}
                {it.kind ? <span>{it.kind}</span> : null}
                {it.origin ? <span>· {it.origin}</span> : null}
              </div>
            </div>
            {editable ? (
              <div className="cl-pend-actions">
                {it.file ? chipArchivo(it) : botonCargar(it)}
                <ToggleButtonGroup
                  exclusive
                  size="small"
                  value={it.status === 'pendiente' ? null : it.status}
                  aria-label={`Estado de ${it.label}`}
                  // Volver a pulsar la opción activa devuelve el pendiente a «pendiente».
                  onChange={(_, nuevo: EstadoPendienteUi | null) => onChange?.(it.id, nuevo ?? 'pendiente')}
                >
                  <ToggleButton value="entregado">Entregado</ToggleButton>
                  <ToggleButton value="no-entregado">No lo trajo</ToggleButton>
                </ToggleButtonGroup>
              </div>
            ) : plain ? null : (
              <div className="cl-pend-actions">
                {it.file ? chipArchivo(it) : uploadable ? botonCargar(it) : null}
                <Badge tone={meta.tone} dot>
                  {meta.label}
                </Badge>
                {onRemove && it.removable ? (
                  <IconButton size="small" aria-label={`Quitar ${it.label}`} onClick={() => onRemove(it.id)}>
                    <Icon name="x" />
                  </IconButton>
                ) : null}
              </div>
            )}
          </ListItem>
        );
      })}
    </List>
  );
}

// ==================== AppointmentSlot ====================

export const ESTADOS_CITA: Record<string, { tone: Tono; label: string }> = {
  programada: { tone: 'neutral', label: 'Programada' },
  confirmada: { tone: 'slate', label: 'Confirmada' },
  por_confirmar: { tone: 'warning', label: 'Por confirmar' },
  en_sala: { tone: 'info', label: 'En sala' },
  en_consulta: { tone: 'accent', label: 'En consulta' },
  atendida: { tone: 'neutral', label: 'Atendida' },
  no_asistio: { tone: 'danger', label: 'No asistió' },
  cancelada: { tone: 'neutral', label: 'Cancelada' },
  libre: { tone: 'neutral', label: 'Libre' },
};

interface AppointmentSlotProps {
  time: string;
  duration?: number;
  status: string;
  patient?: string;
  type?: string | null;
  reason?: string;
  pending?: number;
  selected?: boolean;
  onClick?: () => void;
}

export function AppointmentSlot({ time, duration, status, patient, type, reason, pending, selected, onClick }: AppointmentSlotProps) {
  const estado = ESTADOS_CITA[status] ?? ESTADOS_CITA.programada;
  const libre = status === 'libre';
  return (
    // `div` con rol de opción: dentro lleva texto y una insignia, no otros controles.
    <ButtonBase
      component="div"
      role="option"
      aria-selected={!!selected}
      focusRipple
      className={cx('cl-slot', status === 'atendida' && 'cl-slot-done', libre && 'cl-slot-free')}
      onClick={onClick}
      sx={{ display: 'grid', textAlign: 'left', width: '100%', '&.Mui-focusVisible': { outline: `2px solid ${TOKENS.slate}`, outlineOffset: 2 } }}
    >
      <span className="cl-slot-time">
        {time}
        {duration ? <span className="cl-slot-dur">{duration} min</span> : null}
      </span>
      {libre ? (
        <span className="cl-muted">Espacio disponible</span>
      ) : (
        <span>
          <span className="cl-slot-who" style={{ display: 'block' }}>
            {patient}
            {pending ? (
              <span className="cl-slot-pend" title="Pendientes por entregar">
                {pending} {pending === 1 ? 'pendiente' : 'pendientes'}
              </span>
            ) : null}
          </span>
          <span className="cl-slot-why" style={{ display: 'block' }}>
            {[type, reason].filter(Boolean).join(' · ')}
          </span>
        </span>
      )}
      {libre ? (
        <Typography component="span" sx={{ display: 'inline-flex', alignItems: 'center', gap: 1, color: TOKENS.slate, fontWeight: 600, fontSize: 13, '& svg': { width: 16, height: 16 } }}>
          <Icon name="plus" />
          Agendar
        </Typography>
      ) : (
        <Badge tone={estado.tone} dot>
          {estado.label}
        </Badge>
      )}
    </ButtonBase>
  );
}

// ==================== DataTable ====================

export interface Columna<T> {
  key: string;
  label: string;
  align?: 'right';
  width?: number | string;
  mono?: boolean;
  muted?: boolean;
  render: (fila: T) => ReactNode;
}

interface DataTableProps<T> {
  columns: Array<Columna<T>>;
  rows: T[];
  rowKey: (fila: T) => string;
  selectedKey?: string | null;
  onRowClick?: (fila: T) => void;
  emptyText?: string;
}

export function DataTable<T>({ columns, rows, rowKey, selectedKey, onRowClick, emptyText }: DataTableProps<T>) {
  return (
    <TableContainer component={Paper} variant="outlined">
      <Table size="small">
        <TableHead>
          <TableRow>
            {columns.map((c) => (
              <TableCell key={c.key} align={c.align} style={c.width ? { width: c.width } : undefined}>
                {c.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.map((r) => (
            <TableRow
              key={rowKey(r)}
              hover={!!onRowClick}
              selected={selectedKey === rowKey(r)}
              // Las filas accionables también se abren con el teclado.
              tabIndex={onRowClick ? 0 : undefined}
              onClick={() => onRowClick?.(r)}
              onKeyDown={(e) => {
                if (onRowClick && e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
                  e.preventDefault();
                  onRowClick(r);
                }
              }}
              sx={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {columns.map((c) => (
                <TableCell key={c.key} align={c.align} className={cx(c.align === 'right' && 'cl-num', c.mono && 'cl-code', c.muted && 'cl-muted')}>
                  {c.render(r)}
                </TableCell>
              ))}
            </TableRow>
          ))}
          {rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length} align="center" sx={{ color: 'text.secondary', py: 3 }}>
                {emptyText ?? 'Sin registros.'}
              </TableCell>
            </TableRow>
          ) : null}
        </TableBody>
      </Table>
    </TableContainer>
  );
}

// ==================== SectionNav ====================

export type EstadoSeccion = 'done' | 'required' | 'optional' | 'alert';

export interface ItemSeccion {
  id: string;
  label: string;
  status?: EstadoSeccion;
  count?: number | null;
  /** Cuenta para la barra «N de M secciones requeridas». */
  required?: boolean;
}

export interface GrupoSeccion {
  label: string;
  items: ItemSeccion[];
}

const TITULO_ESTADO: Record<EstadoSeccion, string> = { done: 'Completo', required: 'Requerido', optional: 'Opcional', alert: 'Con alerta' };

export function SectionNav({ title, groups, active, onSelect }: { title?: string; groups: GrupoSeccion[]; active: string | null; onSelect: (id: string) => void }) {
  const [filtro, setFiltro] = useState('');
  const requeridas = groups.flatMap((g) => g.items).filter((it) => it.required);
  const completas = requeridas.filter((it) => it.status === 'done').length;
  const aguja = filtro.trim().toLowerCase();

  return (
    <nav className="cl-snav" aria-label={title ?? 'Secciones'}>
      {title ? <div className="cl-snav-title">{title}</div> : null}
      {requeridas.length > 0 ? (
        <div className="cl-snav-progress">
          <div className="cl-snav-progress-text">
            {completas} de {requeridas.length} secciones requeridas
          </div>
          <LinearProgress variant="determinate" value={Math.round((completas / requeridas.length) * 100)} aria-label="Secciones requeridas completas" />
        </div>
      ) : null}
      <InputBase
        className="cl-snav-jump"
        value={filtro}
        placeholder="Ir a sección…"
        onChange={(e) => setFiltro(e.target.value)}
        startAdornment={<Icon name="search" />}
        slotProps={{ input: { 'aria-label': 'Filtrar secciones' } }}
        sx={{ fontSize: 13, '& input': { padding: 0 } }}
      />
      {groups.map((g) => {
        const items = aguja ? g.items.filter((it) => it.label.toLowerCase().includes(aguja)) : g.items;
        if (items.length === 0) return null;
        return (
          <List
            key={g.label}
            dense
            disablePadding
            subheader={
              <ListSubheader component="div" disableSticky disableGutters className="cl-snav-glabel" sx={{ fontSize: 11, lineHeight: '16px', fontWeight: 700, letterSpacing: '.04em', color: 'text.secondary', bgcolor: 'transparent', px: 1, py: 0.5, mt: 1 }}>
                {g.label.toUpperCase()}
              </ListSubheader>
            }
          >
            {items.map((it) => {
              const estado = it.status ?? 'optional';
              return (
                <ListItem key={it.id} disablePadding>
                  <ListItemButton
                    selected={active === it.id}
                    aria-current={active === it.id ? 'location' : undefined}
                    title={TITULO_ESTADO[estado]}
                    onClick={() => onSelect(it.id)}
                    sx={{ gap: 1, minHeight: 30, py: 0, px: 1, borderRadius: '4px', fontSize: 13, '&.Mui-selected': { fontWeight: 700 }, '&:hover': { bgcolor: TOKENS.surfaceSunken } }}
                  >
                    {estado === 'done' ? (
                      <span className="cl-snav-mark cl-snav-done">
                        <Icon name="check" />
                      </span>
                    ) : (
                      <span className={cx('cl-snav-mark', `cl-snav-${estado}`)} />
                    )}
                    <span className="cl-snav-label">{it.label}</span>
                    {it.count !== undefined && it.count !== null ? <span className="cl-snav-count">{it.count}</span> : null}
                  </ListItemButton>
                </ListItem>
              );
            })}
          </List>
        );
      })}
    </nav>
  );
}
