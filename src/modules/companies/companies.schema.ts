import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { jsonToRecord } from '@/modules/audit/audit.schema'

// =============================================================================
// Companies — Schema, DTOs e Tipos
// =============================================================================

// ── Output DTO ────────────────────────────────────────────────────────────────
export interface CompanyDto {
  id:           string
  name:         string
  document:     string          // CNPJ — exibido mas nao editavel
  email:        string
  phone:        string | null
  address:      string | null
  number:       string | null
  complement:   string | null
  neighborhood: string | null
  city:         string | null
  state:        string | null
  zipCode:      string | null
  plan:         string
  active:       boolean
  settings:     Record<string, unknown>
  createdAt:    string
  updatedAt:    string
}

// ── Mapeamento de Prisma Company para CompanyDto ──────────────────────────────
export function companyToDto(
  company: {
    id:           string
    name:         string
    document:     string
    email:        string
    phone:        string | null
    address:      string | null
    number:       string | null
    complement:   string | null
    neighborhood: string | null
    city:         string | null
    state:        string | null
    zip_code:     string | null
    plan:         string
    active:       boolean
    settings:     Prisma.JsonValue
    created_at:   Date
    updated_at:   Date
  },
): CompanyDto {
  return {
    id:           company.id,
    name:         company.name,
    document:     company.document,
    email:        company.email,
    phone:        company.phone,
    address:      company.address,
    number:       company.number,
    complement:   company.complement,
    neighborhood: company.neighborhood,
    city:         company.city,
    state:        company.state,
    zipCode:      company.zip_code,
    plan:         company.plan,
    active:       company.active,
    settings:     jsonToRecord(company.settings) ?? {},
    createdAt:    company.created_at.toISOString(),
    updatedAt:    company.updated_at.toISOString(),
  }
}

// ── Input DTO para updates — camada de repositorio ────────────────────────────
export interface UpdateCompanyData {
  name?:         string
  email?:        string
  phone?:        string | null
  address?:      string | null
  number?:       string | null
  complement?:   string | null
  neighborhood?: string | null
  city?:         string | null
  state?:        string | null
  zip_code?:     string | null  // snake_case para alinhar com o banco
}

// ── Schema de atualizacao HTTP ────────────────────────────────────────────────
// document (CNPJ) nao e editavel — identificador legal da empresa
// plan e active nao estao aqui — alterados via fluxo de subscricao futuro
export const updateCompanyBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome deve ter no minimo 2 caracteres')
      .max(255)
      .optional(),

    email: z
      .string()
      .trim()
      .email('E-mail invalido')
      .optional(),

    phone: z
      .string()
      .trim()
      .max(20)
      .nullable()
      .optional(),

    address: z
      .string()
      .trim()
      .max(500)
      .nullable()
      .optional(),

    number: z
      .string()
      .trim()
      .max(20)
      .nullable()
      .optional(),

    complement: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    neighborhood: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    city: z
      .string()
      .trim()
      .max(100)
      .nullable()
      .optional(),

    state: z
      .string()
      .trim()
      .length(2, 'Estado deve ter 2 caracteres (ex: SP, RJ)')
      .toUpperCase()
      .nullable()
      .optional(),

    zipCode: z
      .string()
      .trim()
      .max(9)
      .nullable()
      .optional(),
  })
  .strict('Campos desconhecidos nao sao permitidos')

export type UpdateCompanyBody = z.infer<typeof updateCompanyBodySchema>