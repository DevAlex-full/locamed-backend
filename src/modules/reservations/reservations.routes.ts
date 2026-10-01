import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
} from '@/shared/utils/response'
import { reservationsService } from './reservations.service'
import {
  createReservationBodySchema,
  updateReservationStatusSchema,
  listReservationsQuerySchema,
  reservationParamsSchema,
} from './reservations.schema'

// =============================================================================
// Reservations Routes
// =============================================================================
//
// Prefixo em app.ts: /reservations
//
//   GET    /reservations              → lista paginada com filtros
//   POST   /reservations              → criar reserva (anti-overbooking)
//   GET    /reservations/:id          → buscar por ID
//   PATCH  /reservations/:id/status   → atualizar status
//   DELETE /reservations/:id          → soft delete (apenas pending)
// =============================================================================

export const reservationRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // GET /reservations
  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Reservations'],
        summary: 'Listar reservas',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            clientId: { type: 'string', format: 'uuid' },
            chairId:  { type: 'string', format: 'uuid' },
            status:   { type: 'string' },
            page:     { type: 'integer', minimum: 1, default: 1 },
            limit:    { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const filters = listReservationsQuerySchema.parse(request.query)
      const result  = await reservationsService.findAll(
        request.user!.companyId,
        filters,
      )
      return sendPaginated(reply, result)
    },
  )

  // POST /reservations
  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Reservations'],
        summary: 'Criar reserva com anti-overbooking',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['clientId', 'chairId', 'startDate', 'endDate', 'dailyRate'],
          properties: {
            clientId:      { type: 'string', format: 'uuid' },
            chairId:       { type: 'string', format: 'uuid' },
            partnerId:     { type: 'string', format: 'uuid', nullable: true },
            startDate:     { type: 'string' },
            endDate:       { type: 'string' },
            dailyRate:     { type: 'number' },
            discount:      { type: 'number' },
            paymentMethod: { type: 'string', nullable: true },
            notes:         { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const body   = createReservationBodySchema.parse(request.body)
      const result = await reservationsService.create(
        request.user!.companyId,
        body,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendCreated(reply, result, 'Reserva criada com sucesso.')
    },
  )

  // GET /reservations/:id
  app.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Reservations'],
        summary: 'Buscar reserva por ID',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = reservationParamsSchema.parse(request.params)
      const result  = await reservationsService.findById(id, request.user!.companyId)
      return sendSuccess(reply, result)
    },
  )

  // PATCH /reservations/:id/status
  app.patch(
    '/:id/status',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Reservations'],
        summary: 'Atualizar status da reserva',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          required: ['status'],
          properties: { status: { type: 'string' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = reservationParamsSchema.parse(request.params)
      const body    = updateReservationStatusSchema.parse(request.body)
      const result  = await reservationsService.updateStatus(
        id,
        request.user!.companyId,
        body,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendSuccess(reply, result)
    },
  )

  // DELETE /reservations/:id (apenas pending)
  app.delete(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags:        ['Reservations'],
        summary:     'Remover reserva (apenas status pending)',
        description: 'Soft delete. Libera a poltrona. Somente reservas pending.',
        security:    [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = reservationParamsSchema.parse(request.params)
      await reservationsService.remove(
        id,
        request.user!.companyId,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendNoContent(reply)
    },
  )

  done()
}