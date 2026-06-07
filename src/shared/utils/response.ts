import type { FastifyReply } from 'fastify'
import type { PaginatedResult, ApiSuccessResponse } from '@/shared/types/common'

// =============================================================================
// Response Helpers — Respostas Padronizadas da API
// =============================================================================
//
// Centraliza a construcao de respostas HTTP para garantir formato consistente
// em todos os controllers. Todo handler de rota usa estas funcoes em vez de
// chamar reply.send() diretamente com objetos ad-hoc.
//
// Formato padrao de sucesso:
//   { success: true, data: T, message?: string }
//
// Formato padrao de paginacao:
//   { success: true, data: T[], meta: { total, page, limit, totalPages } }
//
// Uso nos controllers:
//   return sendSuccess(reply, client)
//   return sendSuccess(reply, client, 'Cliente criado com sucesso', 201)
//   return sendPaginated(reply, paginatedClients)
// =============================================================================

// Resposta de sucesso simples (200 por padrao)
export function sendSuccess<T>(
  reply: FastifyReply,
  data: T,
  message?: string,
  statusCode = 200,
): ReturnType<FastifyReply['send']> {
  const response: ApiSuccessResponse<T> = {
    success: true,
    data,
    ...(message !== undefined && { message }),
  }

  return reply.status(statusCode).send(response)
}

// Resposta de criacao (201 Created)
export function sendCreated<T>(
  reply: FastifyReply,
  data: T,
  message?: string,
): ReturnType<FastifyReply['send']> {
  return sendSuccess(reply, data, message, 201)
}

// Resposta sem conteudo (204 No Content)
// Usado em: DELETE, PATCH de status sem retorno de dados
export function sendNoContent(reply: FastifyReply): ReturnType<FastifyReply['send']> {
  return reply.status(204).send()
}

// Resposta paginada — inclui metadados de paginacao no campo `meta`
export function sendPaginated<T>(
  reply: FastifyReply,
  result: PaginatedResult<T>,
): ReturnType<FastifyReply['send']> {
  return reply.status(200).send({
    success: true,
    data: result.data,
    meta: {
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    },
  })
}