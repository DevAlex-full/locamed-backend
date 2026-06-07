import { type PrismaClient, type AuditLog } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { CreateAuditLogInput, AuditFilters } from './audit.schema'
import type { PaginationParams } from '@/shared/types/common'
import { getPrismaSkip } from '@/shared/utils/pagination'

// =============================================================================
// Audit Repository
// =============================================================================
//
// Unica camada que toca no banco para operacoes de auditoria.
// Recebe o PrismaClient via construtor (injecao de dependencia) para facilitar
// testes unitarios com mocks.
//
// company_id e SEMPRE obrigatorio em todas as queries (ADR-003).
// AuditLog nao tem soft delete — registros sao imutaveis por design.
// A tabela e append-only: apenas create e findMany (sem update, sem delete).
// =============================================================================

export class AuditRepository {
  constructor(private readonly db: PrismaClient) {}

  // Cria uma entrada de auditoria.
  // Chamado pelo AuditService.log() — nunca diretamente pelos outros services.
  async create(input: CreateAuditLogInput): Promise<AuditLog> {
    return this.db.auditLog.create({
      data: {
        company_id: input.companyId,
        user_id:    input.userId    ?? null,
        action:     input.action,
        entity:     input.entity,
        entity_id:  input.entityId  ?? null,
        old_values: (input.oldValues ?? undefined) as Prisma.InputJsonValue | undefined,
        new_values: (input.newValues ?? undefined) as Prisma.InputJsonValue | undefined,
        ip:         input.ip        ?? null,
        user_agent: input.userAgent ?? null,
      },
    })
  }

  // Lista logs de auditoria com filtros dinamicos e paginacao.
  // $transaction garante consistencia entre count e findMany (mesmo snapshot).
  async findAll(
    companyId: string,
    filters: AuditFilters,
    pagination: PaginationParams,
  ): Promise<{ data: AuditLog[]; total: number }> {
    const where = this.buildWhereClause(companyId, filters)

    const [data, total] = await this.db.$transaction([
      this.db.auditLog.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip:    getPrismaSkip(pagination),
        take:    pagination.limit,
      }),
      this.db.auditLog.count({ where }),
    ])

    return { data, total }
  }

  // Busca todos os logs de uma entidade especifica — util para detalhe de registro.
  // Exemplo: "todos os eventos da reserva abc-123"
  async findByEntity(
    companyId: string,
    entity: string,
    entityId: string,
  ): Promise<AuditLog[]> {
    return this.db.auditLog.findMany({
      where: {
        company_id: companyId,
        entity,
        entity_id:  entityId,
      },
      orderBy: { created_at: 'desc' },
    })
  }

  // ── Helpers privados ────────────────────────────────────────────────────────

  private buildWhereClause(
    companyId: string,
    filters: AuditFilters,
  ): Prisma.AuditLogWhereInput {
    return {
      company_id: companyId,

      ...(filters.action   !== undefined && { action:    filters.action }),
      ...(filters.entity   !== undefined && { entity:    filters.entity }),
      ...(filters.userId   !== undefined && { user_id:   filters.userId }),
      ...(filters.entityId !== undefined && { entity_id: filters.entityId }),

      // Filtro de intervalo de data — construido apenas se ao menos uma data for fornecida
      ...((filters.dateFrom !== undefined || filters.dateTo !== undefined) && {
        created_at: {
          ...(filters.dateFrom !== undefined && { gte: new Date(filters.dateFrom) }),
          ...(filters.dateTo   !== undefined && { lte: new Date(filters.dateTo) }),
        },
      }),
    }
  }
}