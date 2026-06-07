import fp from 'fastify-plugin'
import cors from '@fastify/cors'
import { type FastifyInstance } from 'fastify'
import { env } from '@/config/env'

// =============================================================================
// Plugin CORS
// =============================================================================
//
// Restringe quais origens podem acessar a API.
// Em produção, CORS_ORIGINS deve conter apenas os domínios oficiais da aplicação.
//
// O uso de `fp()` (fastify-plugin) remove o encapsulamento do plugin,
// tornando o CORS disponível em todas as rotas, incluindo plugins filhos.
// =============================================================================

export const corsPlugin = fp(async (app: FastifyInstance) => {
  await app.register(cors, {
    // Lista de origens permitidas — vem da variável de ambiente
    origin: (origin, callback) => {
      // Requests sem origin (ex: Postman, server-to-server) são permitidos
      if (!origin) {
        callback(null, true)
        return
      }

      const isAllowed = env.CORS_ORIGINS.includes(origin)

      if (isAllowed) {
        callback(null, true)
      } else {
        callback(new Error(`Origem não permitida pelo CORS: ${origin}`), false)
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-ID'],
    exposedHeaders: ['X-Request-ID'],
    credentials: true,
    // Cache da resposta preflight por 24 horas
    maxAge: 86_400,
  })
})