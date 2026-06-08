import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import { sendSuccess, sendPaginated } from '@/shared/utils/response'
import { usersService } from './users.service'
import {
  updateUserBodySchema,
  listUsersQuerySchema,
  userParamsSchema,
} from './users.schema'

// =============================================================================
// Users Routes
// =============================================================================
//
// Exporta dois FastifyPluginCallback:
//
//   meRoutes   → registrado sem prefixo em app.ts → gera GET /me
//   userRoutes → registrado com prefixo /users    → gera GET /users
//                                                         GET /users/:id
//                                                         PATCH /users/:id
//
// Por que FastifyPluginCallback e nao async function?
//   O registro das rotas (app.get, app.patch) e sincrono.
//   Usar `async` sem `await` no corpo do plugin dispara require-await no ESLint.
//   O padrao correto para plugins sincronos no Fastify e o callback com done():
//     (app, _opts, done) => { app.get(...); done() }
//   O done() sinaliza ao Avvio que o plugin foi inicializado.
//   Sem ele: AVV_ERR_PLUGIN_EXEC_TIMEOUT.
//   Os HANDLERS das rotas (funcoes passadas ao app.get) continuam async normalmente.
//
// request.user! (non-null assertion):
//   Seguro — authenticate() executa antes via preHandler e garante request.user.
// =============================================================================

// ── GET /me ──────────────────────────────────────────────────────────────────
export const meRoutes: FastifyPluginCallback = (app, _opts, done) => {
  app.get(
    '/me',
    {
      preHandler: [authenticate],
      schema: {
        tags:        ['Users'],
        summary:     'Dados do usuario autenticado',
        description: 'Retorna os dados do usuario autenticado e informacoes basicas da empresa.',
        security:    [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Dados do usuario e empresa',
            type:        'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  user: {
                    type: 'object',
                    properties: {
                      id:        { type: 'string', format: 'uuid' },
                      companyId: { type: 'string', format: 'uuid' },
                      name:      { type: 'string' },
                      email:     { type: 'string', format: 'email' },
                      role:      { type: 'string' },
                      phone:     { type: 'string', nullable: true },
                      avatarUrl: { type: 'string', nullable: true },
                      active:    { type: 'boolean' },
                      createdAt: { type: 'string', format: 'date-time' },
                      updatedAt: { type: 'string', format: 'date-time' },
                    },
                  },
                  company: {
                    type: 'object',
                    properties: {
                      id:     { type: 'string', format: 'uuid' },
                      name:   { type: 'string' },
                      plan:   { type: 'string' },
                      active: { type: 'boolean' },
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await usersService.getMe(
        request.user!.id,
        request.user!.companyId,
      )
      return sendSuccess(reply, result)
    },
  )

  done()
}

// ── GET /users, GET /users/:id, PATCH /users/:id ─────────────────────────────
export const userRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // GET /users — listagem (admin e super_admin)
  app.get(
    '/',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags:     ['Users'],
        summary:  'Listar usuarios da empresa',
        security: [{ BearerAuth: [] }],
        querystring: {
          type: 'object',
          properties: {
            role:   { type: 'string', description: 'Filtrar por role' },
            active: { type: 'boolean', description: 'Filtrar por status ativo' },
            search: { type: 'string', description: 'Busca parcial por nome' },
            page:   { type: 'integer', minimum: 1, default: 1 },
            limit:  { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          },
        },
      },
    },
    async (request, reply) => {
      const filters = listUsersQuerySchema.parse(request.query)
      const result  = await usersService.findAll(request.user!.companyId, filters)
      return sendPaginated(reply, result)
    },
  )

  // GET /users/:id — admin ou o proprio usuario
  app.get(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags:     ['Users'],
        summary:  'Buscar usuario por ID',
        security: [{ BearerAuth: [] }],
        params: {
          type:     'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = userParamsSchema.parse(request.params)
      const result  = await usersService.findById(
        id,
        request.user!.companyId,
        request.user!,
      )
      return sendSuccess(reply, result)
    },
  )

  // PATCH /users/:id — admin ou o proprio usuario
  app.patch(
    '/:id',
    {
      preHandler: [authenticate],
      schema: {
        tags:        ['Users'],
        summary:     'Atualizar usuario',
        description: 'Admin pode alterar qualquer campo incluindo role e active. Usuario comum so pode alterar name, phone e avatarUrl de si mesmo.',
        security:    [{ BearerAuth: [] }],
        params: {
          type:     'object',
          required: ['id'],
          properties: {
            id: { type: 'string', format: 'uuid' },
          },
        },
        body: {
          type: 'object',
          properties: {
            name:      { type: 'string' },
            phone:     { type: 'string', nullable: true },
            avatarUrl: { type: 'string', nullable: true },
            role:      { type: 'string' },
            active:    { type: 'boolean' },
          },
        },
      },
    },
    async (request, reply) => {
      const { id } = userParamsSchema.parse(request.params)
      const body    = updateUserBodySchema.parse(request.body)
      const result  = await usersService.update(
        id,
        request.user!.companyId,
        body,
        request.user!,
        {
          ip:        request.ip,
          userAgent: request.headers['user-agent'] ?? null,
        },
      )
      return sendSuccess(reply, result)
    },
  )

  done()
}