from datetime import datetime
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, EmailStr, ConfigDict
from app.models.all_models import ProcessingStatus


class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: EmailStr
    full_name: str
    is_active: bool
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class FileMetadataSchema(BaseModel):
    mime_type: str
    checksum_algorithm: str
    processing_time_ms: Optional[int] = None
    extra_attributes: Optional[Dict[str, Any]] = None

    model_config = ConfigDict(from_attributes=True)


class FileResponse(BaseModel):
    id: int
    user_id: int
    filename: str
    file_type: str
    extension: str
    size_bytes: int
    status: ProcessingStatus
    is_duplicate: bool
    is_protected: bool
    hash_id: Optional[int] = None
    sha256_hash: Optional[str] = None
    duplicate_group_id: Optional[int] = None
    uploaded_at: datetime
    metadata_info: Optional[FileMetadataSchema] = None

    model_config = ConfigDict(from_attributes=True)


class PaginatedFilesResponse(BaseModel):
    items: List[FileResponse]
    total: int
    page: int
    size: int
    pages: int


class DuplicateGroupResponse(BaseModel):
    id: int
    hash_id: int
    sha256_hash: str
    original_file_id: Optional[int] = None
    original_file: Optional[FileResponse] = None
    duplicate_files: List[FileResponse] = []
    file_size_bytes: int
    total_files: int
    total_size_bytes: int
    wasted_bytes: int
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class DashboardAnalyticsResponse(BaseModel):
    total_files: int
    total_storage_bytes: int
    duplicate_files_count: int
    duplicate_storage_bytes: int
    potential_savings_bytes: int
    total_reclaimed_bytes: int
    largest_files: List[FileResponse]
    recent_uploads: List[FileResponse]


class SafeDeleteRequest(BaseModel):
    file_ids: List[int]
    reason: Optional[str] = "User confirmed duplicate cleanup"


class SafeDeletePreviewResponse(BaseModel):
    deletable_files: List[FileResponse]
    protected_or_skipped_ids: List[int]
    total_reclaimable_bytes: int


class DeletionHistoryResponse(BaseModel):
    id: int
    original_file_id: int
    filename: str
    sha256_hash: Optional[str] = None
    reclaimed_bytes: int
    deleted_at: datetime
    reason: str

    model_config = ConfigDict(from_attributes=True)