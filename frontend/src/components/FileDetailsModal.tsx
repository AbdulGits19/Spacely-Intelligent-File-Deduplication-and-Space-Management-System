import React from 'react';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Grid,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { ContentCopyRounded, ShieldRounded, VerifiedRounded } from '@mui/icons-material';
import { FileRecord } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

interface Props {
  file: FileRecord | null;
  open: boolean;
  onClose: () => void;
}

export const FileDetailsModal: React.FC<Props> = ({ file, open, onClose }) => {
  if (!file) return null;

  const copyHash = () => {
    if (file.sha256_hash) {
      navigator.clipboard.writeText(file.sha256_hash);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Cryptographic & File Metadata
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          {file.is_protected && (
            <Chip icon={<ShieldRounded />} label="Protected" color="secondary" size="small" />
          )}
          <Chip
            label={file.is_duplicate ? 'Duplicate Copy' : 'Original / Unique'}
            color={file.is_duplicate ? 'warning' : 'success'}
            size="small"
          />
        </Box>
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        <Box>
          <Typography variant="caption" color="text.secondary">
            FILENAME
          </Typography>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, wordBreak: 'break-all' }}>
            {file.filename}
          </Typography>
        </Box>

        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              EXACT SIZE
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {formatBytes(file.size_bytes)} ({file.size_bytes.toLocaleString()} bytes)
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              MIME TYPE / EXTENSION
            </Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>
              {file.file_type} (.{file.extension})
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              UPLOADED AT
            </Typography>
            <Typography variant="body2">{formatDate(file.uploaded_at)}</Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              HASHING LATENCY
            </Typography>
            <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
              {file.metadata_info?.processing_time_ms != null
                ? `${file.metadata_info.processing_time_ms} ms (64KB stream)`
                : 'Async Queued'}
            </Typography>
          </Grid>
        </Grid>

        <Box
          sx={{
            p: 2,
            borderRadius: 3,
            bgcolor: 'rgba(197, 75, 140, 0.08)',
            border: '1px solid rgba(197, 75, 140, 0.25)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
            <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <VerifiedRounded fontSize="inherit" /> SHA-256 CONTENT SIGNATURE
            </Typography>
            {file.sha256_hash && (
              <Tooltip title="Copy full 64-char SHA-256">
                <IconButton size="small" onClick={copyHash}>
                  <ContentCopyRounded fontSize="inherit" />
                </IconButton>
              </Tooltip>
            )}
          </Box>
          <Typography
            variant="body2"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              wordBreak: 'break-all',
              fontSize: '0.8rem',
            }}
          >
            {file.sha256_hash || 'Computing in background Celery worker...'}
          </Typography>
        </Box>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button onClick={onClose} variant="contained">
          Close Inspector
        </Button>
      </DialogActions>
    </Dialog>
  );
};