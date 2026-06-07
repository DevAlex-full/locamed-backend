# =============================================================================
# Dockerfile — Backend SaaS Poltronas
# Node.js 20 + Fastify + Prisma + multi-stage build
# =============================================================================
#
# Stages:
#   base    → imagem base compartilhada (Alpine + dependencias de sistema)
#   builder → instala deps, gera Prisma Client, compila TypeScript
#   runner  → imagem final de producao (apenas artefatos necessarios)
#
# Beneficios do multi-stage:
#   - Imagem final sem devDependencies, sem codigo-fonte, sem typescript
#   - Reducao significativa do tamanho final (~300MB → ~150MB)
#   - Isolamento entre ambiente de build e producao
#   - Usuario nao-root para seguranca (principio do minimo privilegio)
# =============================================================================

# =============================================================================
# Stage 1: BASE — imagem base compartilhada
# =============================================================================
FROM node:20-alpine AS base

# Dependencias de sistema necessarias:
#   libc6-compat — compatibilidade com binarios glibc no Alpine (musl)
#   openssl      — requerido pelo Prisma para operacoes criptograficas
#   wget         — usado pelo HEALTHCHECK
RUN apk add --no-cache libc6-compat openssl wget

WORKDIR /app

# =============================================================================
# Stage 2: BUILDER — instala dependencias, gera client e compila
# =============================================================================
FROM base AS builder

WORKDIR /app

# Copiar manifestos de dependencias primeiro para aproveitar cache do Docker.
# Se package.json nao mudar, o npm ci nao re-executa nas builds seguintes.
COPY package*.json ./

# Copiar schema do Prisma antes do npm ci para que o postinstall
# (prisma generate) possa rodar corretamente se configurado.
COPY prisma ./prisma/

# Instalar TODAS as dependencias (incluindo devDependencies necessarias para build).
# --frozen-lockfile garante reproducibilidade identica entre ambientes.
RUN npm ci

# Copiar o restante do codigo-fonte.
# Feito apos npm ci para nao invalidar o cache de node_modules a cada mudanca de codigo.
COPY . .

# Gerar o Prisma Client tipado a partir do schema.
# Este passo DEVE ocorrer antes da compilacao TypeScript, pois
# os tipos gerados sao importados em database.ts e outros arquivos.
RUN npx prisma generate

# Compilar TypeScript → JavaScript (CommonJS).
# tsc compila para dist/, tsc-alias substitui aliases @/ por caminhos relativos.
RUN npm run build

# =============================================================================
# Stage 3: RUNNER — imagem de producao minima e segura
# =============================================================================
FROM base AS runner

WORKDIR /app

# Variaveis de ambiente de producao.
# Valores sensiveis (DATABASE_URL, JWT secrets etc.) sao injetados
# pelo Render via Environment Variables — NUNCA hardcoded aqui.
ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Criar usuario e grupo nao-root para executar a aplicacao.
# Principio do minimo privilegio: o processo nao tem acesso root ao container.
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 --ingroup nodejs fastify

# Copiar artefatos de producao do stage builder com ownership correto.
# Apenas o necessario para rodar a aplicacao em producao:

# 1. JavaScript compilado (saida do tsc + tsc-alias)
COPY --from=builder --chown=fastify:nodejs /app/dist ./dist

# 2. node_modules completo com Prisma Client gerado.
#    O @prisma/client gerado fica em node_modules e e necessario em runtime.
COPY --from=builder --chown=fastify:nodejs /app/node_modules ./node_modules

# 3. package.json (necessario para resolucao de modulos Node.js)
COPY --from=builder --chown=fastify:nodejs /app/package.json ./package.json

# 4. Schema e migrations do Prisma.
#    Necessario para rodar `prisma migrate deploy` como comando de pre-deploy.
COPY --from=builder --chown=fastify:nodejs /app/prisma ./prisma

# Ativar usuario nao-root antes de expor porta e definir CMD.
USER fastify

# Expor a porta da aplicacao.
# O Render mapeia automaticamente a porta definida em PORT.
EXPOSE 3333

# Health check para o Render e orquestradores de container.
# O endpoint /health verifica tanto o servidor quanto a conexao com o banco.
# --start-period=15s: aguarda a aplicacao iniciar antes de checar
# --interval=30s:     checa a cada 30 segundos em operacao normal
# --timeout=10s:      falha se nao responder em 10 segundos
# --retries=3:        3 falhas consecutivas = container unhealthy
HEALTHCHECK --interval=30s --timeout=10s --start-period=15s --retries=3 \
  CMD wget -qO- http://localhost:3333/health || exit 1

# Comando de inicializacao.
# IMPORTANTE: migrations devem rodar antes via comando de release no Render:
#   Dashboard > Service > Settings > Deploy > Pre-deploy Command:
#   "npx prisma migrate deploy"
CMD ["node", "dist/server.js"]