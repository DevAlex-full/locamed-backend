import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import {
  sendSuccess,
  sendCreated,
  sendPaginated,
} from '@/shared/utils/response'
import { ContractService } from './services/contracts.service'
import { ContractRepository } from './repositories/contracts.repository'
import { 
  contractSchema, 
  type ContractFilters 
} from './contracts.schema'

export const contractRoutes: FastifyPluginCallback = (app, _opts, done) => {
  const repository = new ContractRepository((app as any).prisma)
  const service = new ContractService(repository)

  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Contracts'],
        summary: 'Listar contratos',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
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

      const filters: ContractFilters = {
        reservationId: query.reservationId,
        companyId: request.user!.companyId,
      }

      const result = await service.listContracts(
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
        tags:    ['Contracts'],
        summary: 'Criar contrato para reserva',
        security: [{ BearerAuth: [] }],
      },
    },
    async (request, reply) => {
      const body = contractSchema.parse(request.body)
      const result = await service.createContract(
        request.user!.id,
        request.user!.companyId,
        body,
      )
      return sendCreated(reply, result, 'Contrato gerado com sucesso.')
    },
  )

  app.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Contracts'],
        summary: 'Buscar contrato por ID',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const result = await service.getContract(
        request.user!.companyId,
        id,
      )
      return sendSuccess(reply, result)
    },
  )

  app.patch(
    '/:id/sign',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Contracts'],
        summary: 'Assinar contrato',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            signedAt: { type: 'string', format: 'date-time' },
            signedBy: { type: 'string' },
            signatureIp: { type: 'string' },
            notes: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = request.params as { id: string }
      const body = request.body as any
      const result = await service.signContract(
        request.user!.id,
        request.user!.companyId,
        id,
        body,
      )
      return sendSuccess(reply, result)
    },
  )

  done()
}
