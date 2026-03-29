#!/usr/bin/env bash
set -euo pipefail

# ── Config ──
DB_PATH="${DB_PATH:-/opt/codegym/data/codegym.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/codegym/backups}"
S3_BUCKET="${S3_BUCKET:-}"  # e.g. s3://codegym-backups/db
MAX_LOCAL_BACKUPS=20

# ── Timestamp ──
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
BACKUP_FILE="codegym-${TIMESTAMP}.db"

mkdir -p "$BACKUP_DIR"

# ── Safe backup using SQLite .backup command ──
# This is safe even while the DB is being written to (WAL mode)
sqlite3 "$DB_PATH" ".backup ${BACKUP_DIR}/${BACKUP_FILE}"

echo "[backup] Local: ${BACKUP_DIR}/${BACKUP_FILE}"

# ── Upload to S3 if configured ──
if [ -n "$S3_BUCKET" ]; then
  # Works with Yandex Object Storage (S3-compatible)
  # Requires: aws cli configured with --endpoint-url for Yandex
  aws s3 cp \
    "${BACKUP_DIR}/${BACKUP_FILE}" \
    "${S3_BUCKET}/${BACKUP_FILE}" \
    --endpoint-url="${S3_ENDPOINT:-https://storage.yandexcloud.net}" \
    --quiet
  echo "[backup] S3: ${S3_BUCKET}/${BACKUP_FILE}"
fi

# ── Rotate local backups ──
cd "$BACKUP_DIR"
ls -1t codegym-*.db 2>/dev/null | tail -n +$((MAX_LOCAL_BACKUPS + 1)) | xargs -r rm -f

echo "[backup] Done at $(date)"
