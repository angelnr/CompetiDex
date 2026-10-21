#!/bin/sh
# Mantenimiento diario de la BBDD SQLite:
#   1. borra sesiones caducadas
#   2. crea un backup consistente con la API de backup de SQLite (segura en WAL)
#   3. verifica la integridad del backup
#   4. rota backups antiguos
#
# Lo invoca el servicio `db-maintenance` de docker-compose.yml.
set -eu

DB_PATH="${DATABASE_PATH:-/data/prod.db}"
BACKUP_DIR="${BACKUP_DIR:-/data/backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

node /app/scripts/session-cleanup.mjs

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/prod-$STAMP.db"

echo "[maintenance] backup -> $BACKUP_FILE"
sqlite3 "$DB_PATH" ".backup '$BACKUP_FILE'"

CHECK="$(sqlite3 "$BACKUP_FILE" 'PRAGMA integrity_check;')"
if [ "$CHECK" != "ok" ]; then
  echo "[maintenance] integrity_check falló: $CHECK" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi
echo "[maintenance] integrity_check ok"

find "$BACKUP_DIR" -name 'prod-*.db' -type f -mtime +"$RETENTION_DAYS" -exec rm -f {} \;
echo "[maintenance] backups con más de $RETENTION_DAYS días eliminados"
