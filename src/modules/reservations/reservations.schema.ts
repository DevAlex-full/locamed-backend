import { z } from 'zod'
import { ReservationStatus, PaymentStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'

// =============================================================================
// Reservations — Schema, DTOs e Tipos
// =============================================================================
//
// A reserva e o nucleo operacional do sistema.
// Conecta client + chair para um periodo de locacao.
//
// Anti-overbooking:
//   Uma poltrona nao pode ter duas reservas ativas com datas sobrepostas.
//   Verificado no service antes de criar/atualizar.
//
// Fluxo de status:
//   pending    → confirmacao aguardando
//   confirmed  → confirmada (chair: reserved)
//   active     → em andamento (chair: rented)
//   completed  → encerrada   (chair: available ou sanitization)
//   cancelled  → cancelada   (chair: available)
//
// Calculo automatico (backend):
//   total_days   = (end_date - start_date).days + 1
//   total_amount = daily_rate * total_days
//   final_amount = total_amount - discount
// =============================================================================

const dateRegex = /^\d{4}-\d{2}-\d{2}$/

export interface ReservationDto {
  id:             string
  companyId:      string
  clientId:       string
  chairId:        string
  partnerId:      string | null
  startDate:      string          // YYYY-MM-DD
  endDate:        string          // YYYY-MM-DD
  totalDays:      number
  dailyRate:      string          // Decimal → string
  totalAmount:    string
  discount:       string
  finalAmount:    string
  status:         ReservationStatus
  paymentStatus:  PaymentStatus
  paymentMethod:  string | null
  notes:          string | null
  createdAt:      string
  updatedAt:      string
  // Joins para exibicao no frontend
  clientName?:    string
  chairCode?:     string
}

// ── Helper: Prisma → DTO ──────────────────────────────────────────────────────
export function toReservationDto(r: {
  id:             string
  company_id:     string
  client_id:      string
  chair_id:       string
  partner_id:     string | null
  start_date:     Date
  end_date:       Date
  total_days:     number
  daily_rate:     Prisma.Decimal
  total_amount:   Prisma.Decimal
  discount:       Prisma.Decimal
  final_amount:   Prisma.Decimal
  status:         ReservationStatus
  payment_status: PaymentStatus
  payment_method: string | null
  notes:          string | null
  created_at:     Date
  updated_at:     Date
  client?:        { name: string } | null
  chair?:         { code: string } | null
}): ReservationDto {
  return {
    id:            r.id,
    companyId:     r.company_id,
    clientId:      r.client_id,
    chairId:       r.chair_id,
    partnerId:     r.partner_id,
    startDate:     r.start_date.toISOString().substring(0, 10),
    endDate:       r.end_date.toISOString().substring(0, 10),
    totalDays:     r.total_days,
    dailyRate:     r.daily_rate.toString(),
    totalAmount:   r.total_amount.toString(),
    discount:      r.discount.toString(),
    finalAmount:   r.final_amount.toString(),
    status:        r.status,
    paymentStatus: r.payment_status,
    paymentMethod: r.payment_method,
    notes:         r.notes,
    createdAt:     r.created_at.toISOString(),
    updatedAt:     r.updated_at.toISOString(),
    clientName:    r.client?.name,
    chairCode:     r.chair?.code,
  }
}

// ── Calculos automaticos ──────────────────────────────────────────────────────
export function calcTotalDays(startDate: Date, endDate: Date): number {
  const ms   = endDate.getTime() - startDate.getTime()
  const days = Math.floor(ms / (1000 * 60 * 60 * 24)) + 1
  return Math.max(1, days)
}

export function calcAmounts(
  dailyRate: number,
  totalDays: number,
  discount:  number,
): { totalAmount: number; finalAmount: number } {
  const totalAmount = dailyRate * totalDays
  const finalAmount = Math.max(0, totalAmount - discount)
  return { totalAmount, finalAmount }
}

// ── Schema de criacao ─────────────────────────────────────────────────────────
export const createReservationBodySchema = z
  .object({
    clientId:      z.string().uuid('clientId invalido'),
    chairId:       z.string().uuid('chairId invalido'),
    partnerId:     z.string().uuid().nullable().optional(),
    startDate:     z.string().regex(dateRegex, 'startDate deve ser YYYY-MM-DD'),
    endDate:       z.string().regex(dateRegex, 'endDate deve ser YYYY-MM-DD'),
    dailyRate:     z.number().positive('Diaria deve ser um valor positivo'),
    discount:      z.number().min(0).default(0),
    paymentMethod: z.string().trim().max(50).nullable().optional(),
    notes:         z.string().trim().nullable().optional(),
  })
  .strict()
  .refine(
    (data) => new Date(data.endDate) >= new Date(data.startDate),
    { message: 'endDate deve ser igual ou posterior a startDate', path: ['endDate'] },
  )

export type CreateReservationBody = z.infer<typeof createReservationBodySchema>

// ── Schema de atualizacao de status ──────────────────────────────────────────
export const updateReservationStatusSchema = z.object({
  status: z.nativeEnum(ReservationStatus),
}).strict()

export type UpdateReservationStatusBody = z.infer<typeof updateReservationStatusSchema>

// ── Schema de filtros para listagem ──────────────────────────────────────────
export const listReservationsQuerySchema = z.object({
  clientId: z.string().uuid().optional(),
  chairId:  z.string().uuid().optional(),
  status:   z.nativeEnum(ReservationStatus).optional(),
  page:     z.coerce.number().int().min(1).default(1),
  limit:    z.coerce.number().int().min(1).max(100).default(20),
})

export type ListReservationsQuery = z.infer<typeof listReservationsQuerySchema>

// ── Schema de params (:id) ────────────────────────────────────────────────────
export const reservationParamsSchema = z.object({
  id: z.string().uuid('ID da reserva invalido'),
})

export type ReservationParams = z.infer<typeof reservationParamsSchema>

export { ReservationStatus, PaymentStatus }