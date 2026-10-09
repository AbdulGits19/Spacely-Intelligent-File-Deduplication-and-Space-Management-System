import React, { useState } from 'react';
import { Link as RouterLink, useNavigate } from 'react-router-dom';
import {
  Alert,
  Box,
  Button,
  IconButton,
  Link,
  Paper,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { AutoAwesomeRounded, DarkModeRounded, LightModeRounded } from '@mui/icons-material';
import { useAuth } from '../context/AuthContext';
import { useThemeMode } from '../context/ThemeContext';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const { mode, toggleTheme } = useThemeMode();
  const navigate = useNavigate();

  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await register(email, fullName, password);
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Registration failed. Please check your details.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        p: 3,
        position: 'relative',
        background:
          mode === 'dark'
            ? 'radial-gradient(circle at 80% 20%, rgba(197, 75, 140, 0.18), transparent 45%), #0D1310'
            : 'radial-gradient(circle at 20% 20%, rgba(197, 75, 140, 0.15), transparent 45%), #F0FFF0',
      }}
    >
      <Box sx={{ position: 'absolute', top: 24, right: 24 }}>
        <Tooltip title="Toggle Theme">
          <IconButton onClick={toggleTheme} sx={{ border: '1px solid', borderColor: 'divider' }}>
            {mode === 'dark' ? <LightModeRounded /> : <DarkModeRounded sx={{ color: '#C54B8C' }} />}
          </IconButton>
        </Tooltip>
      </Box>

      <Paper sx={{ maxWidth: 440, width: '100%', p: 4.5, borderRadius: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 3 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: 3,
              background: 'linear-gradient(135deg, #C54B8C 0%, #89295D 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#F0FFF0',
            }}
          >
            <AutoAwesomeRounded />
          </Box>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800, lineHeight: 1.1 }}>
              Spacely Core
            </Typography>
            <Typography variant="caption" color="primary" sx={{ fontWeight: 700, letterSpacing: '0.1em' }}>
              WORKSPACE REGISTRATION
            </Typography>
          </Box>
        </Box>

        <Typography variant="h5" sx={{ mb: 0.5, fontWeight: 700 }}>
          Initialize Your Vault
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
          Create an isolated workspace for automated SHA-256 file deduplication.
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
            {error}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2.2 }}>
          <TextField
            label="Full Name / Organization"
            required
            fullWidth
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Neon Corp Admin"
          />
          <TextField
            label="Work Email"
            type="email"
            required
            fullWidth
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="architect@neoncorp.io"
          />
          <TextField
            label="Password"
            type="password"
            required
            fullWidth
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" variant="contained" size="large" disabled={submitting} sx={{ mt: 1, py: 1.4 }}>
            {submitting ? 'Creating Workspace...' : 'Create Account'}
          </Button>
        </Box>

        <Typography variant="body2" align="center" sx={{ mt: 3, color: 'text.secondary' }}>
          Already registered?{' '}
          <Link component={RouterLink} to="/login" sx={{ fontWeight: 700, color: 'primary.main' }}>
            Sign In
          </Link>
        </Typography>
      </Paper>
    </Box>
  );
};