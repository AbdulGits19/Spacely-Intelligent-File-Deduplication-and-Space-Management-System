import math
import uuid
from datetime import datetime
from pathlib import Path
from typing import List, Optional

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile, status
from fastapi.responses import FileResponse as FastAPIFileResponse
from sqlalchemy import asc, desc
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import (
    AuditLog,
    DeletionHistory,
    FileMetadata,
    FileRecord,
    ProcessingStatus,
    User,
)
from app.schemas.all_schemas import FileResponse, PaginatedFilesResponse
from app.services.hash_service import process_file_deduplication, recalculate_duplicate_group
from app.worker.tasks import process_uploaded_file_task

router = APIRouter(prefix="/files", tags=["File Management"])

BACKEND_DIR = Path(__file__).resolve().parents[2]
UPLOAD_STORAGE_DIR = BACKEND_DIR / settings.UPLOAD_DIR
UPLOAD_STORAGE_DIR.mkdir(parents=True, exist_ok=True)


def serialize_file(file_rec: FileRecord) -> FileResponse:
    sha256_val = file_rec.file_hash_ref.sha256_hash if file_rec.file_hash_ref else None
    return FileResponse(
        id=file_rec.id,
        user_id=file_rec.user_id,
        filename=file_rec.filename,
        file_type=file_rec.file_type,
        extension=file_rec.extension,
        size_bytes=file_rec.size_bytes,
        status=file_rec.status,
        is_duplicate=file_rec.is_duplicate,
        is_protected=file_rec.is_protected,
        hash_id=file_rec.hash_id,
        sha256_hash=sha256_val,
        duplicate_group_id=file_rec.duplicate_group_id,
        uploaded_at=file_rec.uploaded_at,
        metadata_info=file_rec.metadata_info,
    )


@router.post("/upload", response_model=List[FileResponse], status_code=status.HTTP_202_ACCEPTED)
def upload_files(
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not files:
        raise HTTPException(status_code=400, detail="No files provided for upload.")

    max_bytes = settings.MAX_FILE_SIZE_MB * 1024 * 1024
    uploaded_records: List[FileRecord] = []

    for upload in files:
        original_name = Path(upload.filename or "unnamed_file").name
        ext = Path(original_name).suffix.lower().lstrip(".") or "bin"
        mime_type = upload.content_type or "application/octet-stream"

        unique_disk_name = f"{uuid.uuid4().hex}_{original_name}"
        dest_path = UPLOAD_STORAGE_DIR / unique_disk_name

        total_bytes = 0
        try:
            with open(dest_path, "wb") as buffer:
                while chunk := upload.file.read(settings.CHUNK_SIZE_BYTES):
                    total_bytes += len(chunk)
                    if total_bytes > max_bytes:
                        buffer.close()
                        dest_path.unlink(missing_ok=True)
                        raise HTTPException(
                            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                            detail=f"File {original_name} exceeds maximum limit of {settings.MAX_FILE_SIZE_MB} MB.",
                        )
                    buffer.write(chunk)
        finally:
            upload.file.close()

        file_record = FileRecord(
            user_id=current_user.id,
            filename=original_name,
            storage_path=str(dest_path),
            file_type=mime_type,
            extension=ext,
            size_bytes=total_bytes,
            status=ProcessingStatus.PENDING,
        )
        db.add(file_record)
        db.flush()

        meta = FileMetadata(
            file_id=file_record.id,
            mime_type=mime_type,
            checksum_algorithm="SHA-256",
        )
        db.add(meta)
        db.add(
            AuditLog(
                user_id=current_user.id,
                action="FILE_UPLOADED",
                entity_type="FileRecord",
                entity_id=file_record.id,
                details=f"Uploaded {original_name} ({total_bytes} bytes)",
            )
        )
        db.commit()
        db.refresh(file_record)

        try:
            process_uploaded_file_task.delay(file_record.id)
        except Exception:
            process_file_deduplication(db, file_record.id)
            db.refresh(file_record)

        uploaded_records.append(file_record)

    return [serialize_file(rec) for rec in uploaded_records]


@router.get("", response_model=PaginatedFilesResponse)
def list_files(
    search: Optional[str] = Query(None, description="Search by filename"),
    file_type: Optional[str] = Query(None, description="Filter by extension or MIME type"),
    is_duplicate: Optional[bool] = Query(None, description="Filter duplicates only"),
    min_size: Optional[int] = Query(None, ge=0, description="Minimum size in bytes"),
    max_size: Optional[int] = Query(None, ge=0, description="Maximum size in bytes"),
    start_date: Optional[datetime] = Query(None, description="Uploaded after ISO timestamp"),
    end_date: Optional[datetime] = Query(None, description="Uploaded before ISO timestamp"),
    sort_by: str = Query("uploaded_at", pattern="^(uploaded_at|size_bytes|filename)$"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    page: int = Query(1, ge=1),
    size: int = Query(15, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    query = db.query(FileRecord).filter(FileRecord.user_id == current_user.id)

    if search:
        query = query.filter(FileRecord.filename.ilike(f"%{search.strip()}%"))
    if file_type:
        ft = file_type.strip().lower()
        query = query.filter((FileRecord.extension == ft) | (FileRecord.file_type.ilike(f"%{ft}%")))
    if is_duplicate is not None:
        query = query.filter(FileRecord.is_duplicate == is_duplicate)
    if min_size is not None:
        query = query.filter(FileRecord.size_bytes >= min_size)
    if max_size is not None:
        query = query.filter(FileRecord.size_bytes <= max_size)
    if start_date is not None:
        query = query.filter(FileRecord.uploaded_at >= start_date)
    if end_date is not None:
        query = query.filter(FileRecord.uploaded_at <= end_date)

    total = query.count()
    sort_column = getattr(FileRecord, sort_by, FileRecord.uploaded_at)
    order_func = desc if sort_order == "desc" else asc

    items = (
        query.order_by(order_func(sort_column))
        .offset((page - 1) * size)
        .limit(size)
        .all()
    )

    pages = math.ceil(total / size) if total > 0 else 1

    return PaginatedFilesResponse(
        items=[serialize_file(item) for item in items],
        total=total,
        page=page,
        size=size,
        pages=pages,
    )


@router.get("/{file_id}", response_model=FileResponse)
def get_file_details(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_rec = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.user_id == current_user.id)
        .first()
    )
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found.")
    return serialize_file(file_rec)


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_rec = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.user_id == current_user.id)
        .first()
    )
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found.")

    physical_path = Path(file_rec.storage_path)
    if not physical_path.exists():
        raise HTTPException(status_code=404, detail="Physical file is missing from storage.")

    return FastAPIFileResponse(
        path=str(physical_path),
        filename=file_rec.filename,
        media_type=file_rec.file_type,
    )


@router.patch("/{file_id}/protect", response_model=FileResponse)
def toggle_file_protection(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_rec = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.user_id == current_user.id)
        .first()
    )
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found.")

    file_rec.is_protected = not file_rec.is_protected
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="FILE_PROTECTION_TOGGLED",
            entity_type="FileRecord",
            entity_id=file_rec.id,
            details=f"Protected set to {file_rec.is_protected}",
        )
    )
    db.commit()
    db.refresh(file_rec)
    return serialize_file(file_rec)


@router.delete("/{file_id}", status_code=status.HTTP_200_OK)
def delete_single_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    file_rec = (
        db.query(FileRecord)
        .filter(FileRecord.id == file_id, FileRecord.user_id == current_user.id)
        .first()
    )
    if not file_rec:
        raise HTTPException(status_code=404, detail="File not found.")

    if file_rec.is_protected:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete a protected file. Disable protection first.",
        )

    hash_id = file_rec.hash_id
    sha256_val = file_rec.file_hash_ref.sha256_hash if file_rec.file_hash_ref else None
    reclaimed = file_rec.size_bytes
    filename = file_rec.filename

    Path(file_rec.storage_path).unlink(missing_ok=True)

    db.add(
        DeletionHistory(
            user_id=current_user.id,
            original_file_id=file_rec.id,
            filename=filename,
            sha256_hash=sha256_val,
            reclaimed_bytes=reclaimed,
            reason="Manual single file deletion",
        )
    )
    db.add(
        AuditLog(
            user_id=current_user.id,
            action="FILE_DELETED",
            entity_type="FileRecord",
            entity_id=file_rec.id,
            details=f"Deleted {filename} ({reclaimed} bytes reclaimed)",
        )
    )

    db.delete(file_rec)
    db.commit()

    if hash_id:
        recalculate_duplicate_group(db, hash_id)

    return {"message": f"File '{filename}' deleted successfully.", "reclaimed_bytes": reclaimed}