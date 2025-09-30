#!/bin/bash

# Production Database Backup Script for Planerix
# This script creates compressed backups of the production database

set -euo pipefail

# Configuration
BACKUP_DIR="/backups"
DB_HOST="${POSTGRES_HOST:-postgres}"
DB_NAME="${POSTGRES_DB}"
DB_USER="${POSTGRES_USER}"
DB_PASSWORD="${POSTGRES_PASSWORD}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"

# Create backup directory if it doesn't exist
mkdir -p "$BACKUP_DIR"

# Generate timestamp
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="planerix_backup_${TIMESTAMP}.sql.gz"
BACKUP_PATH="$BACKUP_DIR/$BACKUP_FILE"

# Function to log messages
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to cleanup old backups
cleanup_old_backups() {
    log "Cleaning up backups older than ${RETENTION_DAYS} days..."
    find "$BACKUP_DIR" -name "planerix_backup_*.sql.gz" -mtime +${RETENTION_DAYS} -delete
    log "Cleanup completed"
}

# Main backup function
create_backup() {
    log "Starting database backup..."
    log "Database: $DB_NAME"
    log "Host: $DB_HOST"
    log "User: $DB_USER"
    log "Backup file: $BACKUP_PATH"

    # Set password environment variable
    export PGPASSWORD="$DB_PASSWORD"

    # Create the backup
    if pg_dump -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" --verbose --no-owner --no-acl | gzip > "$BACKUP_PATH"; then
        log "✅ Backup created successfully: $BACKUP_PATH"

        # Get file size
        BACKUP_SIZE=$(du -h "$BACKUP_PATH" | cut -f1)
        log "Backup size: $BACKUP_SIZE"

        # Verify backup integrity
        if gzip -t "$BACKUP_PATH"; then
            log "✅ Backup integrity verified"
        else
            log "❌ Backup integrity check failed!"
            exit 1
        fi
    else
        log "❌ Backup failed!"
        exit 1
    fi

    # Unset password environment variable
    unset PGPASSWORD
}

# Function to create backup metadata
create_metadata() {
    local metadata_file="$BACKUP_DIR/backup_${TIMESTAMP}.json"

    cat > "$metadata_file" << EOF
{
    "timestamp": "$(date -Iseconds)",
    "database": "$DB_NAME",
    "host": "$DB_HOST",
    "user": "$DB_USER",
    "backup_file": "$BACKUP_FILE",
    "backup_path": "$BACKUP_PATH",
    "backup_size": "$(stat -f%z "$BACKUP_PATH" 2>/dev/null || stat -c%s "$BACKUP_PATH")",
    "retention_days": $RETENTION_DAYS
}
EOF

    log "✅ Backup metadata created: $metadata_file"
}

# Main execution
main() {
    log "=== Planerix Database Backup Script Started ==="

    # Check if required environment variables are set
    if [[ -z "${DB_NAME:-}" || -z "${DB_USER:-}" || -z "${DB_PASSWORD:-}" ]]; then
        log "❌ Required environment variables not set"
        log "Required: POSTGRES_DB, POSTGRES_USER, POSTGRES_PASSWORD"
        exit 1
    fi

    # Check if pg_dump is available
    if ! command -v pg_dump &> /dev/null; then
        log "❌ pg_dump command not found"
        exit 1
    fi

    # Create backup
    create_backup

    # Create metadata
    create_metadata

    # Cleanup old backups
    cleanup_old_backups

    log "=== Backup Script Completed Successfully ==="
}

# Run main function
main "$@"