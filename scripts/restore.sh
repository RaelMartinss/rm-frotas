#!/bin/bash
set -euo pipefail

if [ "$#" -ne 1 ]; then
  echo "Uso: $0 <caminho-para-o-arquivo-de-backup.sql.gz>"
  echo "Exemplo: $0 ~/backups/postgres/rm_frotas_20260928_170000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"
CONTAINER_NAME="rm-frotas-db"
DB_NAME="rm_frotas"
DB_USER="postgres"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERRO: Arquivo $BACKUP_FILE não encontrado!" >&2
  exit 1
fi

echo "⚠️  ATENÇÃO: Este comando irá restaurar o banco de dados '$DB_NAME' a partir de:"
echo "   $BACKUP_FILE"
read -r -p "Deseja continuar? [s/N] " confirm
if [[ ! "$confirm" =~ ^[sS]$ ]]; then
  echo "Operação cancelada pelo usuário."
  exit 0
fi

echo "1. Restaurando banco de dados no container $CONTAINER_NAME..."
gunzip -c "$BACKUP_FILE" | docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME"

echo "2. Restauração concluída com sucesso!"
