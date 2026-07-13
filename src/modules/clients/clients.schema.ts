import { z } from 'zod'
import { maskCPF, unmaskCPF, isValidCPF } from '@/shared/utils/mask'

// =============================================================================
// Clients — Schema, DTOs e Tipos
// =============================================================================
//
// O modelo Client representa pacientes pos-cirurgicos que alugarao poltronas.
// Campos especificos do contexto medico: doctor, hospital, surgery_date.
//
// Soft delete: o modelo nao tem campo `active` — usa deleted_at exclusivamente.
// Queries SEMPRE filtram deleted_at: null.
//
// CPF: armazenado com mascara (000.000.000-00) pois @db.VarChar(14) comporta
// exatamente o formato mascarado. O schema normaliza na entrada:
//   unmask → validate → mask → store
// =============================================================================

// ── Output DTO — formato da resposta da API ───────────────────────────────────
export interface ClientDto {
  id:           string
  companyId:    string
  name:         string
  cpf:          string
  rg:           string | null
  birthDate:    string | null   // ISO 8601 date (YYYY-MM-DD)
  phone:        string
  whatsapp:     string | null
  email:        string | null
  zipCode:      string | null
  address:      string | null
  number:       string | null
  complement:   string | null
  neighborhood: string | null
  city:         string | null
  state:        string | null
  doctor:       string | null
  hospital:     string | null
  surgeryDate:  string | null   // ISO 8601 date (YYYY-MM-DD)
  notes:        string | null
  createdAt:    string          // ISO 8601 datetime
  updatedAt:    string
}

// ── Helper: Client Prisma → ClientDto ────────────────────────────────────────
export function toClientDto(client: {
  id:           string
  company_id:   string
  name:         string
  cpf:          string
  rg:           string | null
  birth_date:   Date | null
  phone:        string
  whatsapp:     string | null
  email:        string | null
  zip_code:     string | null
  address:      string | null
  number:       string | null
  complement:   string | null
  neighborhood: string | null
  city:         string | null
  state:        string | null
  doctor:       string | null
  hospital:     string | null
  surgery_date: Date | null
  notes:        string | null
  created_at:   Date
  updated_at:   Date
}): ClientDto {
  return {
    id:           client.id,
    companyId:    client.company_id,
    name:         client.name,
    cpf:          client.cpf,
    rg:           client.rg,
    birthDate:    client.birth_date?.toISOString().substring(0, 10) ?? null,
    phone:        client.phone,
    whatsapp:     client.whatsapp,
    email:        client.email,
    zipCode:      client.zip_code,
    address:      client.address,
    number:       client.number,
    complement:   client.complement,
    neighborhood: client.neighborhood,
    city:         client.city,
    state:        client.state,
    doctor:       client.doctor,
    hospital:     client.hospital,
    surgeryDate:  client.surgery_date?.toISOString().substring(0, 10) ?? null,
    notes:        client.notes,
    createdAt:    client.created_at.toISOString(),
    updatedAt:    client.updated_at.toISOString(),
  }
}

// ── Regex para data no formato YYYY-MM-DD ─────────────────────────────────────
const dateRegex = /^\d{4}-\d{2}-\d{2}$/

// ── Schema de criacao ─────────────────────────────────────────────────────────
export const createClientBodySchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, 'Nome deve ter no minimo 2 caracteres')
      .max(255),

    cpf: z
      .string()
      .trim()
      .transform((val) => unmaskCPF(val))
      .refine((val) => isValidCPF(val), { message: 'CPF invalido' })
      .transform((val) => maskCPF(val)), // armazena com mascara

    rg: z.string().trim().max(20).nullable().optional(),

    birthDate: z
      .string()
      .regex(dateRegex, 'birthDate deve ser YYYY-MM-DD')
      .nullable()
      .optional(),

    phone: z
      .string()
      .trim()
      .min(10, 'Telefone deve ter no minimo 10 digitos')
      .max(20),

    whatsapp:  z.string().trim().max(20).nullable().optional(),

    email: z
      .string()
      .trim()
      .email('E-mail invalido')
      .nullable()
      .optional(),

    zipCode:      z.string().trim().max(9).nullable().optional(),
    address:      z.string().trim().max(500).nullable().optional(),
    number:       z.string().trim().max(20).nullable().optional(),
    complement:   z.string().trim().max(100).nullable().optional(),
    neighborhood: z.string().trim().max(100).nullable().optional(),
    city:         z.string().trim().max(100).nullable().optional(),

    state: z
      .string()
      .trim()
      .length(2, 'Estado deve ter 2 caracteres (ex: SP)')
      .toUpperCase()
      .nullable()
      .optional(),

    doctor:   z.string().trim().max(255).nullable().optional(),
    hospital: z.string().trim().max(255).nullable().optional(),

    surgeryDate: z
      .string()
      .regex(dateRegex, 'surgeryDate deve ser YYYY-MM-DD')
      .nullable()
      .optional(),

    notes: z.string().trim().nullable().optional(),
  })
  .strict('Campos desconhecidos nao sao permitidos')

export type CreateClientBody = z.infer<typeof createClientBodySchema>

// ── Schema de atualizacao — todos os campos opcionais ─────────────────────────
export const updateClientBodySchema = z
  .object({
    name: z.string().trim().min(2).max(255).optional(),

    cpf: z
      .string()
      .trim()
      .transform((val) => unmaskCPF(val))
      .refine((val) => isValidCPF(val), { message: 'CPF invalido' })
      .transform((val) => maskCPF(val))
      .optional(),

    rg:           z.string().trim().max(20).nullable().optional(),
    birthDate:    z.string().regex(dateRegex).nullable().optional(),
    phone:        z.string().trim().min(10).max(20).optional(),
    whatsapp:     z.string().trim().max(20).nullable().optional(),
    email:        z.string().trim().email().nullable().optional(),
    zipCode:      z.string().trim().max(9).nullable().optional(),
    address:      z.string().trim().max(500).nullable().optional(),
    number:       z.string().trim().max(20).nullable().optional(),
    complement:   z.string().trim().max(100).nullable().optional(),
    neighborhood: z.string().trim().max(100).nullable().optional(),
    city:         z.string().trim().max(100).nullable().optional(),
    state:        z.string().trim().length(2).toUpperCase().nullable().optional(),
    doctor:       z.string().trim().max(255).nullable().optional(),
    hospital:     z.string().trim().max(255).nullable().optional(),
    surgeryDate:  z.string().regex(dateRegex).nullable().optional(),
    notes:        z.string().trim().nullable().optional(),
  })
  .strict('Campos desconhecidos nao sao permitidos')

export type UpdateClientBody = z.infer<typeof updateClientBodySchema>

// ── Schema de filtros para listagem ──────────────────────────────────────────
export const listClientsQuerySchema = z.object({
  search: z.string().trim().min(1).optional(), // busca por nome, CPF ou telefone
  page:   z.coerce.number().int().min(1).default(1),
  limit:  z.coerce.number().int().min(1).max(100).default(20),
})

export type ListClientsQuery = z.infer<typeof listClientsQuerySchema>

// ── Schema de params (:id) ────────────────────────────────────────────────────
export const clientParamsSchema = z.object({
  id: z.string().uuid('ID do cliente invalido'),
})

export type ClientParams = z.infer<typeof clientParamsSchema>