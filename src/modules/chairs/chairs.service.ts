import { prisma } from '@/config/database'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { buildPaginatedResult } from '@/shared/utils/pagination'
import type { AuthenticatedUser, PaginatedResult, PaginationParams } from '@/shared/types/common'
import { auditService, AuditAction } from '@/modules/audit/audit.service'
import { ChairRepository } from './chairs.repository'
import {
  toChairDto,
  type ChairDto,
  type CreateChairBody,
  type UpdateChairBody,
  type ListChairsQuery,
} from './chairs.schema'

// =============================================================================
// Chairs Service
// =============================================================================
//
// Regras de negocio:
//
//   findAll:
//     Lista poltronas nao deletadas com busca (codigo, modelo, fabricante),
//     filtro opcional de status e paginacao.
//
//   findById:
//     Lanca NotFoundError se nao encontrada ou se for de outra empresa.
//
//   create:
//     Valida unicidade do campo code dentro da empresa (ConflictError).
//     Registra auditoria com newValues.
//
//   update:
//     Valida unicidade do code se foi alterado (exclui a propria poltrona).
//     Registra auditoria com oldValues e newValues.
//     Status so pode ser alterado para: available, maintenance, sanitization, inactive.
//     (reserved, in_delivery, rented, in_pickup sao gerenciados pelo modulo Reservas)
//
//   remove:
//     Soft delete (deleted_at). Registra auditoria com oldValues.
// =============================================================================

export interface RequestContext {
  ip?:        string | null
  userAgent?: string | null
}

const repository = new ChairRepository(prisma)

export const chairsService = {
  async findAll(
    companyId: string,
    filters:   ListChairsQuery,
  ): Promise<PaginatedResult<ChairDto>> {
    const pagination: PaginationParams = {
      page:  filters.page,
      limit: filters.limit,
    }

    const { data, total } = await repository.findAll(
      companyId,
      filters.search,
      filters.status,
      pagination,
    )

    return buildPaginatedResult(data.map(toChairDto), total, pagination)
  },

  async findById(id: string, companyId: string): Promise<ChairDto> {
    const chair = await repository.findById(id, companyId)
    if (!chair) throw new NotFoundError('Poltrona')
    return toChairDto(chair)
  },

  async create(
    companyId: string,
    body:      CreateChairBody,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<ChairDto> {
    // Verificar unicidade do codigo dentro da empresa
    const existing = await repository.findByCode(body.code, companyId)
    if (existing) {
      throw new ConflictError(
        `Ja existe uma poltrona com o codigo "${body.code}" nesta empresa.`,
      )
    }

    const chair = await repository.create(companyId, body)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.CREATE,
      entity:    'chairs',
      entityId:  chair.id,
      newValues: { code: chair.code, status: chair.status, model: chair.model },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toChairDto(chair)
  },

  async update(
    id:        string,
    companyId: string,
    body:      UpdateChairBody,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<ChairDto> {
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Poltrona')

    // Verificar unicidade do code se foi alterado
    if (body.code !== undefined && body.code !== existing.code) {
      const conflict = await repository.findByCode(body.code, companyId, id)
      if (conflict) {
        throw new ConflictError(
          `Ja existe uma poltrona com o codigo "${body.code}" nesta empresa.`,
        )
      }
    }

    const updated = await repository.update(id, body)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.UPDATE,
      entity:    'chairs',
      entityId:  id,
      oldValues: { code: existing.code, status: existing.status, model: existing.model },
      newValues: { code: updated.code,  status: updated.status,  model: updated.model },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toChairDto(updated)
  },

  async remove(
    id:        string,
    companyId: string,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<void> {
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Poltrona')

    await repository.softDelete(id)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.DELETE,
      entity:    'chairs',
      entityId:  id,
      oldValues: { code: existing.code, status: existing.status },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
  },
}