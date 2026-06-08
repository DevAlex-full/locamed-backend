import { type User } from '@prisma/client'
import { prisma } from '@/config/database'
import { NotFoundError, ForbiddenError } from '@/shared/errors'
import { UserRoles } from '@/shared/types/common'
import { buildPaginatedResult } from '@/shared/utils/pagination'
import type { AuthenticatedUser, PaginatedResult, PaginationParams } from '@/shared/types/common'
import { auditService, AuditAction } from '@/modules/audit/audit.service'
import { UserRepository } from './users.repository'
import type {
  UserDto,
  MeDto,
  UpdateUserBody,
  ListUsersQuery,
  UpdateUserData,
} from './users.schema'

// =============================================================================
// Users Service
// =============================================================================
//
// Regras de negocio:
//
//   getMe:
//     Usuario autenticado retorna seus proprios dados + dados basicos da empresa.
//
//   findAll:
//     Apenas admin e super_admin (enforce via authorize no route).
//     Filtros: role, active, search (nome parcial, case-insensitive).
//
//   findById:
//     Admin/super_admin: qualquer usuario da empresa.
//     Usuario comum: apenas a si mesmo (id == requestingUser.id).
//     Outros: 403 Forbidden.
//
//   update:
//     Admin/super_admin: pode alterar name, phone, avatarUrl, role, active.
//     Usuario comum (self): pode alterar apenas name, phone, avatarUrl.
//     Tentativa de alterar role/active sem ser admin: 403 Forbidden.
//     Tentativa de alterar outro usuario sem ser admin: 403 Forbidden.
//
//   Auditoria:
//     Toda operacao de escrita registra old_values e new_values em audit_logs.
//     Apenas campos relevantes (sem dados sensiveis como tokens ou senhas).
// =============================================================================

const repository = new UserRepository(prisma)

// ── Contexto de request para auditoria ───────────────────────────────────────
export interface RequestContext {
  ip?:        string | null
  userAgent?: string | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function isAdmin(role: string): boolean {
  return role === UserRoles.ADMIN || role === UserRoles.SUPER_ADMIN
}

function toDto(user: User): UserDto {
  return {
    id:        user.id,
    companyId: user.company_id,
    name:      user.name,
    email:     user.email,
    role:      user.role,
    phone:     user.phone,
    avatarUrl: user.avatar_url,
    active:    user.active,
    createdAt: user.created_at.toISOString(),
    updatedAt: user.updated_at.toISOString(),
  }
}

// ── Service ───────────────────────────────────────────────────────────────────

export const usersService = {
  // GET /me — dados do usuario autenticado + empresa
  async getMe(userId: string, companyId: string): Promise<MeDto> {
    const user = await repository.findByIdWithCompany(userId, companyId)

    if (!user) {
      // Nao deveria acontecer — se chegou aqui, o JWT e valido mas o usuario
      // nao existe no banco (deletado apos o login). Trata como nao encontrado.
      throw new NotFoundError('Usuario')
    }

    return {
      user: toDto(user),
      company: {
        id:     user.company.id,
        name:   user.company.name,
        plan:   user.company.plan,
        active: user.company.active,
      },
    }
  },

  // GET /users — listagem (apenas admin/super_admin, enforced na rota)
  async findAll(
    companyId: string,
    filters: ListUsersQuery,
  ): Promise<PaginatedResult<UserDto>> {
    const pagination: PaginationParams = {
      page:  filters.page,
      limit: filters.limit,
    }

    const { data, total } = await repository.findAll(
      companyId,
      {
        role:   filters.role,
        active: filters.active,
        search: filters.search,
      },
      pagination,
    )

    return buildPaginatedResult(data.map(toDto), total, pagination)
  },

  // GET /users/:id — admin ve qualquer usuario, usuario ve apenas si mesmo
  async findById(
    id: string,
    companyId: string,
    requestingUser: AuthenticatedUser,
  ): Promise<UserDto> {
    // Regra de acesso: admin ou o proprio usuario
    if (!isAdmin(requestingUser.role) && requestingUser.id !== id) {
      throw new ForbiddenError('Acesso negado.')
    }

    const user = await repository.findById(id, companyId)
    if (!user) throw new NotFoundError('Usuario')

    return toDto(user)
  },

  // PATCH /users/:id — atualizacao com protecao de role e auditoria
  async update(
    id: string,
    companyId: string,
    body: UpdateUserBody,
    requestingUser: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<UserDto> {
    const admin  = isAdmin(requestingUser.role)
    const isSelf = requestingUser.id === id

    // Apenas admin ou o proprio usuario pode atualizar
    if (!admin && !isSelf) {
      throw new ForbiddenError('Acesso negado.')
    }

    // Usuario nao-admin nao pode alterar role nem active
    if (!admin && (body.role !== undefined || body.active !== undefined)) {
      throw new ForbiddenError(
        'Sem permissao para alterar perfil de acesso ou status do usuario.',
      )
    }

    // Buscar estado atual para auditoria e validacao
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Usuario')

    // Montar payload de update — campos admin-only so incluidos se for admin
    const updateData: UpdateUserData = {
      ...(body.name      !== undefined ? { name:      body.name }      : {}),
      ...(body.phone     !== undefined ? { phone:     body.phone }     : {}),
      ...(body.avatarUrl !== undefined ? { avatarUrl: body.avatarUrl } : {}),
      ...(admin && body.role   !== undefined ? { role:   body.role }   : {}),
      ...(admin && body.active !== undefined ? { active: body.active } : {}),
    }

    const updated = await repository.update(id, updateData)

    // Registrar auditoria — apenas campos que foram efetivamente alterados
    await auditService.log({
      companyId,
      userId:    requestingUser.id,
      action:    AuditAction.UPDATE,
      entity:    'users',
      entityId:  id,
      oldValues: {
        name:   existing.name,
        phone:  existing.phone,
        role:   existing.role,
        active: existing.active,
      },
      newValues: {
        name:   updated.name,
        phone:  updated.phone,
        role:   updated.role,
        active: updated.active,
      },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toDto(updated)
  },
}