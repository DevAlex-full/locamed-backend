import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import {
  type FastifyInstance,
  type FastifyError,
  type FastifyPluginOptions,
  type HookHandlerDoneFunction,
} from 'fastify'
import { AppError, ValidationError } from '@/shared/errors'
import { logger } from '@/shared/utils/logger'

// =============================================================================
// Plugin Error Handler Global
// =============================================================================
//
// Centraliza o tratamento de todos os erros da aplicacao.
// Garante que respostas de erro sempre sigam o formato padrao da API.
//
// Por que padrao callback (Opcao B) e nao async (Opcao A)?
//   app.setErrorHandler() e app.setNotFoundHandler() sao registros sincronos.
//   Nao ha Promises a aguardar. Usar `async` sem `await` dispara a regra
//   @typescript-eslint/require-await. O padrao correto para plugins sincronos
//   no Fastify e o callback com done():
//
//     fp((app, _opts, done) => {
//       // ... registros sincronos ...
//       done()   <- obrigatorio: sinaliza ao Fastify que o plugin terminou
//     })
//
//   Sem done(), o Fastify aguarda indefinidamente e lanca:
//   AVV_ERR_PLUGIN_EXEC_TIMEOUT — "Plugin did not start in time"
//
// Hierarquia de tratamento:
//   1. ZodError     -> 422 Unprocessable Entity (validacao de schema)
//   2. AppError     -> statusCode definido na classe (erros operacionais)
//   3. FastifyError -> erros internos do Fastify com statusCode < 500
//   4. Error generico -> 500 Internal Server Error (bug inesperado)
//
// Seguranca:
//   - Erros 500 nunca expoe detalhes internos ao cliente
//   - Stack traces logados internamente, nunca na resposta HTTP
// =============================================================================

export const errorHandlerPlugin = fp(
  (app: FastifyInstance, _opts: FastifyPluginOptions, done: HookHandlerDoneFunction) => {
    app.setErrorHandler(
      (error: FastifyError | AppError | ZodError | Error, request, reply) => {
        // -- 1. Erros de validacao Zod -----------------------------------------
        if (error instanceof ZodError) {
          const details: Record<string, string[]> = {}

          for (const issue of error.errors) {
            const field = issue.path.join('.') || 'root'
            if (!details[field]) {
              details[field] = []
            }
            details[field].push(issue.message)
          }

          return reply.status(422).send({
            success: false,
            error: 'VALIDATION_ERROR',
            message: 'Dados invalidos. Verifique os campos e tente novamente.',
            details,
          })
        }

        // -- 2. Erros operacionais (AppError e subclasses) ---------------------
        if (error instanceof AppError) {
          if (error.statusCode >= 500) {
            logger.error(
              {
                err: {
                  name: error.name,
                  message: error.message,
                  code: error.code,
                  stack: error.stack,
                },
                reqId: request.id,
                method: request.method,
                url: request.url,
              },
              'Erro operacional 5xx',
            )
          } else {
            logger.warn(
              {
                code: error.code,
                statusCode: error.statusCode,
                reqId: request.id,
                url: request.url,
              },
              error.message,
            )
          }

          const response: Record<string, unknown> = {
            success: false,
            error: error.code,
            message: error.message,
          }

          if (error instanceof ValidationError && Object.keys(error.details).length > 0) {
            response['details'] = error.details
          }

          return reply.status(error.statusCode).send(response)
        }

        // -- 3. Erros internos do Fastify (body parser, schema nativo etc.) ----
        const fastifyError = error as FastifyError
        if (fastifyError.statusCode && fastifyError.statusCode < 500) {
          return reply.status(fastifyError.statusCode).send({
            success: false,
            error: 'REQUEST_ERROR',
            message: fastifyError.message,
          })
        }

        // -- 4. Erros inesperados (bugs de runtime) ----------------------------
        // NUNCA expoe detalhes do erro interno ao cliente
        logger.error(
          {
            err: {
              name: error.name,
              message: error.message,
              stack: error.stack,
            },
            reqId: request.id,
            method: request.method,
            url: request.url,
            userAgent: request.headers['user-agent'],
          },
          'Erro interno inesperado — requer investigacao',
        )

        return reply.status(500).send({
          success: false,
          error: 'INTERNAL_ERROR',
          message: 'Erro interno do servidor. Nossa equipe foi notificada.',
        })
      },
    )

    // -- Rotas nao encontradas -------------------------------------------------
    app.setNotFoundHandler((request, reply) => {
      return reply.status(404).send({
        success: false,
        error: 'ROUTE_NOT_FOUND',
        message: `Rota ${request.method} ${request.url} nao existe nesta API.`,
      })
    })

    // Obrigatorio no padrao callback: sinaliza ao Fastify que o plugin concluiu.
    // Sem esta chamada o Fastify lanca AVV_ERR_PLUGIN_EXEC_TIMEOUT.
    done()
  },
)