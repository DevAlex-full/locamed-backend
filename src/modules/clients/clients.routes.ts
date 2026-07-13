import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import { sendSuccess, sendCreated, sendNoContent, sendPaginated } from '@/shared/utils/response'
import { clientsService } from './clients.service'
import {
  createClientBodySchema,
  updateClientBodySchema,
  listClientsQuerySchema,
  clientParamsSchema,
} from './clients.schema'

// =============================================================================
// Clients Routes — CRUD completo
// =============================================================================
//
// Prefixo registrado em app.ts: /clients
//
// Rotas:
//   GET    /clients        → lista paginada (admin, operator)
//   POST   /clients        → criar cliente (admin, operator)
//   GET    /clients/:id    → buscar por ID (admin, operator)
//   PATCH  /clients/:id    → atualizar (admin, operator)
//   DELETE /clients/:id    → soft delete (admin)
//
// Autorizacao:
//   Leitura e escrita: admin e operator
//   Delete: apenas admin (operadores nao podem excluir)
//
// Padrao FastifyPluginCallback + done():
//   Registro de rotas e sincrono — usar async sem await dispararia require-await.
// =============================================================================

export const clientRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // ── GET /clients — listagem paginada ────────────────────────────────────────
  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Clients'],
        summary: 'Listar clientes da empresa',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            search: { type: 'string', description: 'Busca por nome, CPF ou telefone' },
            page:   { type: 'integer', minimum: 1, default: 1 },
            limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const filters = listClientsQuerySchema.parse(request.query)
      const result  = await clientsService.findAll(request.user!.companyId, filters)
      return sendPaginated(reply, result)
    },
  )

  // ── POST /clients — criar cliente ────────────────────────────────────────────
  app.post(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Clients'],
        summary: 'Criar novo cliente',
        security: [{ BearerAuth: [] }],
        body: {
          type: 'object',
          required: ['name', 'cpf', 'phone'],
          properties: {
            name:         { type: 'string' },
            cpf:          { type: 'string' },
            rg:           { type: 'string', nullable: true },
            birthDate:    { type: 'string', nullable: true },
            phone:        { type: 'string' },
            whatsapp:     { type: 'string', nullable: true },
            email:        { type: 'string', nullable: true },
            zipCode:      { type: 'string', nullable: true },
            address:      { type: 'string', nullable: true },
            number:       { type: 'string', nullable: true },
            complement:   { type: 'string', nullable: true },
            neighborhood: { type: 'string', nullable: true },
            city:         { type: 'string', nullable: true },
            state:        { type: 'string', nullable: true },
            doctor:       { type: 'string', nullable: true },
            hospital:     { type: 'string', nullable: true },
            surgeryDate:  { type: 'string', nullable: true },
            notes:        { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const body   = createClientBodySchema.parse(request.body)
      const result = await clientsService.create(
        request.user!.companyId,
        body,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendCreated(reply, result, 'Cliente criado com sucesso.')
    },
  )

  // ── GET /clients/:id — buscar por ID ────────────────────────────────────────
  app.get(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Clients'],
        summary: 'Buscar cliente por ID',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = clientParamsSchema.parse(request.params)
      const result  = await clientsService.findById(id, request.user!.companyId)
      return sendSuccess(reply, result)
    },
  )

  // ── PATCH /clients/:id — atualizar ──────────────────────────────────────────
  app.patch(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN, UserRoles.OPERATOR]),
      ],
      schema: {
        tags:    ['Clients'],
        summary: 'Atualizar cliente',
        security: [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
        body: {
          type: 'object',
          properties: {
            name:         { type: 'string' },
            cpf:          { type: 'string' },
            rg:           { type: 'string', nullable: true },
            birthDate:    { type: 'string', nullable: true },
            phone:        { type: 'string' },
            whatsapp:     { type: 'string', nullable: true },
            email:        { type: 'string', nullable: true },
            zipCode:      { type: 'string', nullable: true },
            address:      { type: 'string', nullable: true },
            number:       { type: 'string', nullable: true },
            complement:   { type: 'string', nullable: true },
            neighborhood: { type: 'string', nullable: true },
            city:         { type: 'string', nullable: true },
            state:        { type: 'string', nullable: true },
            doctor:       { type: 'string', nullable: true },
            hospital:     { type: 'string', nullable: true },
            surgeryDate:  { type: 'string', nullable: true },
            notes:        { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = clientParamsSchema.parse(request.params)
      const body    = updateClientBodySchema.parse(request.body)
      const result  = await clientsService.update(
        id,
        request.user!.companyId,
        body,
        request.user!,
        { ip: request.ip, userAgent: request.headers['user-agent'] ?? null },
      )
      return sendSuccess(reply, result)
    },
  )

  // ── DELETE /clients/:id — soft delete (admin apenas) ────────────────────────
  app.delete(
    '/:id',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags:        ['Clients'],
        summary:     'Remover cliente (soft delete)',
        description: 'Define deleted_at para o timestamp atual. Dados historicos preservados.',
        security:    [{ BearerAuth: [] }],
        params: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'string', format: 'uuid' } },
        },
      },
    },
    async (request, reply) => {
      const { id } = clientParamsSchema.parse(request.params)
      await clientsService.remove(
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