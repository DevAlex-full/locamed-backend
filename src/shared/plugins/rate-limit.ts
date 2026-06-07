import fp from 'fastify-plugin'
import rateLimit from '@fastify/rate-limit'
import { type FastifyInstance } from 'fastify'
import { env } from '@/config/env'

// =============================================================================
// Plugin Rate Limiting
// =============================================================================
//
// Protege a API contra abuso e ataques de força bruta.
// A chave de rate limit é o IP do cliente.
//
// Em rotas específicas (ex: /auth/login), um limite mais restritivo
// será configurado diretamente na definição da rota com:
//   config: { rateLimit: { max: 5, timeWindow: '15 minutes' } }
//
// A rota /health não aplica rate limit (ver app.ts).
//
// `trustProxy: true` no Fastify (configurado em app.ts) garante que
// o IP real do cliente seja lido do header X-Forwarded-For no Render.
// =============================================================================

export const rateLimitPlugin = fp(async (app: FastifyInstance) => {
  await app.register(rateLimit, {
    max: env.RATE_LIMIT_MAX,
    timeWindow: env.RATE_LIMIT_WINDOW_MS,

    // Resposta padronizada quando o limite é excedido
    errorResponseBuilder: (_request, context) => ({
      success: false,
      error: 'RATE_LIMIT_EXCEEDED',
      message: `Limite de requisições excedido. Tente novamente em ${Math.ceil(context.ttl / 1_000)} segundo(s).`,
      retryAfter: Math.ceil(context.ttl / 1_000),
    }),

    // Adiciona headers informativos na resposta:
    // X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
    addHeadersOnExceeding: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
    },
  })
})