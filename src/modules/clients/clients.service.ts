import { prisma } from '@/config/database'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { buildPaginatedResult } from '@/shared/utils/pagination'
import type { AuthenticatedUser, PaginatedResult, PaginationParams } from '@/shared/types/common'
import { auditService, AuditAction } from '@/modules/audit/audit.service'
import { ClientRepository } from './clients.repository'
import {
  toClientDto,
  type ClientDto,
  type CreateClientBody,
  type UpdateClientBody,
  type ListClientsQuery,
} from './clients.schema'

// =============================================================================
// Clients Service
// =============================================================================
//
// Regras de negocio:
//
//   findAll:
//     Lista clientes da empresa com busca (nome, CPF, telefone) e paginacao.
//     Apenas clientes nao deletados (deleted_at: null).
//
//   findById:
//     Busca cliente por UUID dentro da empresa.
//     Lanca NotFoundError se nao encontrado.
//
//   create:
//     Valida unicidade de CPF dentro da empresa.
//     Registra auditoria com newValues.
//
//   update:
//     Valida unicidade de CPF (se alterado) — exclui o proprio cliente da busca.
//     Registra auditoria com oldValues e newValues.
//
//   remove:
//     Soft delete (define deleted_at).
//     Registra auditoria com oldValues.
// =============================================================================

// Contexto de request para auditoria
export interface RequestContext {
  ip?:        string | null
  userAgent?: string | null
}

const repository = new ClientRepository(prisma)

export const clientsService = {
  async findAll(
    companyId: string,
    filters:   ListClientsQuery,
  ): Promise<PaginatedResult<ClientDto>> {
    const pagination: PaginationParams = {
      page:  filters.page,
      limit: filters.limit,
    }

    const { data, total } = await repository.findAll(
      companyId,
      filters.search,
      pagination,
    )

    return buildPaginatedResult(data.map(toClientDto), total, pagination)
  },

  async findById(id: string, companyId: string): Promise<ClientDto> {
    const client = await repository.findById(id, companyId)
    if (!client) throw new NotFoundError('Cliente')
    return toClientDto(client)
  },

  async create(
    companyId: string,
    body:      CreateClientBody,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<ClientDto> {
    // Verificar unicidade do CPF na empresa
    const existing = await repository.findByCPF(body.cpf, companyId)
    if (existing) {
      throw new ConflictError('Ja existe um cliente com este CPF nesta empresa.')
    }

    const client = await repository.create(companyId, body)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.CREATE,
      entity:    'clients',
      entityId:  client.id,
      newValues: { name: client.name, cpf: client.cpf, phone: client.phone },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toClientDto(client)
  },

  async update(
    id:        string,
    companyId: string,
    body:      UpdateClientBody,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<ClientDto> {
    // Verificar existencia
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Cliente')

    // Verificar unicidade do CPF se foi alterado
    if (body.cpf !== undefined && body.cpf !== existing.cpf) {
      const conflict = await repository.findByCPF(body.cpf, companyId, id)
      if (conflict) {
        throw new ConflictError('Ja existe um cliente com este CPF nesta empresa.')
      }
    }

    const updated = await repository.update(id, body)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.UPDATE,
      entity:    'clients',
      entityId:  id,
      oldValues: { name: existing.name, cpf: existing.cpf, phone: existing.phone },
      newValues: { name: updated.name,  cpf: updated.cpf,  phone: updated.phone },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toClientDto(updated)
  },

  async remove(
    id:        string,
    companyId: string,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<void> {
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Cliente')

    await repository.softDelete(id)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.DELETE,
      entity:    'clients',
      entityId:  id,
      oldValues: { name: existing.name, cpf: existing.cpf },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })
  },
}