from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.api.files import serialize_file
from app.core.database import get_db
from app.core.security import get_current_user
from app.models.all_models import DeletionHistory, FileRecord, User
from app.schemas.all_schemas import DashboardAnalyticsResponse

router = APIRouter(prefix="/analytics", tags=["Storage Analytics"])


@router.get("/dashboard", response_model=DashboardAnalyticsResponse)
def get_dashboard_analytics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    total_files = (
        db.query(func.count(FileRecord.id))
        .filter(FileRecord.user_id == current_user.id)
        .scalar()
        or 0
    )

    total_storage_bytes = (
        db.query(func.coalesce(func.sum(FileRecord.size_bytes), 0))
        .filter(FileRecord.user_id == current_user.id)
        .scalar()
        or 0
    )

    duplicate_files_count = (
        db.query(func.count(FileRecord.id))
        .filter(
            FileRecord.user_id == current_user.id,
            FileRecord.is_duplicate.is_(True),
        )
        .scalar()
        or 0
    )

    duplicate_storage_bytes = (
        db.query(func.coalesce(func.sum(FileRecord.size_bytes), 0))
        .filter(
            FileRecord.user_id == current_user.id,
            FileRecord.is_duplicate.is_(True),
        )
        .scalar()
        or 0
    )

    total_reclaimed_bytes = (
        db.query(func.coalesce(func.sum(DeletionHistory.reclaimed_bytes), 0))
        .filter(DeletionHistory.user_id == current_user.id)
        .scalar()
        or 0
    )

    largest_files = (
        db.query(FileRecord)
        .filter(FileRecord.user_id == current_user.id)
        .order_by(FileRecord.size_bytes.desc())
        .limit(5)
        .all()
    )

    recent_uploads = (
        db.query(FileRecord)
        .filter(FileRecord.user_id == current_user.id)
        .order_by(FileRecord.uploaded_at.desc())
        .limit(5)
        .all()
    )

    return DashboardAnalyticsResponse(
        total_files=total_files,
        total_storage_bytes=int(total_storage_bytes),
        duplicate_files_count=duplicate_files_count,
        duplicate_storage_bytes=int(duplicate_storage_bytes),
        potential_savings_bytes=int(duplicate_storage_bytes),
        total_reclaimed_bytes=int(total_reclaimed_bytes),
        largest_files=[serialize_file(f) for f in largest_files],
        recent_uploads=[serialize_file(f) for f in recent_uploads],
    )