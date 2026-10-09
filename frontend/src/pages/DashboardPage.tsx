import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Grid,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import {
  CloudUploadRounded,
  DataUsageRounded,
  DeleteSweepRounded,
  FilterNoneRounded,
  SavingsRounded,
  StorageRounded,
} from '@mui/icons-material';
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip as ChartTooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
} from 'chart.js';
import { Doughnut, Bar } from 'react-chartjs-2';
import { analyticsApi } from '../api/apiClient';
import { DashboardAnalytics } from '../types';
import { formatBytes, formatDate, shortHash } from '../utils/formatters';

ChartJS.register(ArcElement, ChartTooltip, Legend, CategoryScale, LinearScale, BarElement);

export const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const fetchAnalytics = async () => {
    try {
      const res = await analyticsApi.getDashboard();
      setData(res);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  if (loading || !data) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 10 }}>
        <CircularProgress color="primary" />
      </Box>
    );
  }

  const uniqueStorageBytes = Math.max(0, data.total_storage_bytes - data.duplicate_storage_bytes);

  const doughnutData = {
    labels: ['Unique Essential Storage', 'Redundant Duplicate Storage'],
    datasets: [
      {
        data: [uniqueStorageBytes || 1, data.duplicate_storage_bytes],
        backgroundColor: ['#2D6A4F', '#C54B8C'],
        borderColor: ['rgba(240,255,240,0.2)', 'rgba(240,255,240,0.2)'],
        borderWidth: 2,
      },
    ],
  };

  const barData = {
    labels: data.largest_files.map((f) =>
      f.filename.length > 18 ? `${f.filename.slice(0, 15)}...` : f.filename
    ),
    datasets: [
      {
        label: 'Size (Bytes)',
        data: data.largest_files.map((f) => f.size_bytes),
        backgroundColor: '#C54B8C',
        borderRadius: 8,
      },
    ],
  };

  const kpis = [
    {
      title: 'Total Indexed Files',
      value: data.total_files.toLocaleString(),
      sub: 'Active in vault',
      icon: <StorageRounded />,
      accent: '#C54B8C',
    },
    {
      title: 'Total Storage Consumed',
      value: formatBytes(data.total_storage_bytes),
      sub: `${data.total_storage_bytes.toLocaleString()} B`,
      icon: <DataUsageRounded />,
      accent: '#C54B8C',
    },
    {
      title: 'Duplicate Files Detected',
      value: data.duplicate_files_count.toLocaleString(),
      sub: `${formatBytes(data.duplicate_storage_bytes)} wasted`,
      icon: <FilterNoneRounded />,
      accent: '#F4A261',
    },
    {
      title: 'Potential Storage Savings',
      value: formatBytes(data.potential_savings_bytes),
      sub: `Historical Reclaimed: ${formatBytes(data.total_reclaimed_bytes)}`,
      icon: <SavingsRounded />,
      accent: '#2D6A4F',
    },
  ];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3.5 }}>
      <Paper
        sx={{
          p: 3.5,
          background: 'linear-gradient(135deg, rgba(197, 75, 140, 0.22) 0%, rgba(45, 106, 79, 0.15) 100%)',
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ mb: 0.5 }}>
            Storage Optimization Intelligence
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Real-time SHA-256 content fingerprinting and redundant space reclamation.
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1.5 }}>
          <Button
            variant="outlined"
            startIcon={<DeleteSweepRounded />}
            onClick={() => navigate('/duplicates')}
          >
            Resolve Duplicates ({data.duplicate_files_count})
          </Button>
          <Button
            variant="contained"
            startIcon={<CloudUploadRounded />}
            onClick={() => navigate('/files')}
          >
            Upload Files
          </Button>
        </Box>
      </Paper>

      <Grid container spacing={2.5}>
        {kpis.map((kpi, idx) => (
          <Grid item xs={12} sm={6} md={3} key={idx}>
            <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle2" color="text.secondary">
                  {kpi.title}
                </Typography>
                <Box
                  sx={{
                    p: 1,
                    borderRadius: 2.5,
                    bgcolor: `${kpi.accent}22`,
                    color: kpi.accent,
                    display: 'flex',
                  }}
                >
                  {kpi.icon}
                </Box>
              </Box>
              <Box>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.5 }}>
                  {kpi.value}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {kpi.sub}
                </Typography>
              </Box>
            </Paper>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={5}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Storage Efficiency Breakdown
            </Typography>
            <Box sx={{ maxWidth: 280, mx: 'auto', py: 2 }}>
              <Doughnut
                data={doughnutData}
                options={{
                  plugins: { legend: { position: 'bottom' } },
                  cutout: '68%',
                }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={7}>
          <Paper sx={{ p: 3, height: '100%' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Top 5 Largest Files in Vault
            </Typography>
            {data.largest_files.length === 0 ? (
              <Typography variant="body2" color="text.secondary" sx={{ py: 8, textAlign: 'center' }}>
                No files uploaded yet.
              </Typography>
            ) : (
              <Box sx={{ height: 270 }}>
                <Bar
                  data={barData}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>

      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Recent Uploads & Hashing Pipeline
        </Typography>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Filename</TableCell>
              <TableCell>Size</TableCell>
              <TableCell>SHA-256 Signature</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Deduplication</TableCell>
              <TableCell align="right">Uploaded At</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data.recent_uploads.map((file) => (
              <TableRow key={file.id} hover>
                <TableCell sx={{ fontWeight: 600 }}>{file.filename}</TableCell>
                <TableCell>{formatBytes(file.size_bytes)}</TableCell>
                <TableCell sx={{ fontFamily: '"JetBrains Mono", monospace', fontSize: '0.8rem' }}>
                  {shortHash(file.sha256_hash)}
                </TableCell>
                <TableCell>
                  <Chip
                    label={file.status}
                    size="small"
                    color={file.status === 'COMPLETED' ? 'success' : 'warning'}
                  />
                </TableCell>
                <TableCell>
                  <Chip
                    label={file.is_duplicate ? 'Duplicate' : 'Unique'}
                    size="small"
                    variant="outlined"
                    color={file.is_duplicate ? 'error' : 'success'}
                  />
                </TableCell>
                <TableCell align="right">{formatDate(file.uploaded_at)}</TableCell>
              </TableRow>
            ))}
            {data.recent_uploads.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  No recent uploads found.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
};