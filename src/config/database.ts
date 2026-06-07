import { PrismaClient } from '@prisma/client'

// =============================================================================
// Prisma Client Singleton
// =============================================================================
//
// Padrão singleton para evitar múltiplas instâncias do PrismaClient em
// ambiente de desenvolvimento com hot-reload (tsx watch). Em produção,
// o módulo é carregado uma única vez e a instância persiste durante a vida
// do processo.
//
// ── Estratégia de isolamento multi-tenant (company_id) ────────────────────
//
// O isolamento dos dados por empresa opera em DUAS camadas independentes:
//
// CAMADA 1 — Repository Layer (ATIVA desde Etapa 2):
//   Todos os repositories recebem companyId como parâmetro obrigatório
//   e incluem `where: { company_id: companyId }` em todas as queries.
//   O TypeScript strict garante em tempo de compilação que companyId
//   nunca é omitido. Sem filtro de empresa → erro de compilação.
//
// CAMADA 2 — RLS PostgreSQL (PREPARADA — ativação após validação técnica):
//   Após validação do comportamento de SET LOCAL com Supabase/PgBouncer,
//   será adicionado um Prisma middleware ou extensão ($extends) que executa:
//
//     await prisma.$executeRaw`
//       SELECT set_config('app.current_company_id', ${companyId}, true)
//     `
//
//   ...antes de cada query, garantindo isolamento no próprio banco mesmo
//   em caso de bug no código da aplicação.
//
//   A validação técnica necessária:
//   - Confirmar que SET LOCAL persiste corretamente por transação no pooler
//   - Confirmar que o usuário `app_user` tem as políticas RLS configuradas
//   - Testar comportamento com conexões pooled do Supabase
//
// @see ADR-003 — Estratégia de segurança multicamadas
// =============================================================================

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined
}

function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ]
        : [
            { emit: 'stdout', level: 'warn' },
            { emit: 'stdout', level: 'error' },
          ],
    errorFormat: 'minimal',
  })
}

// Em desenvolvimento, reutiliza a instância entre reloads do tsx watch.
// Em produção, cria uma única instância que persiste no processo.
export const prisma: PrismaClient =
  globalThis.__prisma ?? createPrismaClient()

if (process.env['NODE_ENV'] !== 'production') {
  globalThis.__prisma = prisma
}