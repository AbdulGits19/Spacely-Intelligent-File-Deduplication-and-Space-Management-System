import React from 'react';
import { useLocation, useNavigate, Outlet } from 'react-router-dom';
import {
  AppBar,
  Avatar,
  Box,
  Chip,
  Divider,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  DashboardRounded,
  FolderCopyRounded,
  FilterNoneRounded,
  HistoryRounded,
  SettingsRounded,
  DarkModeRounded,
  LightModeRounded,
  LogoutRounded,
  AutoAwesomeRounded,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';

const DRAWER_WIDTH = 270;

export const MainLayout: React.FC = () => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Storage Analytics', path: '/dashboard', icon: <DashboardRounded /> },
    { label: 'File Explorer & Upload', path: '/files', icon: <FolderCopyRounded /> },
    { label: 'Duplicate Clusters', path: '/duplicates', icon: <FilterNoneRounded /> },
    { label: 'Deletion History', path: '/history', icon: <HistoryRounded /> },
    { label: 'Profile & Settings', path: '/settings', icon: <SettingsRounded /> },
  ];

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            borderRadius: 0,
            borderTop: 'none',
            borderBottom: 'none',
            borderLeft: 'none',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            p: 2.5,
          },
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 4, px: 1 }}>
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 3,
                background: 'linear-gradient(135deg, #C54B8C 0%, #89295D 100%)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#F0FFF0',
                boxShadow: '0 6px 16px rgba(197, 75, 140, 0.4)',
              }}
            >
              <AutoAwesomeRounded />
            </Box>
            <Box>
              <Typography variant="h6" sx={{ lineHeight: 1.1, fontWeight: 800, letterSpacing: '0.03em' }}>
                Spacely
              </Typography>
              <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, letterSpacing: '0.12em' }}>
                DEDUP VAULT
              </Typography>
            </Box>
          </Box>

          <List sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
            {navItems.map((item) => {
              const active = location.pathname === item.path;
              return (
                <ListItemButton
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  sx={{
                    borderRadius: 3,
                    py: 1.3,
                    px: 2,
                    backgroundColor: active ? 'rgba(197, 75, 140, 0.16)' : 'transparent',
                    color: active ? 'primary.main' : 'text.secondary',
                    border: active ? '1px solid rgba(197, 75, 140, 0.35)' : '1px solid transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(197, 75, 140, 0.1)',
                    },
                  }}
                >
                  <ListItemIcon sx={{ color: active ? 'primary.main' : 'text.secondary', minWidth: 38 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.label}
                    primaryTypographyProps={{
                      fontWeight: active ? 700 : 500,
                      fontSize: '0.93rem',
                    }}
                  />
                </ListItemButton>
              );
            })}
          </List>
        </Box>

        <Box>
          <Divider sx={{ my: 2 }} />
          <Box
            sx={{
              p: 1.8,
              borderRadius: 3,
              backgroundColor: mode === 'dark' ? 'rgba(240, 255, 240, 0.03)' : 'rgba(197, 75, 140, 0.06)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, overflow: 'hidden' }}>
              <Avatar
                sx={{
                  bgcolor: 'primary.main',
                  color: '#F0FFF0',
                  width: 36,
                  height: 36,
                  fontWeight: 700,
                  fontSize: '0.95rem',
                }}
              >
                {user?.full_name?.charAt(0).toUpperCase() || 'P'}
              </Avatar>
              <Box sx={{ overflow: 'hidden' }}>
                <Typography variant="subtitle2" noWrap sx={{ fontWeight: 700 }}>
                  {user?.full_name}
                </Typography>
                <Typography variant="caption" color="text.secondary" noWrap sx={{ display: 'block' }}>
                  {user?.email}
                </Typography>
              </Box>
            </Box>
            <Tooltip title="Sign Out">
              <IconButton size="small" color="error" onClick={logout}>
                <LogoutRounded fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Drawer>

      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            backgroundColor: mode === 'dark' ? 'rgba(13, 19, 16, 0.85)' : 'rgba(240, 255, 240, 0.85)',
            backdropFilter: 'blur(12px)',
            color: 'text.primary',
            borderRadius: 0,
            borderTop: 'none',
            borderLeft: 'none',
            borderRight: 'none',
          }}
        >
          <Toolbar sx={{ justifyContent: 'space-between', px: 4 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {navItems.find((i) => i.path === location.pathname)?.label || 'Pristine Workspace'}
              </Typography>
              <Chip
                label="SHA-256 Chunked Engine"
                size="small"
                sx={{
                  backgroundColor: 'rgba(197, 75, 140, 0.14)',
                  color: 'primary.main',
                  fontFamily: '"JetBrains Mono", monospace',
                  fontSize: '0.72rem',
                }}
              />
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Tooltip title={`Switch to ${mode === 'dark' ? 'Botanical Light' : 'Mulberry Dark'} Mode`}>
                <IconButton
                  onClick={toggleTheme}
                  sx={{
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: 2.5,
                    p: 1,
                  }}
                >
                  {mode === 'dark' ? (
                    <LightModeRounded sx={{ color: '#F0FFF0' }} />
                  ) : (
                    <DarkModeRounded sx={{ color: '#C54B8C' }} />
                  )}
                </IconButton>
              </Tooltip>
            </Box>
          </Toolbar>
        </AppBar>

        <Box component="main" sx={{ flexGrow: 1, p: 4, maxWidth: 1440, width: '100%', mx: 'auto' }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};