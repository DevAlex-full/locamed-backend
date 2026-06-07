import { type FastifyInstance, type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import { sendPaginated } from '@/shared/utils/response'
import { auditService } from './audit.service'
import { auditFiltersSchema } from './audit.schema'

// =============================================================================
// Audit Routes
// =============================================================================
//
// Prefixo registrado em app.ts: /audit
// Rotas disponiveis:
//   GET  /audit
//   GET  /audit/entity/:entity/:entityId
// =============================================================================

export const auditRoutes: FastifyPluginCallback = (
  app: FastifyInstance,
  _opts,
  done,
): void => {
  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['Audit'],
        summary: 'Listar logs de auditoria',
        description:
          'Retorna o historico de operacoes auditadas com suporte a filtros por acao, entidade, usuario e intervalo de data.',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            action: {
              type: 'string',
              description:
                'Tipo de acao (CREATE, UPDATE, DELETE, LOGIN, LOGOUT, PAYMENT, CONTRACT, VIEW, EXPORT)',
            },
            entity: {
              type: 'string',
              description: 'Nome da entidade auditada',
            },
            userId: {
              type: 'string',
              format: 'uuid',
              description: 'UUID do usuario que realizou a acao',
            },
            entityId: {
              type: 'string',
              description: 'ID da entidade afetada',
            },
            dateFrom: {
              type: 'string',
              format: 'date-time',
              description: 'Data inicial ISO 8601',
            },
            dateTo: {
              type: 'string',
              format: 'date-time',
              description: 'Data final ISO 8601',
            },
            page: {
              type: 'integer',
              minimum: 1,
              default: 1,
            },
            limit: {
              type: 'integer',
              minimum: 1,
              maximum: 100,
              default: 20,
            },
          },
        },
      },
    },
    async (request, reply) => {
      const filters = auditFiltersSchema.parse(request.query)

      const result = await auditService.findAll(
        request.user!.companyId,
        filters,
      )

      return sendPaginated(reply, result)
    },
  )

  app.get(
    '/entity/:entity/:entityId',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags: ['Audit'],
        summary: 'Historico de uma entidade',
        description:
          'Retorna todos os logs de auditoria de um registro especifico.',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['entity', 'entityId'],
          properties: {
            entity: {
              type: 'string',
              description: 'Nome da tabela',
            },
            entityId: {
              type: 'string',
              description: 'ID do registro',
            },
          },
        },
      },
    },
    async (request, reply) => {
      const { entity, entityId } = request.params as {
        entity: string
        entityId: string
      }

      const logs = await auditService.findByEntity(
        request.user!.companyId,
        entity,
        entityId,
      )

      return reply.status(200).send({
        success: true,
        data: logs,
      })
    },
  )

  done()
}