import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@/shared/utils/response'
import { FinancialService } from './services/financial.service'
import { FinancialRepository } from './repositories/financial.repository'
import { 
  financialTransactionSchema, 
  type FinancialTransactionFilters 
} from './financial.schema'

export const financialRoutes: FastifyPluginCallback = (app, _opts, done) => {
  const repository = new FinancialRepository((app as any).prisma)
  const service = new FinancialService(repository)

  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Financial'],
        summary: 'Listar transações financeiras',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            type: { type: 'string' },
            reservationId: { type: 'string', format: 'uuid' },
            page:     { type: 'integer', minimum: 1, default: 1 },
            limit:    { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const query = request.query as any
      const page = parseInt(query.page || '1')
      const limit = parseInt(query.limit || '20')
      const skip = (page - 1) * limit

      const filters: FinancialTransactionFilters = {
        status: query.status,
        type: query.type,
        reservationId: query.reservationId,
        companyId: request.user!.companyId,
      }

      const result = await service.listTransactions(
        request.user!.companyId,
        filters,
        skip,
        limit,
      )
      
      return sendPaginated(reply, result)
    },
  )

  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Financial'],
        summary: 'Criar transação financeira',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const body = financialTransactionSchema.parse(request.body)
      const result = await service.createTransaction(
        request.user!.id,
        request.user!.companyId,
        body,
      )
      return sendCreated(reply, result, 'Transação criada com sucesso.')
    },
  )

  app.patch(
    '/:id/status',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Financial'],
        summary: 'Atualizar status da transação',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as any
      const result = await service.updateTransactionStatus(
        request.user!.id,
        request.user!.companyId,
        id,
        body.status,
        body.paidAt ? new Date(body.paidAt) : undefined,
      )
      return sendSuccess(reply, result)
    },
  )

  done()
}
