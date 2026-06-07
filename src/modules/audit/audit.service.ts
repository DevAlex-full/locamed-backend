import { type AuditLog } from '@prisma/client'
import { prisma } from '@/config/database'
import { logger } from '@/shared/utils/logger'
import { buildPaginatedResult } from '@/shared/utils/pagination'
import type { PaginatedResult, PaginationParams } from '@/shared/types/common'
import { AuditRepository } from './audit.repository'
import {
  jsonToRecord,
  type AuditFilters,
  type AuditLogDto,
  type CreateAuditLogInput,
} from './audit.schema'

// =============================================================================
// Audit Service
// =============================================================================
//
// Singleton exportado — instanciado uma unica vez com o prisma singleton.
// Todos os outros services do sistema importam e chamam auditService.log().
//
// REGRA FUNDAMENTAL: log() NUNCA lanca excecao.
//   A auditoria e uma operacao auxiliar. Se ela falhar, o fluxo de negocio
//   principal (criar reserva, atualizar cliente, etc.) nao pode ser afetado.
//   Falhas de auditoria sao logadas internamente mas engolidas silenciosamente.
//
// Uso em outros services:
//   import { auditService, AuditAction } from '@/modules/audit/audit.service'
//
//   await auditService.log({
//     companyId: request.user.companyId,
//     userId:    request.user.id,
//     action:    AuditAction.CREATE,
//     entity:    'clients',
//     entityId:  client.id,
//     newValues: client,
//     ip:        request.ip,
//     userAgent: request.headers['user-agent'] ?? null,
//   })
// =============================================================================

const repository = new AuditRepository(prisma)

// ── Funcao de mapeamento: AuditLog do Prisma → AuditLogDto da API ─────────────
function toDto(log: AuditLog): AuditLogDto {
  return {
    id:         log.id,
    companyId:  log.company_id,
    userId:     log.user_id,
    action:     log.action,
    entity:     log.entity,
    entityId:   log.entity_id,
    oldValues:  jsonToRecord(log.old_values),
    newValues:  jsonToRecord(log.new_values),
    ip:         log.ip,
    userAgent:  log.user_agent,
    createdAt:  log.created_at.toISOString(),
  }
}

export const auditService = {
  // ── log() — registrar uma operacao de auditoria ─────────────────────────────
  //
  // Promise<void>: chamadores nao precisam aguardar o resultado.
  // try/catch interno: falhas de I/O nao propagam para o chamador.
  // Logar apenas dados nao-sensiveis: sem senha, sem token, sem chaves.
  async log(input: CreateAuditLogInput): Promise<void> {
    try {
      await repository.create(input)
    } catch (error) {
      // Falha de auditoria: registrar internamente sem lancar excecao.
      // O logger standalone e usado (nao request.log) pois log() pode ser
      // chamado fora do ciclo de request (ex: jobs, webhooks).
      logger.error(
        {
          err: error,
          audit: {
            companyId: input.companyId,
            action:    input.action,
            entity:    input.entity,
            entityId:  input.entityId,
          },
        },
        'Falha ao registrar entrada de auditoria — operacao principal nao afetada',
      )
    }
  },

  // ── findAll() — listar logs para o painel de auditoria (admin) ──────────────
  async findAll(
    companyId: string,
    filters: AuditFilters,
  ): Promise<PaginatedResult<AuditLogDto>> {
    const pagination: PaginationParams = {
      page:  filters.page,
      limit: filters.limit,
    }

    const { data, total } = await repository.findAll(companyId, filters, pagination)

    return buildPaginatedResult(data.map(toDto), total, pagination)
  },

  // ── findByEntity() — historico completo de uma entidade especifica ──────────
  // Util para exibir o historico de alteracoes no detalhe de um registro.
  async findByEntity(
    companyId: string,
    entity: string,
    entityId: string,
  ): Promise<AuditLogDto[]> {
    const logs = await repository.findByEntity(companyId, entity, entityId)
    return logs.map(toDto)
  },
}

// Re-exportar AuditAction para que os outros services nao precisem
// importar diretamente de @prisma/client
export { AuditAction } from './audit.schema'