import { useEffect } from 'react';
import { createRootRoute, Outlet, useNavigate, useRouterState } from '@tanstack/react-router';
import { Box, CircularProgress } from '@mui/material';
import { Toaster } from 'sonner';
import { AppShell } from '@/components/AppShell';
import { useHaySistemaConfigurado, useSesionActual } from '@/features/auth';

export const Route = createRootRoute({
  component: RootComponent,
});

function FullPageSpinner() {
  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
      }}
    >
      <CircularProgress />
    </Box>
  );
}

function RootComponent() {
  const { data: haySistema, isLoading: cargandoHaySistema } = useHaySistemaConfigurado();
  const { data: sesion, isLoading: cargandoSesion } = useSesionActual();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const cargando = cargandoHaySistema || (haySistema === true && cargandoSesion);

  useEffect(() => {
    if (cargando || haySistema === undefined) return;

    if (sesion) {
      if (pathname === '/login' || pathname === '/setup') {
        navigate({ to: '/', replace: true });
      }
      return;
    }

    if (!haySistema && pathname !== '/setup') {
      navigate({ to: '/setup', replace: true });
    } else if (haySistema && pathname !== '/login') {
      navigate({ to: '/login', replace: true });
    }
  }, [cargando, haySistema, sesion, pathname, navigate]);

  if (cargando) {
    return <FullPageSpinner />;
  }

  const isAuthRoute = pathname === '/login' || pathname === '/setup';

  return (
    <>
      <Toaster richColors position="top-right" />
      {isAuthRoute || !sesion ? (
        <Box
          sx={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            p: 2,
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 440,
              p: 4,
              bgcolor: 'background.paper',
              borderRadius: 3,
              border: '1px solid',
              borderColor: 'divider',
            }}
          >
            <Outlet />
          </Box>
        </Box>
      ) : (
        <AppShell>
          <Outlet />
        </AppShell>
      )}
    </>
  );
}
