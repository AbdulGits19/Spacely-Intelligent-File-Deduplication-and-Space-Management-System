from app.worker.celery_app import celery_app
from app.core.database import SessionLocal
from app.services.hash_service import process_file_deduplication


@celery_app.task(name="process_uploaded_file_task")
def process_uploaded_file_task(file_id: int) -> dict:
    db = SessionLocal()
    try:
        return process_file_deduplication(db, file_id)
    finally:
        db.close()