import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '@/shared/utils/response'
import { chairsService } from './chairs.service'
import {
  createChairBodySchema,
  updateChairBodySchema,
  listChairsQuerySchema,
  chairParamsSchema,
} from './chairs.schema'

// =============================================================================
// Chairs Routes — CRUD completo
// =============================================================================
//
// Prefixo registrado em app.ts: /chairs
//
// Rotas:
//   GET    /chairs        → lista paginada (admin, operator)
//   POST   /chairs        → criar poltrona (admin, operator)
//   GET    /chairs/:id    → buscar por ID (admin, operator)
//   PATCH  /chairs/:id    → atualizar (admin, operator)
//   DELETE /chairs/:id    → soft delete (admin apenas)
//
// Padrao FastifyPluginCallback + done():
//   Registro de rotas e sincrono — usar async sem await dispararia require-await.
// =============================================================================

export const chairRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // ── GET /chairs — listagem paginada ─────────────────────────────────────────
  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Chairs'],
        summary: 'Listar poltronas da empresa',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Busca por codigo, modelo ou fabricante' },
            status: { type: 'string', description: 'Filtro por status' },
            page:   { type: 'integer', minimum: 1, default: 1 },
            limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const filters = listChairsQuerySchema.parse(request.query)
      const result  = await chairsService.findAll(request.user!.companyId, filters)
      return sendPaginated(reply, result)
    },
  )

  // ── POST /chairs — criar poltrona ────────────────────────────────────────────
  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Chairs'],
        summary: 'Criar nova poltrona',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['code'],
          properties: {
            code:             { type: 'string' },
            patrimonyNumber:  { type: 'string', nullable: true },
            model:            { type: 'string', nullable: true },
            manufacturer:     { type: 'string', nullable: true },
            acquisitionDate:  { type: 'string', nullable: true },
            acquisitionValue: { type: 'number', nullable: true },
            status:           { type: 'string' },
            notes:            { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const body   = createChairBodySchema.parse(request.body)
      const result = await chairsService.create(
        request.user!.companyId,
        body,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendCreated(reply, result, 'Poltrona criada com sucesso.')
    },
  )

  // ── GET /chairs/:id — buscar por ID ─────────────────────────────────────────
  app.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Chairs'],
        summary: 'Buscar poltrona por ID',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = chairParamsSchema.parse(request.params)
      const result  = await chairsService.findById(id, request.user!.companyId)
      return sendSuccess(reply, result)
    },
  )

  // ── PATCH /chairs/:id — atualizar ────────────────────────────────────────────
  app.patch(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Chairs'],
        summary: 'Atualizar poltrona',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            code:             { type: 'string' },
            patrimonyNumber:  { type: 'string', nullable: true },
            model:            { type: 'string', nullable: true },
            manufacturer:     { type: 'string', nullable: true },
            acquisitionDate:  { type: 'string', nullable: true },
            acquisitionValue: { type: 'number', nullable: true },
            status:           { type: 'string' },
            notes:            { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = chairParamsSchema.parse(request.params)
      const body    = updateChairBodySchema.parse(request.body)
      const result  = await chairsService.update(
        id,
        request.user!.companyId,
        body,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendSuccess(reply, result)
    },
  )

  // ── DELETE /chairs/:id — soft delete (admin apenas) ──────────────────────────
  app.delete(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags:        ['Chairs'],
        summary:     'Remover poltrona (soft delete)',
        description: 'Define deleted_at para o timestamp atual. Historico preservado.',
        security:    [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = chairParamsSchema.parse(request.params)
      await chairsService.remove(
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