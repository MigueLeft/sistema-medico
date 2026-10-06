import type { ReactNode } from 'react';
import { List, ListItem, ListItemButton, ThemeProvider, Typography } from '@mui/material';
import { useRouter, useRouterState } from '@tanstack/react-router';
import { BotonIcono, Icon, type NombreIcono } from '@/components/ui';
import { useLogout, useSesionActual } from '@/features/auth';
import { useContadoresNav } from '@/features/dashboard';
import { temaClinica } from '@/theme/clinica';

interface ItemNav {
  to: string;
  label: string;
  icon: NombreIcono;
  /** Activo solo en la ruta exacta (por defecto, también en sus subrutas). */
  exacto?: boolean;
  contador?: number;
}

const CATALOGOS: ItemNav[] = [
  { to: '/catalogos/enfermedades', label: 'Enfermedades', icon: 'book' },
  { to: '/catalogos/paraclinicos', label: 'Paraclínicos', icon: 'flask' },
  { to: '/catalogos/procedimientos', label: 'Procedimientos y cirugías', icon: 'scissors' },
  { to: '/catalogos/hospitalizaciones', label: 'Hospitalizaciones', icon: 'bed' },
  { to: '/catalogos/sistemas', label: 'Aparatos y sistemas', icon: 'body' },
  { to: '/catalogos/medicamentos', label: 'Medicamentos', icon: 'pill' },
];

function EnlaceNav({ item, pathname }: { item: ItemNav; pathname: string }) {
  const router = useRouter();
  const activo = item.exacto ? pathname === item.to : pathname === item.to || pathname.startsWith(`${item.to}/`);
  return (
    <ListItem disablePadding>
      <ListItemButton
        component="a"
        href={item.to}
        selected={activo}
        aria-current={activo ? 'page' : undefined}
        // Navegación del router (sin recargar); el `href` conserva la semántica de enlace.
        onClick={(e) => {
          e.preventDefault();
          router.history.push(item.to);
        }}
        sx={{ gap: 1.5, minHeight: 36, py: '6px', px: 1.5, fontWeight: 500, lineHeight: '18px', color: 'text.primary', '&.Mui-selected': { fontWeight: 700 }, '& svg': { width: 18, height: 18, flex: 'none' } }}
      >
        <Icon name={item.icon} />
        {item.label}
        {item.contador ? <span className="cl-nav-count">{item.contador}</span> : null}
      </ListItemButton>
    </ListItem>
  );
}

/** Armazón de las pantallas internas: barra lateral fija + área principal, con el tema «Clínica» de Material UI. */
export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { data: sesion } = useSesionActual();
  const { data: contadores } = useContadoresNav();
  const logout = useLogout();

  const principal: ItemNav[] = [
    { to: '/', label: 'Inicio', icon: 'home', exacto: true },
    { to: '/pacientes', label: 'Pacientes', icon: 'users' },
    { to: '/citas', label: 'Citas', icon: 'calendar', contador: contadores?.citasHoy },
    { to: '/consultas', label: 'Consultas', icon: 'stethoscope', contador: contadores?.consultasSinCerrar },
  ];

  return (
    <ThemeProvider theme={temaClinica}>
      <div className="cl-app">
        <div className="cl-shell">
          <nav className="cl-side" aria-label="Principal">
            <div className="cl-brand">
              <span className="cl-brand-mark" />
              Clínica
            </div>
            <List disablePadding sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {principal.map((item) => (
                <EnlaceNav key={item.to} item={item} pathname={pathname} />
              ))}
            </List>
            <div className="cl-nav-title">Catálogos</div>
            <List disablePadding aria-label="Catálogos" sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
              {CATALOGOS.map((item) => (
                <EnlaceNav key={item.to} item={item} pathname={pathname} />
              ))}
            </List>
            <List disablePadding sx={{ marginTop: 'auto' }}>
              <EnlaceNav item={{ to: '/configuracion', label: 'Configuración', icon: 'sliders' }} pathname={pathname} />
            </List>
            <div className="cl-side-foot" style={{ marginTop: 0 }}>
              <span>{sesion?.nombreCompleto ?? 'Sesión activa'}</span>
              <BotonIcono icon="logout" label="Cerrar sesión" onClick={() => logout.mutate()} />
            </div>
          </nav>
          <div className="cl-main">{children}</div>
        </div>
      </div>
    </ThemeProvider>
  );
}

/** Barra de título + contenido con scroll de una pantalla interna. */
export function Page({ title, actions, children }: { title: string; actions?: ReactNode; children: ReactNode }) {
  return (
    <>
      <header className="cl-titlebar">
        <Typography component="h1">{title}</Typography>
        {actions}
      </header>
      <main className="cl-content">
        <div className="ap-page">{children}</div>
      </main>
    </>
  );
}

export function Cargando({ texto = 'Cargando…' }: { texto?: string }) {
  return (
    <Typography component="div" color="text.secondary" className="ap-cargando" role="status">
      {texto}
    </Typography>
  );
}
