import { type PrismaClient, type Client } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { getPrismaSkip } from '@/shared/utils/pagination'
import type { PaginationParams } from '@/shared/types/common'
import type { CreateClientBody, UpdateClientBody } from './clients.schema'

// =============================================================================
// Clients Repository
// =============================================================================
//
// Regras obrigatorias:
//   - company_id SEMPRE nos filtros where (ADR-003 — isolamento multi-tenant)
//   - deleted_at: null em TODAS as queries de leitura (soft delete)
//   - create e update nao recebem company_id do caller — vem do metodo como param
//
// Soft delete:
//   O modelo Client nao tem campo `active`. Registros sao "desativados"
//   definindo deleted_at. O DELETE HTTP chama softDelete() neste repositorio.
//   Queries de leitura SEMPRE filtram { deleted_at: null }.
// =============================================================================

export class ClientRepository {
  constructor(private readonly db: PrismaClient) {}

  // Busca por ID dentro da empresa — retorna null se nao encontrado ou deletado
  async findById(id: string, companyId: string): Promise<Client | null> {
    return this.db.client.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    })
  }

  // Busca por CPF dentro da empresa — usado para verificar unicidade
  // excludeId: excluir um cliente especifico da busca (UPDATE — verificar outro CPF)
  async findByCPF(
    cpf:       string,
    companyId: string,
    excludeId?: string,
  ): Promise<Client | null> {
    return this.db.client.findFirst({
      where: {
        cpf,
        company_id: companyId,
        deleted_at: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
  }

  // Lista clientes com busca opcional e paginacao
  async findAll(
    companyId:  string,
    search:     string | undefined,
    pagination: PaginationParams,
  ): Promise<{ data: Client[]; total: number }> {
    const where: Prisma.ClientWhereInput = {
      company_id: companyId,
      deleted_at: null,
      ...(search
        ? {
            OR: [
              { name:  { contains: search, mode: 'insensitive' } },
              { cpf:   { contains: search } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    }

    const [data, total] = await this.db.$transaction([
      this.db.client.findMany({
        where,
        orderBy: { name: 'asc' },
        skip:    getPrismaSkip(pagination),
        take:    pagination.limit,
      }),
      this.db.client.count({ where }),
    ])

    return { data, total }
  }

  // Cria um novo cliente
  async create(companyId: string, data: CreateClientBody): Promise<Client> {
    return this.db.client.create({
      data: {
        company_id:   companyId,
        name:         data.name,
        cpf:          data.cpf,
        rg:           data.rg             ?? null,
        birth_date:   data.birthDate      ? new Date(data.birthDate) : null,
        phone:        data.phone,
        whatsapp:     data.whatsapp       ?? null,
        email:        data.email          ?? null,
        zip_code:     data.zipCode        ?? null,
        address:      data.address        ?? null,
        number:       data.number         ?? null,
        complement:   data.complement     ?? null,
        neighborhood: data.neighborhood   ?? null,
        city:         data.city           ?? null,
        state:        data.state          ?? null,
        doctor:       data.doctor         ?? null,
        hospital:     data.hospital       ?? null,
        surgery_date: data.surgeryDate    ? new Date(data.surgeryDate) : null,
        notes:        data.notes          ?? null,
      },
    })
  }

  // Atualiza um cliente — company_id verificado no service antes desta chamada
  async update(id: string, data: UpdateClientBody): Promise<Client> {
    return this.db.client.update({
      where: { id },
      data: {
        ...(data.name         !== undefined && { name:         data.name }),
        ...(data.cpf          !== undefined && { cpf:          data.cpf }),
        ...(data.rg           !== undefined && { rg:           data.rg }),
        ...(data.birthDate    !== undefined && {
          birth_date: data.birthDate ? new Date(data.birthDate) : null,
        }),
        ...(data.phone        !== undefined && { phone:        data.phone }),
        ...(data.whatsapp     !== undefined && { whatsapp:     data.whatsapp }),
        ...(data.email        !== undefined && { email:        data.email }),
        ...(data.zipCode      !== undefined && { zip_code:     data.zipCode }),
        ...(data.address      !== undefined && { address:      data.address }),
        ...(data.number       !== undefined && { number:       data.number }),
        ...(data.complement   !== undefined && { complement:   data.complement }),
        ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
        ...(data.city         !== undefined && { city:         data.city }),
        ...(data.state        !== undefined && { state:        data.state }),
        ...(data.doctor       !== undefined && { doctor:       data.doctor }),
        ...(data.hospital     !== undefined && { hospital:     data.hospital }),
        ...(data.surgeryDate  !== undefined && {
          surgery_date: data.surgeryDate ? new Date(data.surgeryDate) : null,
        }),
        ...(data.notes        !== undefined && { notes:        data.notes }),
      },
    })
  }

  // Soft delete — define deleted_at para o timestamp atual
  async softDelete(id: string): Promise<Client> {
    return this.db.client.update({
      where: { id },
      data:  { deleted_at: new Date() },
    })
  }
}