import React, { useEffect, useState } from 'react';
import {
  Avatar,
  Box,
  Button,
  Chip,
  Divider,
  Grid,
  Paper,
  Switch,
  Typography,
} from '@mui/material';
import {
  CheckCircleRounded,
  DarkModeRounded,
  LightModeRounded,
  MemoryRounded,
  SecurityRounded,
} from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';
import { analyticsApi } from '../api/apiClient';
import { formatDate } from '../utils/formatters';

export const SettingsPage: React.FC = () => {
  const { user, logout } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const [healthStatus, setHealthStatus] = useState<string>('Checking...');

  useEffect(() => {
    analyticsApi
      .checkHealth()
      .then((res) => setHealthStatus(res.status === 'healthy' ? 'Online & Healthy' : 'Degraded'))
      .catch(() => setHealthStatus('Unreachable'));
  }, []);

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3.5, height: '100%' }}>
          <Typography variant="h6" sx={{ mb: 2.5, fontWeight: 700 }}>
            Organization Profile
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, mb: 3 }}>
            <Avatar
              sx={{
                width: 64,
                height: 64,
                bgcolor: 'primary.main',
                color: '#F0FFF0',
                fontSize: '1.6rem',
                fontWeight: 800,
              }}
            >
              {user?.full_name?.charAt(0).toUpperCase() || 'P'}
            </Avatar>
            <Box>
              <Typography variant="h6" sx={{ fontWeight: 700 }}>
                {user?.full_name}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {user?.email}
              </Typography>
              <Chip label="Active JWT Session" color="success" size="small" sx={{ mt: 1 }} />
            </Box>
          </Box>
          <Divider sx={{ my: 2 }} />
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Account Provisioned: <strong>{user ? formatDate(user.created_at) : '—'}</strong>
          </Typography>
          <Button variant="outlined" color="error" onClick={logout}>
            Sign Out of Workspace
          </Button>
        </Paper>
      </Grid>

      <Grid item xs={12} md={6}>
        <Paper sx={{ p: 3.5, height: '100%', display: 'flex', flexDirection: 'column', gap: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Aesthetic & Engine Configuration
          </Typography>

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              {mode === 'dark' ? <DarkModeRounded color="primary" /> : <LightModeRounded color="primary" />}
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Mulberry / Hint of Green Palette
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Current Mode: {mode === 'dark' ? 'Velvet Mulberry Dark (#0D1310)' : 'Hint of Green Light (#F0FFF0)'}
                </Typography>
              </Box>
            </Box>
            <Switch checked={mode === 'dark'} onChange={toggleTheme} color="primary" />
          </Box>

          <Divider />

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <MemoryRounded color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  Chunked SHA-256 Stream Buffer
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  64 KB (65,536 bytes) zero-RAM-spike binary streaming
                </Typography>
              </Box>
            </Box>
            <Chip label="64 KB" size="small" />
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <SecurityRounded color="primary" />
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                  FastAPI + Celery + MySQL 8.0 Status
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Live Health Endpoint Check (/health)
                </Typography>
              </Box>
            </Box>
            <Chip
              icon={<CheckCircleRounded />}
              label={healthStatus}
              color={healthStatus.includes('Healthy') ? 'success' : 'warning'}
              size="small"
            />
          </Box>
        </Paper>
      </Grid>
    </Grid>
  );
};