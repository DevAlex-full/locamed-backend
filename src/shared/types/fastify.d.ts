import { type AuthenticatedUser } from './common'

// =============================================================================
// Augmentation do FastifyRequest
// =============================================================================
//
// Adiciona o campo `user` ao request do Fastify.
// Este campo é preenchido pelo middleware `authenticate.ts` (Etapa 4)
// após validação bem-sucedida do JWT.
//
// O campo é opcional porque rotas públicas (como /health e /webhooks/asaas)
// não passam pelo middleware de autenticação e não terão `user` definido.
//
// Em rotas protegidas, após o middleware `authenticate.ts`, o campo
// `request.user` é sempre garantido como definido.
// =============================================================================

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthenticatedUser
  }
}