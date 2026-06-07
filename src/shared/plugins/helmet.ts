import fp from 'fastify-plugin'
import helmet from '@fastify/helmet'
import { type FastifyInstance } from 'fastify'
import { env } from '@/config/env'

// =============================================================================
// Plugin Helmet — Security Headers
// =============================================================================
//
// Configura headers HTTP de segurança para proteger contra ataques comuns:
//   - XSS (X-XSS-Protection, Content-Security-Policy)
//   - Clickjacking (X-Frame-Options via CSP frame-ancestors)
//   - MIME sniffing (X-Content-Type-Options)
//   - Information disclosure (X-Powered-By removido)
//
// CSP em desenvolvimento é desativado para não bloquear o Swagger UI.
// =============================================================================

export const helmetPlugin = fp(async (app: FastifyInstance) => {
  const isProd = env.NODE_ENV === 'production'

  await app.register(helmet, {
    // Content Security Policy — apenas em produção para não bloquear Swagger
    contentSecurityPolicy: isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:', 'https:'],
            connectSrc: ["'self'"],
            fontSrc: ["'self'"],
            objectSrc: ["'none'"],
            mediaSrc: ["'self'"],
            frameSrc: ["'none'"],
          },
        }
      : false,

    // Impede que o browser faça MIME sniffing do content-type
    noSniff: true,

    // Impede a página de ser carregada em iframes (anti-clickjacking)
    frameguard: { action: 'deny' },

    // Remove o header X-Powered-By (não expõe tecnologia)
    hidePoweredBy: true,

    // Força HTTPS por 1 ano em produção
    hsts: isProd
      ? {
          maxAge: 31_536_000,
          includeSubDomains: true,
          preload: true,
        }
      : false,

    // Permite que o Swagger UI embutido funcione em desenvolvimento
    crossOriginEmbedderPolicy: isProd,
  })
})