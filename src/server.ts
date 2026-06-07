import { buildApp } from '@/app'
import { env } from '@/config/env'
import { logger } from '@/shared/utils/logger'
import { prisma } from '@/config/database'
import { type FastifyInstance } from 'fastify'

// =============================================================================
// Entry Point do Servidor
// =============================================================================
//
// Responsabilidades deste arquivo:
//   1. Iniciar a aplicação Fastify
//   2. Escutar na porta configurada
//   3. Registrar handlers de sinais para graceful shutdown
//   4. Capturar exceções não tratadas (última linha de defesa)
//
// NUNCA adicionar lógica de negócio aqui.
// Este arquivo apenas orquestra a inicialização e o encerramento.
// =============================================================================

let appInstance: FastifyInstance | null = null

async function main(): Promise<void> {
  try {
    appInstance = await buildApp()

    await appInstance.listen({
      port: env.PORT,
      host: env.HOST,
    })

    logger.info(
      {
        port: env.PORT,
        host: env.HOST,
        environment: env.NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
      },
      '🚀 Servidor iniciado com sucesso',
    )

    if (env.NODE_ENV === 'development') {
      logger.info(`📖 Documentação disponível em http://localhost:${env.PORT}/docs`)
    }
  } catch (error) {
    logger.error(error, '❌ Falha crítica ao iniciar o servidor')
    await shutdown('startup_failure')
  }
}

// =============================================================================
// Graceful Shutdown
// =============================================================================
//
// Garante que:
//   1. O Fastify para de aceitar novas conexões
//   2. Requests em andamento terminam antes do encerramento
//   3. O Prisma fecha as conexões com o banco corretamente
//   4. O processo encerra com código 0 (sucesso) ou 1 (falha)
//
// O Render envia SIGTERM 10 segundos antes de forçar o encerramento.
// Este handler garante que o banco não fique com conexões órfãs.
// =============================================================================

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, 'Iniciando encerramento gracioso...')

  try {
    if (appInstance) {
      // Para de aceitar novas requisições e aguarda as em andamento
      await appInstance.close()
      logger.info('Servidor Fastify encerrado')
    }

    // Fecha todas as conexões com o banco de dados
    await prisma.$disconnect()
    logger.info('Conexões com o banco de dados encerradas')

    logger.info('✅ Encerramento concluído com sucesso')
    process.exit(0)
  } catch (error) {
    logger.error(error, 'Erro durante o encerramento gracioso')
    process.exit(1)
  }
}

// ── Sinais do sistema operacional ─────────────────────────────────────────────

// SIGTERM: enviado pelo Render/Docker antes de encerrar o container
process.on('SIGTERM', () => {
  void shutdown('SIGTERM')
})

// SIGINT: enviado pelo Ctrl+C em desenvolvimento
process.on('SIGINT', () => {
  void shutdown('SIGINT')
})

// ── Exceções não capturadas ───────────────────────────────────────────────────
// Última linha de defesa. Se chegou aqui, algo muito errado aconteceu.
// Logamos o erro e encerramos — nunca deixar o processo em estado inconsistente.

process.on('uncaughtException', (error: Error) => {
  logger.error(
    {
      err: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    },
    '💥 Exceção não capturada — encerrando processo',
  )
  process.exit(1)
})

process.on('unhandledRejection', (reason: unknown) => {
  logger.error(
    { reason },
    '💥 Promise rejeitada não tratada — encerrando processo',
  )
  process.exit(1)
})

// ── Inicialização ─────────────────────────────────────────────────────────────
void main()