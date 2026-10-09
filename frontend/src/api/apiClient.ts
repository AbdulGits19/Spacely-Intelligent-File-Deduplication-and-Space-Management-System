import axios from 'axios';
import {
  AuthTokenResponse,
  DashboardAnalytics,
  DeletionHistoryItem,
  DuplicateGroup,
  FileRecord,
  PaginatedFilesResponse,
  SafeDeleteExecuteResponse,
  SafeDeletePreviewResponse,
  User,
} from '../types';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api/v1';
const HEALTH_URL = import.meta.env.VITE_HEALTH_URL || 'http://localhost:8000/health';

export const api = axios.create({
  baseURL: API_BASE_URL,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dedup_access_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('dedup_access_token');
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (data: { email: string; full_name: string; password: string }): Promise<User> => {
    const res = await api.post<User>('/auth/register', data);
    return res.data;
  },
  login: async (email: string, password: string): Promise<AuthTokenResponse> => {
    const formData = new URLSearchParams();
    formData.append('username', email);
    formData.append('password', password);
    const res = await api.post<AuthTokenResponse>('/auth/login', formData, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    return res.data;
  },
  getMe: async (): Promise<User> => {
    const res = await api.get<User>('/auth/me');
    return res.data;
  },
};

export interface FileQueryParams {
  search?: string;
  file_type?: string;
  is_duplicate?: boolean;
  min_size?: number;
  max_size?: number;
  start_date?: string;
  end_date?: string;
  sort_by?: 'uploaded_at' | 'size_bytes' | 'filename';
  sort_order?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export const filesApi = {
  uploadSingleFile: async (file: File): Promise<FileRecord> => {
    const formData = new FormData();
    formData.append('file', file);
    const res = await api.post<FileRecord>('/files/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },
  listFiles: async (params: FileQueryParams): Promise<PaginatedFilesResponse> => {
    const res = await api.get<PaginatedFilesResponse>('/files', { params });
    return res.data;
  },
  getFileDetails: async (fileId: number): Promise<FileRecord> => {
    const res = await api.get<FileRecord>(`/files/${fileId}`);
    return res.data;
  },
  downloadFile: async (fileId: number, filename: string): Promise<void> => {
    const res = await api.get(`/files/${fileId}/download`, { responseType: 'blob' });
    const blobUrl = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = blobUrl;
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(blobUrl);
  },
  toggleProtect: async (fileId: number): Promise<FileRecord> => {
    const res = await api.patch<FileRecord>(`/files/${fileId}/protect`);
    return res.data;
  },
  deleteFile: async (fileId: number): Promise<{ message: string; reclaimed_bytes: number }> => {
    const res = await api.delete(`/files/${fileId}`);
    return res.data;
  },
};

export const duplicatesApi = {
  getGroups: async (): Promise<DuplicateGroup[]> => {
    const res = await api.get<DuplicateGroup[]>('/duplicates/groups');
    return res.data;
  },
  previewDelete: async (fileIds: number[], reason?: string): Promise<SafeDeletePreviewResponse> => {
    const res = await api.post<SafeDeletePreviewResponse>('/duplicates/preview-delete', {
      file_ids: fileIds,
      reason: reason || 'User previewed duplicate cleanup',
    });
    return res.data;
  },
  executeSafeDelete: async (fileIds: number[], reason?: string): Promise<SafeDeleteExecuteResponse> => {
    const res = await api.post<SafeDeleteExecuteResponse>('/duplicates/safe-delete', {
      file_ids: fileIds,
      reason: reason || 'Confirmed safe duplicate cleanup',
    });
    return res.data;
  },
  getHistory: async (): Promise<DeletionHistoryItem[]> => {
    const res = await api.get<DeletionHistoryItem[]>('/duplicates/history');
    return res.data;
  },
};

export const analyticsApi = {
  getDashboard: async (): Promise<DashboardAnalytics> => {
    const res = await api.get<DashboardAnalytics>('/analytics/dashboard');
    return res.data;
  },
  checkHealth: async (): Promise<{ status: string; service: string }> => {
    const res = await axios.get(HEALTH_URL);
    return res.data;
  },
};