import Fastify, { type FastifyInstance } from 'fastify'
import { randomUUID } from 'node:crypto'
import { env } from '@/config/env'
import { prisma } from '@/config/database'
import { pinoConfig } from '@/shared/utils/logger'
import { corsPlugin } from '@/shared/plugins/cors'
import { helmetPlugin } from '@/shared/plugins/helmet'
import { rateLimitPlugin } from '@/shared/plugins/rate-limit'
import { swaggerPlugin } from '@/shared/plugins/swagger'
import { errorHandlerPlugin } from '@/shared/plugins/error-handler'
import { multipartPlugin } from '@/shared/plugins/multipart'
import { auditRoutes } from '@/modules/audit/audit.routes'

// =============================================================================
// Factory da Aplicacao Fastify
// =============================================================================
//
// Ordem de registro:
//   1. Plugins de infraestrutura (helmet, cors, rate-limit, multipart, swagger)
//   2. Error handler (captura erros de tudo abaixo)
//   3. Hook onSend (X-Request-ID em todas as respostas)
//   4. Rota /health (publica, sem autenticacao)
//   5. Modulos de negocio (cada um com seu prefixo e autenticacao proprios)
//
// Modulos registrados:
//   /audit         → Etapa 5  (admin, super_admin)
//   /clients       → Etapa 9  (pendente)
//   /chairs        → Etapa 10 (pendente)
//   /reservations  → Etapa 11 (pendente)
//   /schedule      → Etapa 13 (pendente)
//   /deliveries    → Etapa 14 (pendente)
//   /financial     → Etapa 15 (pendente)
//   /webhooks      → Etapa 16 (pendente)
//   /contracts     → Etapa 17 (pendente)
//   /partners      → Etapa 19 (pendente)
//   /commissions   → Etapa 20 (pendente)
//   /reports       → Etapa 22 (pendente)
// =============================================================================

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: pinoConfig,
    genReqId: () => randomUUID(),
    trustProxy: true,
    connectionTimeout: 30_000,
    bodyLimit: 5 * 1024 * 1024,
  })

  // ── Plugins de infraestrutura ──────────────────────────────────────────────
  await app.register(helmetPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(multipartPlugin)
  await app.register(swaggerPlugin)
  await app.register(errorHandlerPlugin)

  // ── Hook: X-Request-ID em todas as respostas ───────────────────────────────
  app.addHook('onSend', (_request, reply, _payload, done) => {
    void reply.header('X-Request-ID', _request.id)
    done()
  })

  // ── Rota publica: Health Check ─────────────────────────────────────────────
  app.get(
    '/health',
    {
      config: { rateLimit: false },
      schema: {
        description: 'Health check da aplicacao e conexao com o banco',
        tags: ['Health'],
        security: [],
        response: {
          200: {
            type: 'object',
            properties: {
              success:     { type: 'boolean' },
              status:      { type: 'string' },
              database:    { type: 'string' },
              environment: { type: 'string' },
              timestamp:   { type: 'string' },
            },
          },
          503: {
            type: 'object',
            properties: {
              success:     { type: 'boolean' },
              status:      { type: 'string' },
              database:    { type: 'string' },
              environment: { type: 'string' },
              timestamp:   { type: 'string' },
            },
          },
        },
      },
    },
    async (_request, reply) => {
      let databaseStatus = 'healthy'
      let httpStatus = 200

      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        databaseStatus = 'unhealthy'
        httpStatus = 503
      }

      return reply.status(httpStatus).send({
        success:     httpStatus === 200,
        status:      httpStatus === 200 ? 'healthy' : 'degraded',
        database:    databaseStatus,
        environment: env.NODE_ENV,
        timestamp:   new Date().toISOString(),
      })
    },
  )

  // ── Modulos de negocio ─────────────────────────────────────────────────────
  // Etapa 5: Audit
  await app.register(auditRoutes, { prefix: '/audit' })

  // Etapas futuras — descomentados conforme forem implementados:
  // await app.register(clientRoutes,      { prefix: '/clients' })
  // await app.register(chairRoutes,       { prefix: '/chairs' })
  // await app.register(reservationRoutes, { prefix: '/reservations' })
  // await app.register(scheduleRoutes,    { prefix: '/schedule' })
  // await app.register(deliveryRoutes,    { prefix: '/deliveries' })
  // await app.register(financialRoutes,   { prefix: '/financial' })
  // await app.register(webhookRoutes,     { prefix: '/webhooks' })
  // await app.register(contractRoutes,    { prefix: '/contracts' })
  // await app.register(partnerRoutes,     { prefix: '/partners' })
  // await app.register(commissionRoutes,  { prefix: '/commissions' })
  // await app.register(reportRoutes,      { prefix: '/reports' })

  return app
}