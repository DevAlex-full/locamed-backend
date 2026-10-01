import { z } from 'zod'
import { Decimal } from '@prisma/client/runtime/library'

export interface FinancialTransaction {
  id: string
  company_id: string
  reservation_id: string
  type: 'charge' | 'refund' | 'commission_payment'
  amount: Decimal
  status: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  payment_method: string | null
  asaas_id: string | null
  asaas_link: string | null
  due_date: Date
  paid_at: Date | null
  description: string
  metadata: Record<string, any>
  created_at: Date
  updated_at: Date
}

export const financialTransactionSchema = z.object({
  reservationId: z.string().uuid('Reserva obrigatoria'),
  type: z.enum(['charge', 'refund', 'commission_payment']),
  amount: z.number().positive('Valor deve ser positivo'),
  paymentMethod: z.string().optional(),
  dueDate: z.string().datetime('Data de vencimento invalida'),
  description: z.string().min(3, 'Descricao muito curta'),
  metadata: z.record(z.any()).optional().default({}),
})

export type CreateFinancialTransactionData = z.infer<typeof financialTransactionSchema>

export interface FinancialTransactionFilters {
  status?: 'pending' | 'processing' | 'paid' | 'failed' | 'refunded' | 'cancelled'
  type?: 'charge' | 'refund' | 'commission_payment'
  reservationId?: string
  companyId: string
}
