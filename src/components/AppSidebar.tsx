import type { ReactNode } from 'react';
import {
  Avatar,
  Box,
  Divider,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CalendarMonthOutlined,
  DescriptionOutlined,
  HomeOutlined,
  LibraryBooksOutlined,
  LocalHospitalOutlined,
  LogoutOutlined,
  PersonOutlined,
} from '@mui/icons-material';
import { Link, useRouterState } from '@tanstack/react-router';
import { useLogout, useSesionActual } from '@/features/auth';

interface NavItem {
  label: string;
  icon: ReactNode;
  to: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Inicio', icon: <HomeOutlined fontSize="small" />, to: '/' },
  { label: 'Pacientes', icon: <PersonOutlined fontSize="small" />, to: '/pacientes' },
  { label: 'Citas', icon: <CalendarMonthOutlined fontSize="small" />, to: '/citas' },
  { label: 'Catálogos', icon: <LibraryBooksOutlined fontSize="small" />, to: '/catalogos' },
  { label: 'Entregables', icon: <DescriptionOutlined fontSize="small" />, to: '/entregables' },
];

function NavButton({ item, isActive }: { item: NavItem; isActive: boolean }) {
  return (
    <ListItemButton
      component={Link}
      to={item.to}
      sx={{
        borderRadius: 2,
        mb: 0.5,
        py: 1.1,
        color: '#e0fbfc',
        opacity: isActive ? 1 : 0.7,
        bgcolor: isActive ? 'rgba(224,251,252,0.14)' : 'transparent',
        '&:hover': { bgcolor: 'rgba(224,251,252,0.08)', opacity: 1 },
      }}
    >
      <ListItemIcon sx={{ minWidth: 36, color: 'inherit' }}>{item.icon}</ListItemIcon>
      <ListItemText
        primary={item.label}
        slotProps={{ primary: { sx: { fontSize: '0.9rem', fontFamily: 'Sarabun, sans-serif' } } }}
      />
    </ListItemButton>
  );
}

export function SidebarContent() {
  const { data: session } = useSesionActual();
  const logout = useLogout();
  const { location } = useRouterState();

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Box
          sx={{
            bgcolor: 'rgba(224,251,252,0.14)',
            borderRadius: 1.5,
            p: 0.75,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LocalHospitalOutlined sx={{ color: '#e0fbfc', fontSize: 22 }} />
        </Box>
        <Typography
          sx={{
            color: '#e0fbfc',
            fontFamily: 'Montserrat, sans-serif',
            fontWeight: 700,
            fontSize: '0.9rem',
            lineHeight: 1.3,
          }}
        >
          Sistema Médico
        </Typography>
      </Box>

      <List sx={{ px: 1.5, mt: 1, flex: 1 }} disablePadding>
        {NAV_ITEMS.map((item) => (
          <NavButton
            key={item.label}
            item={item}
            isActive={item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to)}
          />
        ))}
      </List>

      <Divider sx={{ mx: 2, borderColor: 'rgba(224,251,252,0.14)' }} />

      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar sx={{ width: 34, height: 34, bgcolor: 'secondary.light', fontSize: '0.875rem' }}>
          {(session?.nombreCompleto ?? 'M').charAt(0).toUpperCase()}
        </Avatar>
        <Typography
          sx={{
            color: '#e0fbfc',
            fontSize: '0.875rem',
            fontWeight: 600,
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {session?.nombreCompleto ?? '—'}
        </Typography>
        <Tooltip title="Cerrar sesión">
          <span>
            <IconButton
              size="small"
              onClick={() => logout.mutate()}
              disabled={logout.isPending}
              sx={{ color: 'rgba(224,251,252,0.7)', '&:hover': { color: '#e0fbfc', bgcolor: 'rgba(224,251,252,0.1)' } }}
            >
              <LogoutOutlined fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>
    </Box>
  );
}

export function AppSidebar() {
  return (
    <Box sx={{ width: 230, flexShrink: 0, bgcolor: 'primary.main', minHeight: '100vh' }}>
      <SidebarContent />
    </Box>
  );
}
