import hashlib
import time
from pathlib import Path
from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.all_models import (
    FileRecord,
    FileHash,
    DuplicateGroup,
    FileMetadata,
    AuditLog,
    ProcessingStatus,
)


def compute_file_sha256(file_path: str | Path) -> str:
    sha256 = hashlib.sha256()
    chunk_size = settings.CHUNK_SIZE_BYTES
    with open(file_path, "rb") as f:
        while chunk := f.read(chunk_size):
            sha256.update(chunk)
    return sha256.hexdigest()


def recalculate_duplicate_group(db: Session, hash_id: int) -> None:
    file_hash = db.query(FileHash).filter(FileHash.id == hash_id).first()
    if not file_hash:
        return

    active_files = (
        db.query(FileRecord)
        .filter(
            FileRecord.hash_id == hash_id,
            FileRecord.status == ProcessingStatus.COMPLETED,
        )
        .order_by(FileRecord.uploaded_at.asc(), FileRecord.id.asc())
        .all()
    )

    group = db.query(DuplicateGroup).filter(DuplicateGroup.hash_id == hash_id).first()
    count = len(active_files)

    if count <= 1:
        for f in active_files:
            f.is_duplicate = False
            f.duplicate_group_id = None
        if group:
            db.delete(group)
        db.commit()
        return

    original = active_files[0]
    total_size = count * file_hash.file_size_bytes
    wasted = (count - 1) * file_hash.file_size_bytes

    if not group:
        group = DuplicateGroup(
            hash_id=hash_id,
            original_file_id=original.id,
            total_files=count,
            total_size_bytes=total_size,
            wasted_bytes=wasted,
        )
        db.add(group)
        db.flush()
    else:
        group.original_file_id = original.id
        group.total_files = count
        group.total_size_bytes = total_size
        group.wasted_bytes = wasted
        db.flush()

    for idx, f in enumerate(active_files):
        f.duplicate_group_id = group.id
        f.is_duplicate = idx > 0

    db.commit()


def process_file_deduplication(db: Session, file_id: int) -> dict:
    start_time = time.perf_counter()

    file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
    if not file_record:
        return {"status": "error", "message": f"File {file_id} not found"}

    try:
        file_record.status = ProcessingStatus.PROCESSING
        db.commit()

        physical_path = Path(file_record.storage_path)
        if not physical_path.exists():
            file_record.status = ProcessingStatus.FAILED
            db.commit()
            return {"status": "error", "message": "Physical file missing on disk"}

        digest = compute_file_sha256(physical_path)

        file_hash = db.query(FileHash).filter(FileHash.sha256_hash == digest).first()
        if not file_hash:
            file_hash = FileHash(
                sha256_hash=digest,
                file_size_bytes=file_record.size_bytes,
            )
            db.add(file_hash)
            db.flush()

        file_record.hash_id = file_hash.id
        file_record.status = ProcessingStatus.COMPLETED

        elapsed_ms = int((time.perf_counter() - start_time) * 1000)
        if file_record.metadata_info:
            file_record.metadata_info.processing_time_ms = elapsed_ms
        else:
            meta = FileMetadata(
                file_id=file_record.id,
                mime_type=file_record.file_type,
                checksum_algorithm="SHA-256",
                processing_time_ms=elapsed_ms,
                extra_attributes={"sha256": digest},
            )
            db.add(meta)

        db.commit()

        recalculate_duplicate_group(db, file_hash.id)
        db.refresh(file_record)

        audit = AuditLog(
            user_id=file_record.user_id,
            action="FILE_HASH_COMPLETED",
            entity_type="FileRecord",
            entity_id=file_record.id,
            details=f"SHA-256: {digest[:16]}... | Duplicate: {file_record.is_duplicate}",
        )
        db.add(audit)
        db.commit()

        return {
            "status": "completed",
            "file_id": file_record.id,
            "sha256": digest,
            "is_duplicate": file_record.is_duplicate,
            "processing_time_ms": elapsed_ms,
        }

    except Exception as exc:
        db.rollback()
        file_record = db.query(FileRecord).filter(FileRecord.id == file_id).first()
        if file_record:
            file_record.status = ProcessingStatus.FAILED
            db.commit()
        return {"status": "failed", "error": str(exc)}