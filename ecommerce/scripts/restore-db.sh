#!/usr/bin/env bash
# F6.10: restaura um dump gerado por backup-db.sh. Uso: ./restore-db.sh backups/vitrine-XXXX.sql.gz
set -euo pipefail

FILE="${1:?Uso: restore-db.sh <arquivo.sql.gz>}"
[ -f "$FILE" ] || { echo "Arquivo não encontrado: $FILE" >&2; exit 1; }

echo "[restore] isso substitui os dados atuais do banco. Confirme (digite 'sim'):"
read -r CONFIRM
[ "$CONFIRM" = "sim" ] || { echo "Cancelado."; exit 1; }

gunzip -c "$FILE" | docker compose exec -T postgres psql -U "${POSTGRES_USER:-vitrine}" -d "${POSTGRES_DB:-vitrine}"
echo "[restore] concluído."
