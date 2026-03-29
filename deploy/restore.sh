#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   ./restore.sh                           # restore latest local backup
#   ./restore.sh codegym-20260329-120000.db  # restore specific file
#   ./restore.sh s3                        # restore latest from S3

DB_PATH="${DB_PATH:-/opt/codegym/data/codegym.db}"
BACKUP_DIR="${BACKUP_DIR:-/opt/codegym/backups}"
S3_BUCKET="${S3_BUCKET:-}"

SOURCE="${1:-latest}"

echo "[restore] Stopping service..."
sudo systemctl stop codegym 2>/dev/null || true

if [ "$SOURCE" = "s3" ]; then
  if [ -z "$S3_BUCKET" ]; then
    echo "Error: S3_BUCKET not set"
    exit 1
  fi

  # Get latest file from S3
  LATEST=$(aws s3 ls "${S3_BUCKET}/" \
    --endpoint-url="${S3_ENDPOINT:-https://storage.yandexcloud.net}" \
    | sort | tail -1 | awk '{print $4}')

  echo "[restore] Downloading ${LATEST} from S3..."
  aws s3 cp \
    "${S3_BUCKET}/${LATEST}" \
    "/tmp/restore.db" \
    --endpoint-url="${S3_ENDPOINT:-https://storage.yandexcloud.net}"

  RESTORE_FILE="/tmp/restore.db"

elif [ "$SOURCE" = "latest" ]; then
  RESTORE_FILE=$(ls -1t "${BACKUP_DIR}"/codegym-*.db 2>/dev/null | head -1)
  if [ -z "$RESTORE_FILE" ]; then
    echo "Error: No local backups found in ${BACKUP_DIR}"
    exit 1
  fi
else
  RESTORE_FILE="${BACKUP_DIR}/${SOURCE}"
fi

if [ ! -f "$RESTORE_FILE" ]; then
  echo "Error: File not found: ${RESTORE_FILE}"
  exit 1
fi

# Backup current DB before overwriting
if [ -f "$DB_PATH" ]; then
  cp "$DB_PATH" "${DB_PATH}.pre-restore"
  echo "[restore] Current DB saved to ${DB_PATH}.pre-restore"
fi

cp "$RESTORE_FILE" "$DB_PATH"
echo "[restore] Restored from: ${RESTORE_FILE}"

echo "[restore] Starting service..."
sudo systemctl start codegym
echo "[restore] Done."
