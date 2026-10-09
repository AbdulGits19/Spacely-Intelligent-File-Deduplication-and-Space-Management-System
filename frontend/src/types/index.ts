export type ProcessingStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export interface User {
  id: number;
  email: string;
  full_name: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface FileMetadataInfo {
  mime_type: string;
  checksum_algorithm: string;
  processing_time_ms?: number | null;
  extra_attributes?: Record<string, unknown> | null;
}

export interface FileRecord {
  id: number;
  user_id: number;
  filename: string;
  file_type: string;
  extension: string;
  size_bytes: number;
  status: ProcessingStatus;
  is_duplicate: boolean;
  is_protected: boolean;
  hash_id?: number | null;
  sha256_hash?: string | null;
  duplicate_group_id?: number | null;
  uploaded_at: string;
  metadata_info?: FileMetadataInfo | null;
}

export interface PaginatedFilesResponse {
  items: FileRecord[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

export interface DuplicateGroup {
  id: number;
  hash_id: number;
  sha256_hash: string;
  original_file_id?: number | null;
  original_file?: FileRecord | null;
  duplicate_files: FileRecord[];
  file_size_bytes: number;
  total_files: number;
  total_size_bytes: number;
  wasted_bytes: number;
  updated_at: string;
}

export interface DashboardAnalytics {
  total_files: number;
  total_storage_bytes: number;
  duplicate_files_count: number;
  duplicate_storage_bytes: number;
  potential_savings_bytes: number;
  total_reclaimed_bytes: number;
  largest_files: FileRecord[];
  recent_uploads: FileRecord[];
}

export interface SafeDeletePreviewResponse {
  deletable_files: FileRecord[];
  protected_or_skipped_ids: number[];
  total_reclaimable_bytes: number;
}

export interface SafeDeleteExecuteResponse {
  deleted_count: number;
  reclaimed_bytes: number;
  skipped_protected_ids: number[];
}

export interface DeletionHistoryItem {
  id: number;
  original_file_id: number;
  filename: string;
  sha256_hash?: string | null;
  reclaimed_bytes: number;
  deleted_at: string;
  reason: string;
}