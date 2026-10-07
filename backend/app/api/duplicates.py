from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.files import serialize_file
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import (
    AuditLog,
    DeletionHistory,
    DuplicateGroup,
    FileRecord,
    ProcessingStatus,
    User,
)
from app.schemas.all_schemas import (
    DeletionHistoryResponse,
    DuplicateGroupResponse,
    SafeDeletePreviewResponse,
    SafeDeleteRequest,
)
from app.services.hash_service import recalculate_duplicate_group

router = APIRouter(prefix="/duplicates", tags=["Duplicate Detection & Cleanup"])


@router.get("/groups", response_model=List[DuplicateGroupResponse])
def get_duplicate_groups(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    groups = (
        db.query(DuplicateGroup)
        .join(FileRecord, FileRecord.duplicate_group_id == DuplicateGroup.id)
        .filter(
            FileRecord.user_id == current_user.id,
            FileRecord.status == ProcessingStatus.COMPLETED,
        )
        .distinct()
        .order_by(DuplicateGroup.wasted_bytes.desc())
        .all()
    )

    response_list: List[DuplicateGroupResponse] = []
    for grp in groups:
        user_files = (
            db.query(FileRecord)
            .filter(
                FileRecord.duplicate_group_id == grp.id,
                FileRecord.user_id == current_user.id,
                FileRecord.status == ProcessingStatus.COMPLETED,
            )
            .order_by(FileRecord.uploaded_at.asc(), FileRecord.id.asc())
            .all()
        )
        if len(user_files) < 2:
            continue

        orig = user_files[0]
        dups = user_files[1:]
        file_size = grp.file_hash_ref.file_size_bytes if grp.file_hash_ref else orig.size_bytes
        sha256_str = grp.file_hash_ref.sha256_hash if grp.file_hash_ref else ""

        response_list.append(
            DuplicateGroupResponse(
                id=grp.id,
                hash_id=grp.hash_id,
                sha256_hash=sha256_str,
                original_file_id=orig.id,
                original_file=serialize_file(orig),
                duplicate_files=[serialize_file(d) for d in dups],
                file_size_bytes=file_size,
                total_files=len(user_files),
                total_size_bytes=len(user_files) * file_size,
                wasted_bytes=len(dups) * file_size,
                updated_at=grp.updated_at,
            )
        )

    return response_list


@router.post("/preview-delete", response_model=SafeDeletePreviewResponse)
def preview_safe_delete(
    payload: SafeDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.file_ids:
        raise HTTPException(status_code=400, detail="No file IDs provided.")

    records = (
        db.query(FileRecord)
        .filter(
            FileRecord.id.in_(payload.file_ids),
            FileRecord.user_id == current_user.id,
        )
        .all()
    )

    deletable = []
    skipped_ids = []
    reclaimable_bytes = 0

    for rec in records:
        if rec.is_protected:
            skipped_ids.append(rec.id)
        else:
            deletable.append(serialize_file(rec))
            reclaimable_bytes += rec.size_bytes

    return SafeDeletePreviewResponse(
        deletable_files=deletable,
        protected_or_skipped_ids=skipped_ids,
        total_reclaimable_bytes=reclaimable_bytes,
    )


@router.post("/safe-delete", status_code=status.HTTP_200_OK)
def execute_safe_delete(
    payload: SafeDeleteRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not payload.file_ids:
        raise HTTPException(status_code=400, detail="No file IDs provided for deletion.")

    records = (
        db.query(FileRecord)
        .filter(
            FileRecord.id.in_(payload.file_ids),
            FileRecord.user_id == current_user.id,
        )
        .all()
    )

    deleted_count = 0
    reclaimed_bytes = 0
    skipped_protected = []
    affected_hashes = set()

    for rec in records:
        if rec.is_protected:
            skipped_protected.append(rec.id)
            continue

        if rec.hash_id:
            affected_hashes.add(rec.hash_id)

        sha256_val = rec.file_hash_ref.sha256_hash if rec.file_hash_ref else None
        Path(rec.storage_path).unlink(missing_ok=True)

        db.add(
            DeletionHistory(
                user_id=current_user.id,
                original_file_id=rec.id,
                filename=rec.filename,
                sha256_hash=sha256_val,
                reclaimed_bytes=rec.size_bytes,
                reason=payload.reason or "Safe duplicate cleanup",
            )
        )
        reclaimed_bytes += rec.size_bytes
        deleted_count += 1
        db.delete(rec)

    db.add(
        AuditLog(
            user_id=current_user.id,
            action="BULK_SAFE_DELETE",
            entity_type="FileRecord",
            details=f"Deleted {deleted_count} files, reclaimed {reclaimed_bytes} bytes.",
        )
    )
    db.commit()

    for h_id in affected_hashes:
        recalculate_duplicate_group(db, h_id)

    return {
        "deleted_count": deleted_count,
        "reclaimed_bytes": reclaimed_bytes,
        "skipped_protected_ids": skipped_protected,
    }


@router.get("/history", response_model=List[DeletionHistoryResponse])
def get_deletion_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    history = (
        db.query(DeletionHistory)
        .filter(DeletionHistory.user_id == current_user.id)
        .order_by(DeletionHistory.deleted_at.desc())
        .limit(50)
        .all()
    )
    return history