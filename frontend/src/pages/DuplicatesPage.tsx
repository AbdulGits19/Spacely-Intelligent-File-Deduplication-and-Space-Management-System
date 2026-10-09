import React, { useEffect, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  Paper,
  Snackbar,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  AutoDeleteRounded,
  CheckCircleOutlineRounded,
  LockOpenRounded,
  LockRounded,
  VerifiedUserRounded,
} from '@mui/icons-material';
import { duplicatesApi, filesApi } from '../api/apiClient';
import { DuplicateGroup, SafeDeletePreviewResponse } from '../types';
import { formatBytes, formatDate } from '../utils/formatters';

export const DuplicatesPage: React.FC = () => {
  const [groups, setGroups] = useState<DuplicateGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  const [previewData, setPreviewData] = useState<SafeDeletePreviewResponse | null>(null);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [reason, setReason] = useState('Redundant duplicate cleanup');
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await duplicatesApi.getGroups();
      setGroups(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGroups();
  }, []);

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAllDuplicates = () => {
    const allDupIds: number[] = [];
    groups.forEach((g) => {
      g.duplicate_files.forEach((df) => {
        if (!df.is_protected) allDupIds.push(df.id);
      });
    });
    setSelectedIds(allDupIds);
  };

  const handleOpenPreview = async () => {
    if (selectedIds.length === 0) return;
    try {
      const preview = await duplicatesApi.previewDelete(selectedIds, reason);
      setPreviewData(preview);
      setPreviewOpen(true);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.detail || 'Preview failed', type: 'error' });
    }
  };

  const handleConfirmSafeDelete = async () => {
    setDeleting(true);
    try {
      const res = await duplicatesApi.executeSafeDelete(selectedIds, reason);
      setToast({
        msg: `Deleted ${res.deleted_count} duplicate(s) & reclaimed ${formatBytes(res.reclaimed_bytes)}!`,
        type: 'success',
      });
      setPreviewOpen(false);
      setSelectedIds([]);
      fetchGroups();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.detail || 'Safe delete failed', type: 'error' });
    } finally {
      setDeleting(false);
    }
  };

  const handleToggleProtect = async (fileId: number) => {
    await filesApi.toggleProtect(fileId);
    fetchGroups();
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper sx={{ p: 3, display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 2 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Identical Content Clusters ({groups.length})
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Original files are preserved automatically. Select redundant copies to preview impact and reclaim space.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button variant="outlined" onClick={selectAllDuplicates} disabled={groups.length === 0}>
            Select All Unprotected Duplicates
          </Button>
          <Button
            variant="contained"
            startIcon={<AutoDeleteRounded />}
            disabled={selectedIds.length === 0}
            onClick={handleOpenPreview}
          >
            Preview Safe Delete ({selectedIds.length})
          </Button>
        </Box>
      </Paper>

      {groups.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: 'center' }}>
          <CheckCircleOutlineRounded sx={{ fontSize: 56, color: 'success.main', mb: 1 }} />
          <Typography variant="h6">Zero Duplicate Waste Detected!</Typography>
          <Typography variant="body2" color="text.secondary">
            Your storage vault is 100% deduplicated and optimized.
          </Typography>
        </Paper>
      ) : (
        groups.map((group) => (
          <Paper key={group.id} sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 1 }}>
              <Box>
                <Typography variant="caption" color="primary" sx={{ fontWeight: 700 }}>
                  SHARED SHA-256 SIGNATURE
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: '"JetBrains Mono", monospace', wordBreak: 'break-all' }}>
                  {group.sha256_hash}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip label={`${group.total_files} Identical Copies`} size="small" />
                <Chip label={`Each: ${formatBytes(group.file_size_bytes)}`} size="small" variant="outlined" />
                <Chip
                  label={`Reclaimable Waste: ${formatBytes(group.wasted_bytes)}`}
                  color="error"
                  size="small"
                />
              </Box>
            </Box>

            <Divider sx={{ my: 2 }} />

            {group.original_file && (
              <Box
                sx={{
                  p: 2,
                  mb: 2,
                  borderRadius: 3,
                  bgcolor: 'rgba(45, 106, 79, 0.12)',
                  border: '1px solid rgba(82, 183, 136, 0.35)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <VerifiedUserRounded color="success" />
                  <Box>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {group.original_file.filename}{' '}
                      <Chip label="Original Reference (Kept Safe)" size="small" color="success" sx={{ ml: 1 }} />
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Uploaded {formatDate(group.original_file.uploaded_at)}
                    </Typography>
                  </Box>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {formatBytes(group.original_file.size_bytes)}
                </Typography>
              </Box>
            )}

            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, mb: 1, display: 'block' }}>
              REDUNDANT DUPLICATE COPIES ({group.duplicate_files.length})
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {group.duplicate_files.map((dup) => (
                <Box
                  key={dup.id}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid',
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Checkbox
                      checked={selectedIds.includes(dup.id)}
                      onChange={() => toggleSelect(dup.id)}
                      color="primary"
                    />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {dup.filename}
                        {dup.is_protected && (
                          <Chip label="Protected Lock" size="small" color="secondary" sx={{ ml: 1 }} />
                        )}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Uploaded {formatDate(dup.uploaded_at)} • {formatBytes(dup.size_bytes)}
                      </Typography>
                    </Box>
                  </Box>

                  <Tooltip title={dup.is_protected ? 'Unlock Protection' : 'Protect File'}>
                    <IconButton size="small" onClick={() => handleToggleProtect(dup.id)}>
                      {dup.is_protected ? <LockRounded color="secondary" /> : <LockOpenRounded />}
                    </IconButton>
                  </Tooltip>
                </Box>
              ))}
            </Box>
          </Paper>
        ))
      )}

      <Dialog open={previewOpen} onClose={() => setPreviewOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Safe Deletion Impact Preview</DialogTitle>
        <Divider />
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {previewData && (
            <>
              <Alert severity="info" sx={{ borderRadius: 2 }}>
                You are about to permanently remove{' '}
                <strong>{previewData.deletable_files.length} duplicate file(s)</strong> and reclaim{' '}
                <strong>{formatBytes(previewData.total_reclaimable_bytes)}</strong> of storage.
              </Alert>

              {previewData.protected_or_skipped_ids.length > 0 && (
                <Alert severity="warning" sx={{ borderRadius: 2 }}>
                  {previewData.protected_or_skipped_ids.length} selected file(s) are currently{' '}
                  <strong>Protected</strong> and will be safely skipped!
                </Alert>
              )}

              <TextField
                label="Audit Trail Reason"
                fullWidth
                size="small"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setPreviewOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            color="primary"
            disabled={deleting || !previewData || previewData.deletable_files.length === 0}
            onClick={handleConfirmSafeDelete}
          >
            {deleting ? 'Reclaiming Space...' : 'Confirm & Reclaim Space'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.type || 'info'} onClose={() => setToast(null)}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};