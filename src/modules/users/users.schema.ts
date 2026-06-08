import { z } from 'zod'
import { UserRole } from '@prisma/client'

// =============================================================================
// Users — Schema, DTOs e Tipos
// =============================================================================

// ── Output DTO — retornado pela API ──────────────────────────────────────────
export interface UserDto {
  id:        string
  companyId: string
  name:      string
  email:     string
  role:      UserRole
  phone:     string | null
  avatarUrl: string | null
  active:    boolean
  createdAt: string
  updatedAt: string
}

// ── GET /me — inclui dados basicos da empresa ────────────────────────────────
export interface MeDto {
  user: UserDto
  company: {
    id:     string
    name:   string
    plan:   string
    active: boolean
  }
}

// ── Input DTO para updates — camada de repositorio ───────────────────────────
// Separa a interface do banco da interface HTTP para evitar acoplamento
export interface UpdateUserData {
  name?:      string
  phone?:     string | null
  avatarUrl?: string | null
  role?:      UserRole
  active?:    boolean
}

// ── Schema de atualizacao HTTP ───────────────────────────────────────────────
// .strict() rejeita chaves desconhecidas com ZodError (422)
// Campos role e active existem no schema mas sao protegidos no service:
//   - Nao-admin que envie role/active recebe 403 Forbidden
//   - Validacao de formato (Zod) e separada de validacao de permissao (service)
export const updateUserBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome deve ter no minimo 2 caracteres')
      .max(255)
      .optional(),

    phone: z
      .string()
      .trim()
      .max(20)
      .nullable()
      .optional(),

    avatarUrl: z
      .string()
      .url('avatarUrl deve ser uma URL valida')
      .nullable()
      .optional(),

    // Campos exclusivos de admin — protegidos no service layer
    role:   z.nativeEnum(UserRole).optional(),
    active: z.boolean().optional(),
  })
  .strict('Campos desconhecidos nao sao permitidos')

export type UpdateUserBody = z.infer<typeof updateUserBodySchema>

// ── Schema de filtros para listagem ─────────────────────────────────────────
export const listUsersQuerySchema = z.object({
  role:   z.nativeEnum(UserRole).optional(),
  active: z.coerce.boolean().optional(),
  search: z.string().trim().min(1).optional(),
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>

// ── Schema de params para rotas com :id ─────────────────────────────────────
// Valida UUID antes de chamar Prisma — evita erro interno por UUID mal-formado
export const userParamsSchema = z.object({
  id: z.string().uuid('ID do usuario invalido'),
})

export type UserParams = z.infer<typeof userParamsSchema>

export { UserRole }