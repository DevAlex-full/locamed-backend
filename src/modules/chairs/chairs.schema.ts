import { z } from 'zod'
import { ChairStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'

// =============================================================================
// Chairs — Schema, DTOs e Tipos
// =============================================================================
//
// A poltrona e o ativo fisico central do sistema. Cada poltrona tem:
//   - code:            codigo interno unico por empresa (ex: "POL-001")
//   - patrimonyNumber: numero de patrimonio (controle de ativos)
//   - status:          estado operacional atual (ChairStatus enum)
//   - acquisitionValue: valor de aquisicao (Decimal no banco → string no DTO)
//
// Soft delete: campo deleted_at (mesmo padrao de clients).
//
// Statuses manuais (admin/operator podem definir via API):
//   available, maintenance, sanitization, inactive
//
// Statuses gerenciados pelo modulo Reservas (futuro):
//   reserved, in_delivery, rented, in_pickup
// =============================================================================

// ── Output DTO — formato da resposta da API ───────────────────────────────────
export interface ChairDto {
  id:               string
  companyId:        string
  code:             string
  patrimonyNumber:  string | null
  model:            string | null
  manufacturer:     string | null
  acquisitionDate:  string | null   // YYYY-MM-DD
  acquisitionValue: string | null   // Decimal serializado como string
  status:           ChairStatus
  notes:            string | null
  createdAt:        string
  updatedAt:        string
}

// ── Helper: Chair Prisma → ChairDto ──────────────────────────────────────────
export function toChairDto(chair: {
  id:                string
  company_id:        string
  code:              string
  patrimony_number:  string | null
  model:             string | null
  manufacturer:      string | null
  acquisition_date:  Date | null
  acquisition_value: Prisma.Decimal | null
  status:            ChairStatus
  notes:             string | null
  created_at:        Date
  updated_at:        Date
}): ChairDto {
  return {
    id:               chair.id,
    companyId:        chair.company_id,
    code:             chair.code,
    patrimonyNumber:  chair.patrimony_number,
    model:            chair.model,
    manufacturer:     chair.manufacturer,
    acquisitionDate:  chair.acquisition_date?.toISOString().substring(0, 10) ?? null,
    acquisitionValue: chair.acquisition_value?.toString() ?? null,
    status:           chair.status,
    notes:            chair.notes,
    createdAt:        chair.created_at.toISOString(),
    updatedAt:        chair.updated_at.toISOString(),
  }
}

// ── Regex para data YYYY-MM-DD ────────────────────────────────────────────────
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// ── Statuses permitidos para alteracao manual ─────────────────────────────────
// reserved, in_delivery, rented, in_pickup sao gerenciados pelo modulo Reservas
export const manualChairStatuses = [
  ChairStatus.available,
  ChairStatus.maintenance,
  ChairStatus.sanitization,
  ChairStatus.inactive,
] as const

// ── Schema de criacao ─────────────────────────────────────────────────────────
export const createChairBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1, 'Codigo e obrigatorio')
      .max(50, 'Codigo pode ter no maximo 50 caracteres')
      .toUpperCase(),

    patrimonyNumber: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    model: z
      .string()
      .trim()
      .max(255)
      .nullable()
      .optional(),

    manufacturer: z
      .string()
      .trim()
      .max(255)
      .nullable()
      .optional(),

    acquisitionDate: z
      .string()
      .regex(dateRegex, 'acquisitionDate deve ser YYYY-MM-DD')
      .nullable()
      .optional(),

    acquisitionValue: z
      .number()
      .positive('Valor de aquisicao deve ser positivo')
      .nullable()
      .optional(),

    status: z
      .enum(
        [
          ChairStatus.available,
          ChairStatus.maintenance,
          ChairStatus.sanitization,
          ChairStatus.inactive,
        ],
        { errorMap: () => ({ message: 'Status invalido para criacao manual' }) },
      )
      .default(ChairStatus.available),

    notes: z.string().trim().nullable().optional(),
  })
  .strict('Campos desconhecidos nao sao permitidos')

export type CreateChairBody = z.infer<typeof createChairBodySchema>

// ── Schema de atualizacao — todos os campos opcionais ─────────────────────────
export const updateChairBodySchema = z
  .object({
    code: z
      .string()
      .trim()
      .min(1)
      .max(50)
      .toUpperCase()
      .optional(),

    patrimonyNumber:  z.string().trim().max(100).nullable().optional(),
    model:            z.string().trim().max(255).nullable().optional(),
    manufacturer:     z.string().trim().max(255).nullable().optional(),

    acquisitionDate: z
      .string()
      .regex(dateRegex, 'acquisitionDate deve ser YYYY-MM-DD')
      .nullable()
      .optional(),

    acquisitionValue: z
      .number()
      .positive()
      .nullable()
      .optional(),

    status: z
      .enum(
        [
          ChairStatus.available,
          ChairStatus.maintenance,
          ChairStatus.sanitization,
          ChairStatus.inactive,
        ],
        { errorMap: () => ({ message: 'Status invalido para alteracao manual' }) },
      )
      .optional(),

    notes: z.string().trim().nullable().optional(),
  })
  .strict('Campos desconhecidos nao sao permitidos')

export type UpdateChairBody = z.infer<typeof updateChairBodySchema>

// ── Schema de filtros para listagem ──────────────────────────────────────────
export const listChairsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),   // codigo, modelo ou fabricante
  status: z.nativeEnum(ChairStatus).optional(),  // filtro por status
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

export type ListChairsQuery = z.infer<typeof listChairsQuerySchema>

// ── Schema de params (:id) ────────────────────────────────────────────────────
export const chairParamsSchema = z.object({
  id: z.string().uuid('ID da poltrona invalido'),
})

export type ChairParams = z.infer<typeof chairParamsSchema>

// Re-export para uso nos services e rotas
export { ChairStatus }