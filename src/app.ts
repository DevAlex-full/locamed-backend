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
import { meRoutes, userRoutes } from '@/modules/users/users.routes'
import { companyRoutes } from '@/modules/companies/companies.routes'

// =============================================================================
// Factory da Aplicacao Fastify
// =============================================================================
//
// Ordem de registro:
//   1. Plugins de infraestrutura (helmet, cors, rate-limit, multipart, swagger)
//   2. Error handler (captura erros de tudo abaixo)
//   3. Hook onSend (X-Request-ID em todas as respostas)
//   4. Rota publica /health
//   5. Modulos de negocio (cada um com prefixo e autorizacao proprios)
//
// Modulos ativos:
//   GET  /me                    → Etapa 6 (meRoutes)
//   GET  /users                 → Etapa 6 (userRoutes)
//   GET  /users/:id             → Etapa 6 (userRoutes)
//   PATCH /users/:id            → Etapa 6 (userRoutes)
//   GET  /companies/current     → Etapa 6 (companyRoutes)
//   PATCH /companies/current    → Etapa 6 (companyRoutes)
//   GET  /audit                 → Etapa 5 (auditRoutes)
//   GET  /audit/entity/:e/:id   → Etapa 5 (auditRoutes)
//
// Modulos pendentes (descomentados conforme implementados):
//   /clients       → Etapa 9
//   /chairs        → Etapa 10
//   /reservations  → Etapa 11
//   /schedule      → Etapa 13
//   /deliveries    → Etapa 14
//   /financial     → Etapa 15
//   /webhooks      → Etapa 16
//   /contracts     → Etapa 17
//   /partners      → Etapa 19
//   /commissions   → Etapa 20
//   /reports       → Etapa 22
// =============================================================================

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:            pinoConfig,
    genReqId:          () => randomUUID(),
    trustProxy:        true,
    connectionTimeout: 30_000,
    bodyLimit:         5 * 1024 * 1024,
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
        tags:        ['Health'],
        security:    [],
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
      let httpStatus     = 200

      try {
        await prisma.$queryRaw`SELECT 1`
      } catch {
        databaseStatus = 'unhealthy'
        httpStatus     = 503
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

  // Etapa 5: Auditoria
  await app.register(auditRoutes, { prefix: '/audit' })

  // Etapa 6: Usuarios — /me registrado sem prefixo (rota raiz)
  await app.register(meRoutes)
  await app.register(userRoutes,    { prefix: '/users' })
  await app.register(companyRoutes, { prefix: '/companies' })

  // Etapas futuras:
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