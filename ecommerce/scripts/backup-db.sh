#!/usr/bin/env bash
# F6.10: dump diário do Postgres — agendado por fora (cron do host, GitHub Actions agendado etc.),
# mesmo padrão já usado pelos jobs de F3.4/F3.6 (sem serviço novo no docker-compose).
set -euo pipefail

OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"

TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
OUT_FILE="$OUT_DIR/vitrine-$TIMESTAMP.sql.gz"

echo "[backup] gerando $OUT_FILE"
docker compose exec -T postgres pg_dump -U "${POSTGRES_USER:-vitrine}" -d "${POSTGRES_DB:-vitrine}" | gzip > "$OUT_FILE"
echo "[backup] concluído: $(du -h "$OUT_FILE" | cut -f1)"

# Mantém só os 7 mais recentes neste diretório
ls -1t "$OUT_DIR"/vitrine-*.sql.gz 2>/dev/null | tail -n +8 | xargs -r rm --
