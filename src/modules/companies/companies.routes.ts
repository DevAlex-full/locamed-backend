import { type FastifyPluginCallback } from 'fastify'
import { authenticate } from '@/shared/middleware/authenticate'
import { authorize } from '@/shared/middleware/authorize'
import { UserRoles } from '@/shared/types/common'
import { sendSuccess } from '@/shared/utils/response'
import { companiesService } from './companies.service'
import { updateCompanyBodySchema } from './companies.schema'

// =============================================================================
// Companies Routes
// =============================================================================
//
// Registrado com prefixo /companies em app.ts.
// Gera:
//   GET  /companies/current → qualquer usuario autenticado
//   PATCH /companies/current → apenas admin e super_admin
//
// Por que FastifyPluginCallback e nao async function?
//   Mesmo motivo de users.routes.ts: registro de rotas e sincrono.
//   `async` sem `await` no corpo do plugin dispara require-await no ESLint.
//   `FastifyPluginCallback` com `done()` e o padrao correto para plugins sincronos.
//
// /current como rota fixa (sem :id variavel):
//   Elimina IDOR — o backend sempre usa request.user.companyId (do JWT).
//   O usuario nao controla qual empresa e acessada via URL.
// =============================================================================

export const companyRoutes: FastifyPluginCallback = (app, _opts, done) => {
  // GET /companies/current — qualquer usuario autenticado pode ver a propria empresa
  app.get(
    '/current',
    {
      preHandler: [authenticate],
      schema: {
        tags:        ['Companies'],
        summary:     'Dados da empresa atual',
        description: 'Retorna os dados completos da empresa do usuario autenticado. Disponivel para todos os perfis.',
        security:    [{ BearerAuth: [] }],
        response: {
          200: {
            description: 'Dados da empresa',
            type:        'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  id:           { type: 'string', format: 'uuid' },
                  name:         { type: 'string' },
                  document:     { type: 'string' },
                  email:        { type: 'string', format: 'email' },
                  phone:        { type: 'string', nullable: true },
                  address:      { type: 'string', nullable: true },
                  number:       { type: 'string', nullable: true },
                  complement:   { type: 'string', nullable: true },
                  neighborhood: { type: 'string', nullable: true },
                  city:         { type: 'string', nullable: true },
                  state:        { type: 'string', nullable: true },
                  zipCode:      { type: 'string', nullable: true },
                  plan:         { type: 'string' },
                  active:       { type: 'boolean' },
                  settings:     { type: 'object' },
                  createdAt:    { type: 'string', format: 'date-time' },
                  updatedAt:    { type: 'string', format: 'date-time' },
                },
              },
            },
          },
        },
      },
    },
    async (request, reply) => {
      const result = await companiesService.getCurrent(request.user!.companyId)
      return sendSuccess(reply, result)
    },
  )

  // PATCH /companies/current — apenas admin e super_admin
  app.patch(
    '/current',
    {
      preHandler: [
        authenticate,
        authorize([UserRoles.ADMIN, UserRoles.SUPER_ADMIN]),
      ],
      schema: {
        tags:        ['Companies'],
        summary:     'Atualizar dados da empresa',
        description: 'Atualiza os dados cadastrais da empresa. CNPJ, plan e active nao podem ser alterados por esta rota.',
        security:    [{ BearerAuth: [] }],
        body: {
          type: 'object',
          properties: {
            name:         { type: 'string' },
            email:        { type: 'string', format: 'email' },
            phone:        { type: 'string', nullable: true },
            address:      { type: 'string', nullable: true },
            number:       { type: 'string', nullable: true },
            complement:   { type: 'string', nullable: true },
            neighborhood: { type: 'string', nullable: true },
            city:         { type: 'string', nullable: true },
            state:        { type: 'string', nullable: true },
            zipCode:      { type: 'string', nullable: true },
          },
        },
      },
    },
    async (request, reply) => {
      const body   = updateCompanyBodySchema.parse(request.body)
      const result = await companiesService.updateCurrent(
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