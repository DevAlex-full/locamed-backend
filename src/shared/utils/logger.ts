import pino, { type Logger, type LoggerOptions } from 'pino'

// =============================================================================
// Logger Estruturado — Pino
// =============================================================================
//
// Duas instâncias de logger serão utilizadas na aplicação:
//
// 1. Este logger (logger.ts):
//    Usado em: startup/shutdown do servidor, services, repositories, utils.
//    Não tem contexto de request (sem reqId).
//
// 2. request.log (gerenciado pelo Fastify internamente):
//    Usado em: route handlers e hooks dentro do ciclo de request.
//    Tem contexto rico: reqId, method, url, statusCode, responseTime.
//
// Ambos usam as mesmas opções de formatação (pinoConfig).
// Em desenvolvimento: saída human-readable via pino-pretty.
// Em produção: saída JSON pura para consumo por agregadores de log (Render Logs).
//
// Campos SEMPRE redacted (nunca aparecem em logs):
//   - req.headers.authorization (token JWT)
//   - req.headers.cookie
// =============================================================================

const isDev = process.env['NODE_ENV'] !== 'production'

export const pinoConfig: LoggerOptions = {
  level: isDev ? 'debug' : 'info',

  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
            singleLine: false,
            messageFormat: '{msg}',
          },
        },
      }
    : {
        // Em produção, output JSON puro para agregadores (Render, Datadog, etc.)
        formatters: {
          level: (label: string) => ({ level: label }),
        },
        timestamp: pino.stdTimeFunctions.isoTime,
      }),

  // Redact: remove dados sensíveis dos logs ANTES de escrever.
  // Aplica-se a toda a árvore de objetos logados.
  redact: {
    paths: [
      'req.headers.authorization',
      'req.headers.cookie',
    ],
    censor: '[REDACTED]',
  },
}

export const logger: Logger = pino(pinoConfig)