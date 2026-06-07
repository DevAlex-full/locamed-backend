import { z } from 'zod'
import { AuditAction } from '@prisma/client'
import type { Prisma } from '@prisma/client'

// =============================================================================
// Audit — Schema, DTOs e Tipos
// =============================================================================
//
// Este arquivo define os contratos de entrada e saida do modulo de auditoria.
//
// CreateAuditLogInput: usado por TODOS os outros services para registrar operacoes.
//   Exemplo de uso em ClientService:
//     await auditService.log({
//       companyId:  request.user.companyId,
//       userId:     request.user.id,
//       action:     AuditAction.CREATE,
//       entity:     'clients',
//       entityId:   newClient.id,
//       newValues:  newClient,
//       ip:         request.ip,
//       userAgent:  request.headers['user-agent'],
//     })
//
// AuditLogDto: formato de saida para a API (GET /audit).
//   Converte snake_case do banco para camelCase da API.
//
// AuditFiltersSchema: validacao dos query params da rota GET /audit.
// =============================================================================

// ── Input DTO — usado pelos services para criar entradas de auditoria ─────────

export interface CreateAuditLogInput {
  companyId:  string
  userId?:    string | null    // null para acoes de sistema (webhooks, jobs)
  action:     AuditAction
  entity:     string           // nome da tabela: 'clients', 'reservations', etc.
  entityId?:  string | null    // ID do registro afetado
  oldValues?: Record<string, unknown> | null  // estado antes (UPDATE, DELETE)
  newValues?: Record<string, unknown> | null  // estado depois (CREATE, UPDATE)
  ip?:        string | null
  userAgent?: string | null
}

// ── Output DTO — formato da resposta da API ───────────────────────────────────

export interface AuditLogDto {
  id:         string
  companyId:  string
  userId:     string | null
  action:     AuditAction
  entity:     string
  entityId:   string | null
  oldValues:  Record<string, unknown> | null
  newValues:  Record<string, unknown> | null
  ip:         string | null
  userAgent:  string | null
  createdAt:  string  // ISO 8601
}

// ── Conversao de JsonValue do Prisma para Record ──────────────────────────────
//
// Os campos old_values e new_values sao armazenados como Json no PostgreSQL.
// O Prisma retorna Prisma.JsonValue (que pode ser string, number, boolean,
// null, array ou object). Para o DTO precisamos de Record<string, unknown>.
// Esta funcao converte com seguranca apenas os valores do tipo objeto.
export function jsonToRecord(
  value: Prisma.JsonValue | null | undefined,
): Record<string, unknown> | null {
  if (value === null || value === undefined) return null
  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, unknown>
  }
  return null
}

// ── Query filters — validacao dos params de GET /audit ────────────────────────

export const auditFiltersSchema = z.object({
  // Filtro por tipo de acao
  action: z.nativeEnum(AuditAction).optional(),

  // Filtro por entidade (nome da tabela)
  entity: z.string().trim().min(1).optional(),

  // Filtro por usuario que realizou a acao
  userId: z.string().uuid('userId deve ser um UUID valido').optional(),

  // Filtro por ID da entidade afetada
  entityId: z.string().trim().min(1).optional(),

  // Filtro por intervalo de data
  dateFrom: z.string().datetime({ message: 'dateFrom deve ser ISO 8601' }).optional(),
  dateTo:   z.string().datetime({ message: 'dateTo deve ser ISO 8601' }).optional(),

  // Paginacao
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
})

export type AuditFilters = z.infer<typeof auditFiltersSchema>

// ── Re-export do enum para evitar import direto de @prisma/client nos services ─
export { AuditAction }