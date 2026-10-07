from datetime import datetime, timezone
import enum
from sqlalchemy import (
    Column,
    Integer,
    BigInteger,
    String,
    Boolean,
    DateTime,
    ForeignKey,
    Enum,
    Text,
    JSON,
)
from sqlalchemy.orm import relationship
from app.core.database import Base


def utc_now():
    return datetime.now(timezone.utc)


class ProcessingStatus(str, enum.Enum):
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=utc_now)

    files = relationship("FileRecord", back_populates="owner", cascade="all, delete-orphan")
    deletion_histories = relationship("DeletionHistory", back_populates="user")
    audit_logs = relationship("AuditLog", back_populates="user")


class FileHash(Base):
    __tablename__ = "file_hashes"

    id = Column(Integer, primary_key=True, index=True)
    sha256_hash = Column(String(64), unique=True, index=True, nullable=False)
    file_size_bytes = Column(BigInteger, nullable=False)
    created_at = Column(DateTime, default=utc_now)

    files = relationship("FileRecord", back_populates="file_hash_ref")
    duplicate_group = relationship("DuplicateGroup", back_populates="file_hash_ref", uselist=False)


class DuplicateGroup(Base):
    __tablename__ = "duplicate_groups"

    id = Column(Integer, primary_key=True, index=True)
    hash_id = Column(Integer, ForeignKey("file_hashes.id", ondelete="CASCADE"), unique=True, nullable=False)
    original_file_id = Column(Integer, nullable=True, index=True)
    total_files = Column(Integer, default=1, nullable=False)
    total_size_bytes = Column(BigInteger, default=0, nullable=False)
    wasted_bytes = Column(BigInteger, default=0, nullable=False)
    updated_at = Column(DateTime, default=utc_now, onupdate=utc_now)

    file_hash_ref = relationship("FileHash", back_populates="duplicate_group")
    files = relationship("FileRecord", back_populates="duplicate_group")


class FileRecord(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    filename = Column(String(255), nullable=False, index=True)
    storage_path = Column(String(512), nullable=False)
    file_type = Column(String(100), nullable=False, index=True)
    extension = Column(String(30), nullable=False, index=True)
    size_bytes = Column(BigInteger, nullable=False, index=True)

    status = Column(Enum(ProcessingStatus), default=ProcessingStatus.PENDING, nullable=False)
    is_duplicate = Column(Boolean, default=False, index=True)
    is_protected = Column(Boolean, default=False)

    hash_id = Column(Integer, ForeignKey("file_hashes.id", ondelete="SET NULL"), nullable=True, index=True)
    duplicate_group_id = Column(Integer, ForeignKey("duplicate_groups.id", ondelete="SET NULL"), nullable=True, index=True)

    uploaded_at = Column(DateTime, default=utc_now, index=True)

    owner = relationship("User", back_populates="files")
    file_hash_ref = relationship("FileHash", back_populates="files")
    duplicate_group = relationship("DuplicateGroup", back_populates="files")
    metadata_info = relationship(
        "FileMetadata",
        back_populates="file",
        uselist=False,
        cascade="all, delete-orphan",
    )


class FileMetadata(Base):
    __tablename__ = "file_metadata"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"), unique=True, nullable=False)
    mime_type = Column(String(120), nullable=False)
    checksum_algorithm = Column(String(30), default="SHA-256")
    processing_time_ms = Column(Integer, nullable=True)
    extra_attributes = Column(JSON, nullable=True)

    file = relationship("FileRecord", back_populates="metadata_info")


class DeletionHistory(Base):
    __tablename__ = "deletion_history"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    original_file_id = Column(Integer, nullable=False)
    filename = Column(String(255), nullable=False)
    sha256_hash = Column(String(64), nullable=True)
    reclaimed_bytes = Column(BigInteger, nullable=False)
    deleted_at = Column(DateTime, default=utc_now)
    reason = Column(String(255), default="Duplicate cleanup")

    user = relationship("User", back_populates="deletion_histories")


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True)
    action = Column(String(100), nullable=False, index=True)
    entity_type = Column(String(50), nullable=False)
    entity_id = Column(Integer, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=utc_now, index=True)

    user = relationship("User", back_populates="audit_logs")