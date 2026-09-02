# ---------- Stage 1: build ----------
# Compila o TypeScript e gera o client do Prisma
FROM node:24-alpine AS build

WORKDIR /app

# Copia apenas os arquivos de dependência primeiro (cache de layers do Docker:
# só reinstala node_modules se package*.json mudar)
COPY package*.json ./
COPY prisma ./prisma

RUN npm ci

# Copia o restante do código-fonte
COPY . .

# Gera o Prisma Client e compila o Nest (dist/)
RUN npx prisma generate
RUN npm run build

# Remove as devDependencies, deixando só o necessário para produção
RUN npm prune --omit=dev


# ---------- Stage 2: runtime ----------
# Imagem final, enxuta, sem ferramentas de build
FROM node:24-alpine AS runtime

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Cria um usuário não-root para rodar a aplicação (boa prática de segurança)
RUN addgroup -S nodejs && adduser -S nestjs -G nodejs

# Copia apenas o que é necessário do stage de build
COPY --from=build --chown=nestjs:nodejs /app/dist ./dist
COPY --from=build --chown=nestjs:nodejs /app/node_modules ./node_modules
COPY --from=build --chown=nestjs:nodejs /app/package*.json ./
COPY --from=build --chown=nestjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nestjs:nodejs /app/prisma7.config.ts ./prisma7.config.ts

USER nestjs

EXPOSE 3000

# Healthcheck simples: falha se a API não responder no endpoint de health
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => process.exit(r.statusCode === 200 ? 0 : 1)).on('error', () => process.exit(1))"

# Roda as migrations do Prisma e só então sobe a aplicação
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
