import { z } from 'zod'
import type { PaginationParams, PaginatedResult } from '@/shared/types/common'

// =============================================================================
// Pagination Utilities
// =============================================================================
//
// Centraliza toda a logica de paginacao consumida pelos repositories e services.
//
// Fluxo tipico num controller:
//   1. parsePaginationQuery(request.query) -> PaginationParams
//   2. repository.findMany({ skip: getPrismaSkip(params), take: params.limit })
//   3. buildPaginatedResult(data, total, params) -> PaginatedResult<T>
//   4. sendPaginated(reply, result)
// =============================================================================

// Schema Zod para query params de paginacao
// Aceita strings (query params sao sempre strings) e converte para numero
export const paginationQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'page deve ser um numero' })
    .int('page deve ser um inteiro')
    .min(1, 'page deve ser maior ou igual a 1')
    .default(1),

  limit: z.coerce
    .number({ invalid_type_error: 'limit deve ser um numero' })
    .int('limit deve ser um inteiro')
    .min(1, 'limit deve ser maior ou igual a 1')
    .max(100, 'limit nao pode exceder 100 itens por pagina')
    .default(20),
})

// Tipo inferido do schema — usado em query handlers
export type PaginationQuery = z.infer<typeof paginationQuerySchema>

// Parseia e valida query params de paginacao
// Lanca ZodError se os valores forem invalidos (capturado pelo error-handler global)
export function parsePaginationQuery(query: unknown): PaginationParams {
  return paginationQuerySchema.parse(query)
}

// Calcula o offset para queries Prisma a partir dos params de paginacao
// Exemplo: page=2, limit=20 -> skip=20 (pula os primeiros 20 registros)
export function getPrismaSkip(params: PaginationParams): number {
  return (params.page - 1) * params.limit
}

// Monta o resultado paginado no formato esperado pelo sendPaginated()
export function buildPaginatedResult<T>(
  data: T[],
  total: number,
  params: PaginationParams,
): PaginatedResult<T> {
  return {
    data,
    total,
    page: params.page,
    limit: params.limit,
    totalPages: Math.ceil(total / params.limit),
  }
}

// Verifica se ha proxima pagina
export function hasNextPage(params: PaginationParams, total: number): boolean {
  return params.page * params.limit < total
}

// Verifica se ha pagina anterior
export function hasPreviousPage(params: PaginationParams): boolean {
  return params.page > 1
}