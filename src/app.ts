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
import { clientRoutes } from '@/modules/clients/clients.routes'
import { chairRoutes } from '@/modules/chairs/chairs.routes'
import { reservationRoutes } from '@/modules/reservations/reservations.routes'
import { availabilityRoutes } from '@/modules/availability/routes/availability.routes'
import { deliveryRoutes } from '@/modules/deliveries/deliveries.routes'
import { partnerRoutes } from '@/modules/partners/routes/partner.routes'

import { financialRoutes } from '@/modules/financial/financial.routes'
import { commissionRoutes } from '@/modules/commissions/routes/commission.routes'


export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger:            pinoConfig,
    genReqId:          () => randomUUID(),
    trustProxy:        true,
    connectionTimeout: 30_000,
    bodyLimit:         5 * 1024 * 1024,
  })

  await app.register(helmetPlugin)
  await app.register(corsPlugin)
  await app.register(rateLimitPlugin)
  await app.register(multipartPlugin)
  await app.register(swaggerPlugin)
  await app.register(errorHandlerPlugin)

  app.addHook('onSend', (_request, reply, _payload, done) => {
    void reply.header('X-Request-ID', _request.id)
    done()
  })

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
      } catch (error) {
        databaseStatus = 'unhealthy'
        httpStatus     = 503
        app.log.error({ err: error }, 'Health check: falha na conexao com o banco de dados.')
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

  await app.register(auditRoutes,   { prefix: '/audit' })
  await app.register(meRoutes)
  await app.register(userRoutes,    { prefix: '/users' })
  await app.register(companyRoutes, { prefix: '/companies' })
  await app.register(clientRoutes,      { prefix: '/clients' })
  await app.register(chairRoutes,       { prefix: '/chairs' })
  await app.register(reservationRoutes, { prefix: '/reservations' })
  await app.register(availabilityRoutes, { prefix: '/availability' })
  await app.register(deliveryRoutes,    { prefix: '/deliveries' })
  await app.register(partnerRoutes,     { prefix: '/partners' })
  await app.register(commissionRoutes, { prefix: '/commissions' })
  await app.register(financialRoutes,   { prefix: '/financial' })

  return app
}
