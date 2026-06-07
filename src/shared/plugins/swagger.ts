import fp from 'fastify-plugin'
import swagger from '@fastify/swagger'
import swaggerUi from '@fastify/swagger-ui'
import { type FastifyInstance } from 'fastify'
import { env } from '@/config/env'

// =============================================================================
// Plugin Swagger — Documentação da API
// =============================================================================
//
// Ativado APENAS em desenvolvimento.
// Em produção, nenhum endpoint de documentação é exposto.
//
// Acesso em desenvolvimento: http://localhost:3333/docs
// =============================================================================

export const swaggerPlugin = fp(async (app: FastifyInstance) => {
  if (env.NODE_ENV === 'production') return

  await app.register(swagger, {
    openapi: {
      openapi: '3.0.0',
      info: {
        title: 'Poltronas API',
        description:
          'Sistema SaaS de gestão de locação de poltronas pós-cirúrgicas.\n\n' +
          '**Autenticação**: Use o botão Authorize e insira seu Bearer token JWT.',
        version: '1.0.0',
        contact: {
          name: 'Time de Engenharia',
        },
      },
      servers: [
        {
          url: `http://localhost:${env.PORT}`,
          description: 'Servidor de desenvolvimento',
        },
      ],
      components: {
        securitySchemes: {
          BearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
            description: 'Token JWT obtido via Supabase Auth',
          },
        },
      },
      security: [{ BearerAuth: [] }],
      tags: [
        { name: 'Health', description: 'Status da aplicação' },
        { name: 'Auth', description: 'Autenticação e autorização' },
        { name: 'Users', description: 'Gestão de usuários' },
        { name: 'Clients', description: 'Gestão de clientes' },
        { name: 'Chairs', description: 'Gestão de poltronas' },
        { name: 'Reservations', description: 'Gestão de reservas' },
        { name: 'Schedule', description: 'Calendário operacional' },
        { name: 'Deliveries', description: 'Entregas e retiradas' },
        { name: 'Financial', description: 'Financeiro e cobranças' },
        { name: 'Contracts', description: 'Contratos' },
        { name: 'Partners', description: 'Parceiros médicos e clínicas' },
        { name: 'Commissions', description: 'Programa de comissões' },
        { name: 'Reports', description: 'Relatórios' },
        { name: 'Audit', description: 'Auditoria' },
        { name: 'Webhooks', description: 'Webhooks de integrações externas' },
      ],
    },
  })

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'none',
      deepLinking: true,
      displayRequestDuration: true,
      filter: true,
    },
    staticCSP: false,
  })
})