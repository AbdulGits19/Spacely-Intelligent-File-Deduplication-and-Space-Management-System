import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  FormControl,
  Grid,
  IconButton,
  InputLabel,
  LinearProgress,
  MenuItem,
  Pagination,
  Paper,
  Select,
  Snackbar,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  CloudUploadRounded,
  DeleteOutlineRounded,
  DownloadRounded,
  InfoOutlined,
  LockOpenRounded,
  LockRounded,
  RefreshRounded,
  SearchRounded,
} from '@mui/icons-material';
import { filesApi } from '../api/apiClient';
import { FileRecord } from '../types';
import { formatBytes, formatDate, shortHash } from '../utils/formatters';
import { FileDetailsModal } from '../components/FileDetailsModal';

export const FilesPage: React.FC = () => {
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [files, setFiles] = useState<FileRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [fileType, setFileType] = useState('');
  const [dupFilter, setDupFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'uploaded_at' | 'size_bytes' | 'filename'>('uploaded_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<FileRecord | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const fetchFiles = async () => {
    setLoading(true);
    try {
      const isDupParam =
        dupFilter === 'duplicates' ? true : dupFilter === 'unique' ? false : undefined;

      const res = await filesApi.listFiles({
        search: search || undefined,
        file_type: fileType || undefined,
        is_duplicate: isDupParam,
        sort_by: sortBy,
        sort_order: sortOrder,
        page,
        size: 12,
      });
      setFiles(res.items);
      setTotal(res.total);
      setPages(res.pages);
    } catch (err: any) {
      setToast({ msg: err.response?.data?.detail || 'Failed to load files', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFiles();
  }, [page, dupFilter, sortBy, sortOrder]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchFiles();
  };

  const handleFileUpload = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    setUploadProgress(0);

    const totalFiles = fileList.length;
    let successCount = 0;

    try {
      for (let i = 0; i < totalFiles; i++) {
        await filesApi.uploadSingleFile(fileList[i]);
        successCount++;
        setUploadProgress(Math.round(((i + 1) / totalFiles) * 100));
      }
      setToast({
        msg: `Uploaded ${successCount} file(s)! SHA-256 deduplication complete.`,
        type: 'success',
      });
      fetchFiles();
    } catch (err: any) {
      setToast({
        msg: err.response?.data?.detail || 'Error uploading file(s)',
        type: 'error',
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleToggleProtect = async (file: FileRecord) => {
    try {
      const updated = await filesApi.toggleProtect(file.id);
      setFiles((prev) => prev.map((f) => (f.id === file.id ? updated : f)));
      setToast({
        msg: `${updated.filename} is now ${updated.is_protected ? 'Protected' : 'Unprotected'}.`,
        type: 'success',
      });
    } catch (err: any) {
      setToast({ msg: err.response?.data?.detail || 'Action failed', type: 'error' });
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (file.is_protected) {
      setToast({ msg: 'Cannot delete a protected file. Unlock it first.', type: 'error' });
      return;
    }
    try {
      const res = await filesApi.deleteFile(file.id);
      setToast({
        msg: `${res.message} (${formatBytes(res.reclaimed_bytes)} reclaimed)`,
        type: 'success',
      });
      fetchFiles();
    } catch (err: any) {
      setToast({ msg: err.response?.data?.detail || 'Delete failed', type: 'error' });
    }
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper
        sx={{
          p: 4,
          border: '2px dashed rgba(197, 75, 140, 0.45)',
          textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(197, 75, 140, 0.08) 0%, rgba(240, 255, 240, 0.02) 100%)',
          cursor: 'pointer',
          transition: 'all 0.2s',
          '&:hover': {
            borderColor: 'primary.main',
            background: 'rgba(197, 75, 140, 0.12)',
          },
        }}
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          handleFileUpload(e.dataTransfer.files);
        }}
      >
        <input
          type="file"
          multiple
          hidden
          ref={fileInputRef}
          onChange={(e) => handleFileUpload(e.target.files)}
        />
        <CloudUploadRounded sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6" sx={{ fontWeight: 700 }}>
          Drag & Drop files here, or click to browse computer
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Streams in 64 KB chunks • Identical content is automatically grouped regardless of filename
        </Typography>
        {uploading && (
          <Box sx={{ maxWidth: 400, mx: 'auto', mt: 2 }}>
            <LinearProgress variant="determinate" value={uploadProgress} color="primary" />
            <Typography variant="caption" sx={{ mt: 0.5, display: 'block' }}>
              Uploading & Hashing... {uploadProgress}%
            </Typography>
          </Box>
        )}
      </Paper>

      <Paper sx={{ p: 2.5 }}>
        <Box component="form" onSubmit={handleSearchSubmit}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={4}>
              <TextField
                size="small"
                fullWidth
                label="Search Filename"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="e.g., report, copy1.txt..."
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <TextField
                size="small"
                fullWidth
                label="Extension / Type"
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                placeholder="txt, json, pdf"
              />
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Duplicate Filter</InputLabel>
                <Select
                  label="Duplicate Filter"
                  value={dupFilter}
                  onChange={(e) => {
                    setDupFilter(e.target.value);
                    setPage(1);
                  }}
                >
                  <MenuItem value="all">All Files ({total})</MenuItem>
                  <MenuItem value="duplicates">Duplicates Only</MenuItem>
                  <MenuItem value="unique">Unique / Originals</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2}>
              <FormControl size="small" fullWidth>
                <InputLabel>Sort By</InputLabel>
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <MenuItem value="uploaded_at">Upload Date</MenuItem>
                  <MenuItem value="size_bytes">File Size</MenuItem>
                  <MenuItem value="filename">Filename</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} md={2} sx={{ display: 'flex', gap: 1 }}>
              <Button type="submit" variant="contained" startIcon={<SearchRounded />} fullWidth>
                Filter
              </Button>
              <Tooltip title="Refresh List">
                <IconButton onClick={fetchFiles} color="primary">
                  <RefreshRounded />
                </IconButton>
              </Tooltip>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Filename</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Size</TableCell>
                  <TableCell>SHA-256 Digest</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Uploaded</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {files.map((file) => (
                  <TableRow key={file.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {file.is_protected && (
                          <LockRounded fontSize="small" color="secondary" />
                        )}
                        {file.filename}
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip label={`.${file.extension}`} size="small" variant="outlined" />
                    </TableCell>
                    <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                    <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.78rem' }}>
                      {shortHash(file.sha256_hash)}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={file.is_duplicate ? 'Duplicate' : 'Original'}
                        size="small"
                        color={file.is_duplicate ? 'warning' : 'success'}
                      />
                    </TableCell>
                    <TableCell>{formatDate(file.uploaded_at)}</TableCell>
                    <TableCell align="right">
                      <Tooltip title="Inspect SHA-256 & Metadata">
                        <IconButton size="small" onClick={() => setSelectedFile(file)}>
                          <InfoOutlined fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Download File">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => filesApi.downloadFile(file.id, file.filename)}
                        >
                          <DownloadRounded fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={file.is_protected ? 'Unlock Protection' : 'Protect File'}>
                        <IconButton
                          size="small"
                          color={file.is_protected ? 'secondary' : 'default'}
                          onClick={() => handleToggleProtect(file)}
                        >
                          {file.is_protected ? (
                            <LockRounded fontSize="small" />
                          ) : (
                            <LockOpenRounded fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete File">
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            disabled={file.is_protected}
                            onClick={() => handleDelete(file)}
                          >
                            <DeleteOutlineRounded fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
                {files.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                      No files match your filter criteria.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>

            {pages > 1 && (
              <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                  count={pages}
                  page={page}
                  onChange={(_, val) => setPage(val)}
                  color="primary"
                />
              </Box>
            )}
          </>
        )}
      </Paper>

      <FileDetailsModal
        file={selectedFile}
        open={Boolean(selectedFile)}
        onClose={() => setSelectedFile(null)}
      />

      <Snackbar
        open={Boolean(toast)}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert severity={toast?.type || 'info'} onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
          {toast?.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
};