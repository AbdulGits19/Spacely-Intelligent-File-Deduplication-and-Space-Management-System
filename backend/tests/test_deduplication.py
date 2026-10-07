import os
import tempfile
import hashlib
from unittest.mock import MagicMock
from app.services.hash_service import compute_file_sha256, recalculate_duplicate_group
from app.models.all_models import FileRecord, FileHash, DuplicateGroup, ProcessingStatus


def test_compute_file_sha256():
    test_content = b"Intelligent File Deduplication Engine Test"
    expected_hash = hashlib.sha256(test_content).hexdigest()

    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        tmp.write(test_content)
        tmp_path = tmp.name

    try:
        computed_hash = compute_file_sha256(tmp_path)
        assert computed_hash == expected_hash, f"Expected {expected_hash}, got {computed_hash}"
    finally:
        os.unlink(tmp_path)


def test_recalculate_duplicate_group_creation():
    db = MagicMock()
    
    mock_hash = FileHash(id=1, sha256_hash="dummyhash", file_size_bytes=1000)
    db.query().filter().first.side_effect = [mock_hash, None] 

    file1 = FileRecord(id=10, hash_id=1, status=ProcessingStatus.COMPLETED, size_bytes=1000)
    file2 = FileRecord(id=11, hash_id=1, status=ProcessingStatus.COMPLETED, size_bytes=1000)
    
    db.query().filter().order_by().all.return_value = [file1, file2]

    recalculate_duplicate_group(db, hash_id=1)

    db.add.assert_called_once()
    added_group = db.add.call_args[0][0]
    
    assert isinstance(added_group, DuplicateGroup)
    assert added_group.total_files == 2
    assert added_group.total_size_bytes == 2000
    assert added_group.wasted_bytes == 1000 
    
    assert file1.is_duplicate is False
    assert file2.is_duplicate is True