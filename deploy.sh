#!/bin/bash
set -euo pipefail

cd "$(dirname "$0")"

# 1. Extrai o código-fonte atualizado
if [ -f app.tar.gz ]; then
  tar -xzf app.tar.gz
  rm -f app.tar.gz
fi

# 2. Login no GHCR para publicar a imagem oficial
echo "$GHCR_TOKEN" | docker login ghcr.io -u "$GHCR_USER" --password-stdin

# 3. Build nativo no processador ARM64 da Oracle (Ampere A1)
docker build \
  -t ghcr.io/raelmartinss/rm-frotas:"$IMAGE_TAG" \
  -t ghcr.io/raelmartinss/rm-frotas:latest .

# 4. Publica a imagem ARM64 compilada no GHCR
docker push ghcr.io/raelmartinss/rm-frotas:"$IMAGE_TAG"
docker push ghcr.io/raelmartinss/rm-frotas:latest

# 5. Sobe os containers em produção
export IMAGE_TAG="$IMAGE_TAG"
docker compose up -d --wait --wait-timeout 120

docker logout ghcr.io
docker image prune -af --filter "until=168h"
