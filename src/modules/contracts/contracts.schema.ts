import { z } from 'zod'

export interface Contract {
  id: string
  company_id: string
  reservation_id: string
  version: number
  storage_url: string
  signed_at: Date | null
  signed_by: string | null
  signature_ip: string | null
  created_at: Date
  updated_at: Date
}

export const contractSchema = z.object({
  reservationId: z.string().uuid('Reserva obrigatoria'),
  version: z.number().int().min(1).default(1),
  storageUrl: z.string().url('URL do documento obrigatoria'),
  signedAt: z.string().datetime().optional(),
  signedBy: z.string().min(3, 'Nome do assinante obrigatorio').optional(),
  signatureIp: z.string().ip().optional(),
  notes: z.string().optional(),
})

export type CreateContractData = z.infer<typeof contractSchema>

export interface UpdateContractData {
  signedAt?: string
  signedBy?: string
  signatureIp?: string
  notes?: string
}

export interface ContractFilters {
  reservationId?: string
  companyId?: string
  page?: number
  limit?: number
}