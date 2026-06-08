import { type PrismaClient, type User } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { getPrismaSkip } from '@/shared/utils/pagination'
import type { PaginationParams } from '@/shared/types/common'
import type { UpdateUserData } from './users.schema'

// =============================================================================
// Users Repository
// =============================================================================
//
// Regras obrigatorias:
//   - company_id SEMPRE presente nos filtros where (ADR-003)
//   - deleted_at: null em TODAS as queries de leitura (soft delete)
//   - update usa apenas o id (PK) no where — company_id verificado no service
//   - Nenhuma query aceita company_id do body — vem sempre do metodo como parametro
// =============================================================================

// Tipo para findByIdWithCompany — resultado com relacao incluida
export type UserWithCompany = Prisma.UserGetPayload<{
  include: {
    company: {
      select: { id: true; name: true; plan: true; active: true }
    }
  }
}>

export class UserRepository {
  constructor(private readonly db: PrismaClient) {}

  // Busca usuario com dados basicos da empresa — usado por GET /me
  async findByIdWithCompany(
    id: string,
    companyId: string,
  ): Promise<UserWithCompany | null> {
    return this.db.user.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      include: {
        company: {
          select: { id: true, name: true, plan: true, active: true },
        },
      },
    })
  }

  // Busca usuario por id dentro da empresa — retorna null se nao encontrado
  async findById(id: string, companyId: string): Promise<User | null> {
    return this.db.user.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    })
  }

  // Lista usuarios com filtros opcionais e paginacao
  async findAll(
    companyId: string,
    filters: {
      role?:   User['role']
      active?: boolean
      search?: string
    },
    pagination: PaginationParams,
  ): Promise<{ data: User[]; total: number }> {
    const where: Prisma.UserWhereInput = {
      company_id: companyId,
      deleted_at: null,
      ...(filters.role   !== undefined && { role:   filters.role }),
      ...(filters.active !== undefined && { active: filters.active }),
      ...(filters.search !== undefined && {
        name: { contains: filters.search, mode: 'insensitive' },
      }),
    }

    const [data, total] = await this.db.$transaction([
      this.db.user.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip:    getPrismaSkip(pagination),
        take:    pagination.limit,
      }),
      this.db.user.count({ where }),
    ])

    return { data, total }
  }

  // Atualiza usuario por id — company_id verificado no service antes desta chamada
  async update(id: string, data: UpdateUserData): Promise<User> {
    return this.db.user.update({
      where: { id },
      data:  {
        ...(data.name      !== undefined && { name:       data.name }),
        ...(data.phone     !== undefined && { phone:      data.phone }),
        ...(data.avatarUrl !== undefined && { avatar_url: data.avatarUrl }),
        ...(data.role      !== undefined && { role:       data.role }),
        ...(data.active    !== undefined && { active:     data.active }),
      },
    })
  }
}