import React, { useEffect, useState } from 'react';
import {
  Box,
  Chip,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { HistoryRounded, SavingsRounded } from '@mui/icons-material';
import { duplicatesApi } from '../api/apiClient';
import { DeletionHistoryItem } from '../types';
import { formatBytes, formatDate, shortHash } from '../utils/formatters';

export const HistoryPage: React.FC = () => {
  const [history, setHistory] = useState<DeletionHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    duplicatesApi
      .getHistory()
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  const totalReclaimed = history.reduce((acc, item) => acc + item.reclaimed_bytes, 0);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <Paper
        sx={{
          p: 3.5,
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <HistoryRounded sx={{ fontSize: 40, color: 'primary.main' }} />
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 700 }}>
              Deletion Audit & Space Reclamation Log
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Immutable ledger of all removed duplicate files and reclaimed bytes.
            </Typography>
          </Box>
        </Box>
        <Chip
          icon={<SavingsRounded />}
          label={`Total Reclaimed: ${formatBytes(totalReclaimed)}`}
          color="primary"
          sx={{ px: 1.5, py: 2.5, fontSize: '0.95rem' }}
        />
      </Paper>

      <Paper sx={{ p: 3 }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Deleted Filename</TableCell>
                <TableCell>SHA-256 Signature</TableCell>
                <TableCell>Space Reclaimed</TableCell>
                <TableCell>Audit Reason</TableCell>
                <TableCell align="right">Deleted Timestamp</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {history.map((item) => (
                <TableRow key={item.id} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{item.filename}</TableCell>
                  <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                    {shortHash(item.sha256_hash)}
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={`+${formatBytes(item.reclaimed_bytes)}`}
                      color="success"
                      size="small"
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>{item.reason}</TableCell>
                  <TableCell align="right">{formatDate(item.deleted_at)}</TableCell>
                </TableRow>
              ))}
              {history.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                    No deletion history entries recorded yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </Paper>
    </Box>
  );
};