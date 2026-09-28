#!/bin/bash
set -euo pipefail

# Diretório base
BASE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKUP_DIR="${BACKUP_DIR:-$HOME/backups/postgres}"
TIMESTAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_FILE="$BACKUP_DIR/rm_frotas_${TIMESTAMP}.sql.gz"
CONTAINER_NAME="rm-frotas-db"
DB_NAME="rm_frotas"
DB_USER="postgres"
RETENTION_DAYS=7

mkdir -p "$BACKUP_DIR"

echo "=== [$(date)] Iniciando Backup do PostgreSQL ($DB_NAME) ==="

# 1. Verifica se o container do banco está rodando
if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  echo "ERRO: Container $CONTAINER_NAME não está em execução!" >&2
  exit 1
fi

# 2. Executa o pg_dump compactado
echo "1. Gerando dump compactado em: $BACKUP_FILE"
docker exec "$CONTAINER_NAME" pg_dump -U "$DB_USER" "$DB_NAME" | gzip > "$BACKUP_FILE"

# Verifica se o arquivo foi gerado e não está vazio
if [ ! -s "$BACKUP_FILE" ]; then
  echo "ERRO: O arquivo de backup gerado está vazio ou não foi criado!" >&2
  rm -f "$BACKUP_FILE"
  exit 1
fi

FILESIZE=$(du -h "$BACKUP_FILE" | cut -f1)
echo "Backup local concluído com sucesso! Tamanho: $FILESIZE"

# 3. Rotação: Remove backups locais com mais de $RETENTION_DAYS dias
echo "2. Aplicando política de retenção local ($RETENTION_DAYS dias)..."
find "$BACKUP_DIR" -type f -name "rm_frotas_*.sql.gz" -mtime +"$RETENTION_DAYS" -exec rm -f {} \;

# 4. Envio Externo para Neon (Disaster Recovery frio), se configurado
# Lê do .env caso exista
if [ -f "$BASE_DIR/.env" ]; then
  # Extrai NEON_BACKUP_DATABASE_URL sem exportar o arquivo inteiro
  NEON_URL=$(grep -E '^NEON_BACKUP_DATABASE_URL=' "$BASE_DIR/.env" | cut -d '=' -f2- | tr -d '"' | tr -d "'" || true)
fi

NEON_URL="${NEON_BACKUP_DATABASE_URL:-${NEON_URL:-}}"

if [ -n "$NEON_URL" ]; then
  echo "3. Sincronizando backup para o banco externo (Neon)..."
  # Restaura o dump limpo no Neon usando psql com suporte a SSL
  if gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql "$NEON_URL" > /dev/null 2>&1; then
    echo "Sincronização externa (Neon) concluída com sucesso!"
  else
    echo "AVISO: Falha ao enviar backup para Neon. O backup local está seguro em $BACKUP_FILE." >&2
  fi
else
  echo "3. NEON_BACKUP_DATABASE_URL não configurada. Backup mantido apenas localmente na VM."
fi

echo "=== [$(date)] Backup finalizado com sucesso! ==="
