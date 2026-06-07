// =============================================================================
// Tipos Globais — Reutilizados em toda a aplicação
// =============================================================================

// ── Roles do sistema ──────────────────────────────────────────────────────────
// Deve estar alinhado com o enum `UserRole` no Prisma schema (Etapa 2).
export const UserRoles = {
  SUPER_ADMIN: 'super_admin',
  ADMIN: 'admin',
  OPERATOR: 'operator',
  DRIVER: 'driver',
  MEDICAL_PARTNER: 'medical_partner',
  CLINIC_PARTNER: 'clinic_partner',
} as const

export type UserRole = (typeof UserRoles)[keyof typeof UserRoles]

// ── Usuário autenticado ───────────────────────────────────────────────────────
// Estrutura extraída do JWT Supabase pelo middleware authenticate.ts (Etapa 4).
// O companyId vem do campo app_metadata.company_id do token — nunca do body.
export interface AuthenticatedUser {
  id: string         // UUID — igual ao auth.users.id do Supabase
  companyId: string  // UUID — extraído do JWT, nunca do request body
  role: UserRole     // Extraído do JWT app_metadata
  email: string      // Email do usuário autenticado
}

// ── Paginação ─────────────────────────────────────────────────────────────────
export interface PaginationParams {
  page: number   // Página atual (começa em 1)
  limit: number  // Itens por página (máx 100)
}

export interface PaginatedResult<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// ── Resposta padrão da API ────────────────────────────────────────────────────
export interface ApiSuccessResponse<T = unknown> {
  success: true
  data: T
  message?: string
}

export interface ApiErrorResponse {
  success: false
  error: string
  message: string
  details?: Record<string, string[]>
}

export type ApiResponse<T = unknown> = ApiSuccessResponse<T> | ApiErrorResponse

// ── Soft Delete ───────────────────────────────────────────────────────────────
// Entidades com soft delete sempre têm este campo.
// Queries SEMPRE filtram deleted_at: null nos repositories.
export interface SoftDeletable {
  deleted_at: Date | null
}

// ── Timestamps padrão ─────────────────────────────────────────────────────────
export interface Timestamps {
  created_at: Date
  updated_at: Date
}