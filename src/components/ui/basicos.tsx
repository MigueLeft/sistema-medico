import { type CSSProperties, type ReactNode, useId, useState } from 'react';
import {
  Alert,
  AlertTitle,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  FormLabel,
  IconButton,
  InputAdornment,
  Menu,
  MenuItem,
  Button as MuiButton,
  type ButtonProps as MuiButtonProps,
  Checkbox as MuiCheckbox,
  Select as MuiSelect,
  Tab as MuiTab,
  Tabs as MuiTabs,
  OutlinedInput,
  Paper,
  ToggleButton,
  ToggleButtonGroup,
  Typography,
} from '@mui/material';
import { TOKENS } from '@/theme/clinica';
import { Icon, type NombreIcono } from './Icon';

export function cx(...clases: Array<string | false | null | undefined>): string {
  return clases.filter(Boolean).join(' ');
}

export type Tono = 'neutral' | 'slate' | 'accent' | 'danger' | 'warning' | 'info';

const COLOR_TONO: Record<Tono, { fondo: string; texto: string }> = {
  neutral: { fondo: TOKENS.surfaceSunken, texto: TOKENS.inkMuted },
  slate: { fondo: TOKENS.slateSoft, texto: TOKENS.slate },
  accent: { fondo: TOKENS.accentSoft, texto: TOKENS.accent },
  danger: { fondo: TOKENS.dangerSoft, texto: TOKENS.danger },
  warning: { fondo: TOKENS.warningSoft, texto: TOKENS.warning },
  info: { fondo: TOKENS.infoSoft, texto: TOKENS.info },
};

interface ButtonProps extends Omit<MuiButtonProps, 'variant' | 'size' | 'color'> {
  variant?: 'secondary' | 'primary' | 'quiet' | 'danger';
  size?: 'md' | 'sm';
  icon?: NombreIcono;
}

const VARIANTE: Record<NonNullable<ButtonProps['variant']>, MuiButtonProps['variant']> = { secondary: 'outlined', primary: 'contained', quiet: 'text', danger: 'contained' };

export function Button({ variant = 'secondary', size = 'md', icon, children, ...rest }: ButtonProps) {
  return (
    <MuiButton variant={VARIANTE[variant]} color={variant === 'danger' ? 'error' : 'primary'} size={size === 'sm' ? 'small' : 'medium'} startIcon={icon ? <Icon name={icon} /> : undefined} {...rest}>
      {children}
    </MuiButton>
  );
}

/** Botón de solo icono; `label` es su nombre accesible. */
export function BotonIcono({ icon, label, onClick, disabled, className }: { icon: NombreIcono; label: string; onClick?: () => void; disabled?: boolean; className?: string }) {
  return (
    <IconButton aria-label={label} title={label} onClick={onClick} disabled={disabled} size="small">
      <Icon name={icon} className={className} />
    </IconButton>
  );
}

export function Badge({ tone = 'neutral', dot, children }: { tone?: Tono; dot?: boolean; children: ReactNode }) {
  const color = COLOR_TONO[tone];
  return (
    <Chip
      size="small"
      label={children}
      icon={dot ? <span aria-hidden style={{ width: 6, height: 6, borderRadius: 999, background: 'currentColor', flex: 'none' }} /> : undefined}
      sx={{ bgcolor: color.fondo, color: color.texto, '& .MuiChip-icon': { color: 'inherit' } }}
    />
  );
}

interface FieldProps {
  label?: ReactNode;
  required?: boolean;
  error?: string;
  hint?: ReactNode;
  style?: CSSProperties;
}

/** Etiqueta + ayuda alrededor de un control que no es un campo simple (grupo de botones, selección compuesta…). */
export function Field({ label, required, error, hint, style, children }: FieldProps & { children: ReactNode }) {
  return (
    <FormControl component="div" fullWidth error={!!error} required={required} style={style} sx={{ minWidth: 0 }}>
      {label ? <FormLabel component="div">{label}</FormLabel> : null}
      {children}
      {error || hint ? <FormHelperText>{error ?? hint}</FormHelperText> : null}
    </FormControl>
  );
}

interface TextFieldProps extends FieldProps {
  value: string;
  onChange?: (valor: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  type?: string;
  multiline?: boolean;
  rows?: number;
  readOnly?: boolean;
  disabled?: boolean;
  unit?: string;
  inputMode?: 'text' | 'decimal' | 'numeric' | 'tel' | 'email';
  autoFocus?: boolean;
}

export function TextField({ label, required, error, hint, style, value, onChange, onBlur, placeholder, type = 'text', multiline, rows = 3, readOnly, disabled, unit, inputMode, autoFocus }: TextFieldProps) {
  const id = useId();
  return (
    <FormControl fullWidth error={!!error} required={required} disabled={disabled} style={style} sx={{ minWidth: 0 }}>
      {label ? <FormLabel htmlFor={id}>{label}</FormLabel> : null}
      <OutlinedInput
        id={id}
        value={value}
        type={type}
        placeholder={placeholder}
        multiline={multiline}
        minRows={multiline ? rows : undefined}
        readOnly={readOnly}
        autoFocus={autoFocus}
        onChange={(e) => onChange?.(e.target.value)}
        onBlur={onBlur}
        endAdornment={unit ? <InputAdornment position="end"><Typography variant="caption" color="text.secondary" noWrap>{unit}</Typography></InputAdornment> : undefined}
        slotProps={{ input: { inputMode, 'aria-describedby': error || hint ? `${id}-ayuda` : undefined } }}
      />
      {error || hint ? <FormHelperText id={`${id}-ayuda`}>{error ?? hint}</FormHelperText> : null}
    </FormControl>
  );
}

/** Flecha del diseño para los desplegables (MUI le pasa las clases que la posicionan y la giran al abrir). */
function Chevron({ className }: { className?: string }) {
  return <Icon name="chevron" className={className} />;
}

export interface Opcion {
  value: string;
  label: string;
}

interface SelectProps extends FieldProps {
  value: string;
  onChange: (valor: string) => void;
  options: Array<Opcion | string>;
  /** Texto de la opción vacía; si se omite, no hay opción vacía. */
  placeholder?: string;
  disabled?: boolean;
}

export function Select({ label, required, error, hint, style, value, onChange, options, placeholder, disabled }: SelectProps) {
  const id = useId();
  const opciones = options.map((o) => (typeof o === 'string' ? { value: o, label: o } : o));
  return (
    <FormControl fullWidth error={!!error} required={required} disabled={disabled} style={style} sx={{ minWidth: 0 }}>
      {label ? <FormLabel id={`${id}-etiqueta`}>{label}</FormLabel> : null}
      <MuiSelect
        labelId={label ? `${id}-etiqueta` : undefined}
        value={value}
        displayEmpty
        IconComponent={Chevron}
        onChange={(e) => onChange(e.target.value)}
        renderValue={(v) => {
          const elegida = opciones.find((o) => o.value === v);
          return elegida ? elegida.label : <Typography component="span" color={v === '' ? 'text.secondary' : 'text.primary'}>{v === '' ? (placeholder ?? '') : v}</Typography>;
        }}
        MenuProps={{ slotProps: { paper: { sx: { maxHeight: 320 } } } }}
      >
        {placeholder !== undefined ? <MenuItem value="">{placeholder}</MenuItem> : null}
        {opciones.map((o) => (
          <MenuItem key={o.value} value={o.value}>
            {o.label}
          </MenuItem>
        ))}
      </MuiSelect>
      {error || hint ? <FormHelperText>{error ?? hint}</FormHelperText> : null}
    </FormControl>
  );
}

export function Checkbox({ checked, onChange, children, disabled }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode; disabled?: boolean }) {
  return (
    <FormControlLabel
      control={<MuiCheckbox checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} />}
      label={<span>{children}</span>}
      // Con etiquetas de varias líneas la casilla queda alineada con la primera.
      sx={{ alignItems: 'flex-start', '& .MuiFormControlLabel-label': { paddingTop: '4px' }, '&.Mui-disabled .MuiFormControlLabel-label': { color: 'text.primary' } }}
    />
  );
}

/** Control segmentado (Día / Semana / Mes, Normal / Con hallazgos, …). */
export function Segmented<T extends string>({
  value,
  onChange,
  options,
  size = 'md',
  tone = 'slate',
  ariaLabel,
}: {
  value: T | null;
  /** Se llama también al pulsar la opción ya elegida, con ese mismo valor. */
  onChange: (valor: T) => void;
  options: Array<{ value: T; label: string; tone?: 'slate' | 'warning' | 'soft' }>;
  size?: 'md' | 'sm';
  tone?: 'slate' | 'soft';
  ariaLabel?: string;
}) {
  const seleccionado = { soft: { bgcolor: TOKENS.slateSoft, color: TOKENS.slate }, warning: { bgcolor: TOKENS.warningSoft, color: TOKENS.warning } };
  return (
    <ToggleButtonGroup exclusive size={size === 'sm' ? 'small' : 'medium'} value={value} aria-label={ariaLabel} onChange={(_, nuevo: T | null) => (nuevo ?? value) && onChange((nuevo ?? value) as T)}>
      {options.map((o) => {
        const tono = o.tone ?? tone;
        return (
          <ToggleButton key={o.value} value={o.value} sx={tono === 'slate' ? undefined : { '&.Mui-selected, &.Mui-selected:hover': seleccionado[tono] }}>
            {o.label}
          </ToggleButton>
        );
      })}
    </ToggleButtonGroup>
  );
}

export interface TabItem {
  id: string;
  label: string;
  count?: number;
}

export function Tabs({ items, active, onChange }: { items: TabItem[]; active: string; onChange: (id: string) => void }) {
  return (
    <MuiTabs value={active} onChange={(_, id: string) => onChange(id)} variant="scrollable" sx={{ borderBottom: 1, borderColor: 'divider' }}>
      {items.map((t) => (
        <MuiTab key={t.id} value={t.id} label={t.count === undefined ? t.label : `${t.label} (${t.count})`} />
      ))}
    </MuiTabs>
  );
}

export function AlertBanner({ tone = 'info', title, children }: { tone?: 'info' | 'danger' | 'warning'; title?: ReactNode; children?: ReactNode }) {
  return (
    <Alert severity={tone === 'danger' ? 'error' : tone} icon={<Icon name={tone === 'info' ? 'info' : 'alert'} />}>
      {title ? <AlertTitle>{title}</AlertTitle> : null}
      {children}
    </Alert>
  );
}

/** Tarjeta con encabezado opcional (título, subtítulo y acciones a la derecha). */
export function Card({
  id,
  title,
  subtitle,
  aside,
  actions,
  children,
  flush,
  className,
  style,
}: {
  id?: string;
  title?: ReactNode;
  /** Texto atenuado a continuación del título, en la misma línea. */
  aside?: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children?: ReactNode;
  /** Sin padding en el cuerpo (listas y tablas que llegan al borde). */
  flush?: boolean;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <Paper component="section" variant="outlined" id={id} className={cx('ap-card', className)} style={style}>
      {title || actions ? (
        <header className={cx('ap-card-head', flush && 'ap-card-head-line')}>
          <div style={{ minWidth: 0 }}>
            <Typography component="h2" className="ap-card-title">
              {title}
              {aside ? <span className="ap-card-aside"> · {aside}</span> : null}
            </Typography>
            {subtitle ? <div className="cl-hint">{subtitle}</div> : null}
          </div>
          {actions ? <div className="cl-row" style={{ gap: 'var(--space-2)', flexWrap: 'nowrap' }}>{actions}</div> : null}
        </header>
      ) : null}
      {flush ? children : <div className="ap-card-body">{children}</div>}
    </Paper>
  );
}

/** Superficie con borde del diseño, para contenido que no lleva encabezado de tarjeta. */
export function Panel({ id, className, style, children }: { id?: string; className?: string; style?: CSSProperties; children: ReactNode }) {
  return (
    <Paper component="section" variant="outlined" id={id} className={className} style={style}>
      {children}
    </Paper>
  );
}

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = 600,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: number;
}) {
  return (
    <Dialog open={open} onClose={onClose} maxWidth={false} slotProps={{ paper: { sx: { width } } }}>
      <DialogTitle>
        {title}
        <IconButton aria-label="Cerrar" onClick={onClose} size="small">
          <Icon name="x" />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>{children}</DialogContent>
      {footer ? <DialogActions>{footer}</DialogActions> : null}
    </Dialog>
  );
}

export interface AccionMenu {
  label: string;
  onClick: () => void;
  danger?: boolean;
}

/** Botón «…» con un menú de acciones para una fila. */
export function MenuAcciones({ acciones, label = 'Más acciones' }: { acciones: AccionMenu[]; label?: string }) {
  const [ancla, setAncla] = useState<HTMLElement | null>(null);
  if (acciones.length === 0) return <span />;
  return (
    <>
      <IconButton aria-label={label} aria-haspopup="menu" aria-expanded={!!ancla} size="small" onClick={(e) => setAncla(e.currentTarget)}>
        <Icon name="more" />
      </IconButton>
      <Menu anchorEl={ancla} open={!!ancla} onClose={() => setAncla(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }} transformOrigin={{ vertical: 'top', horizontal: 'right' }}>
        {acciones.map((a) => (
          <MenuItem
            key={a.label}
            sx={a.danger ? { color: 'error.main' } : undefined}
            onClick={() => {
              setAncla(null);
              a.onClick();
            }}
          >
            {a.label}
          </MenuItem>
        ))}
      </Menu>
    </>
  );
}

export function Vacio({ children }: { children: ReactNode }) {
  return (
    <Typography component="div" variant="body2" color="text.secondary" sx={{ px: 2, py: 1.5 }}>
      {children}
    </Typography>
  );
}

/** Par etiqueta / valor de solo lectura (datos personales, detalle de catálogo). */
export function Dato({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <Typography component="div" sx={{ fontSize: 12, lineHeight: '16px', fontWeight: 600, color: 'text.secondary', mb: '6px' }}>
        {label}
      </Typography>
      <div>{children || <span className="cl-muted">—</span>}</div>
    </div>
  );
}
