import { type ReactNode, useState } from 'react';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  Toolbar,
  Typography,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { LocalHospitalOutlined, MenuOutlined } from '@mui/icons-material';
import { AppSidebar, SidebarContent } from './AppSidebar';

interface AppLayoutProps {
  children: ReactNode;
}

const DRAWER_WIDTH = 230;

export function AppLayout({ children }: AppLayoutProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {!isMobile && <AppSidebar />}

      {isMobile && (
        <AppBar position="fixed" elevation={0} sx={{ bgcolor: 'primary.main' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 1 }}>
              <MenuOutlined />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <LocalHospitalOutlined sx={{ fontSize: 20 }} />
              <Typography sx={{ fontFamily: 'Montserrat, sans-serif', fontWeight: 700, fontSize: '0.9rem' }}>
                Sistema Médico
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>
      )}

      {isMobile && (
        <Drawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{ '& .MuiDrawer-paper': { width: DRAWER_WIDTH, bgcolor: 'primary.main' } }}
        >
          <Box onClick={() => setDrawerOpen(false)}>
            <SidebarContent />
          </Box>
        </Drawer>
      )}

      <Box
        component="main"
        sx={{
          flex: 1,
          overflow: 'auto',
          display: 'flex',
          flexDirection: 'column',
          mt: isMobile ? '64px' : 0,
        }}
      >
        {children}
      </Box>
    </Box>
  );
}
