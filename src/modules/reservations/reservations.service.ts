import { prisma } from '@/config/database'
import {
  NotFoundError,
  ConflictError,
  ValidationError,
} from '@/shared/errors'
import { buildPaginatedResult } from '@/shared/utils/pagination'
import type {
  AuthenticatedUser,
  PaginatedResult,
  PaginationParams,
} from '@/shared/types/common'
import { auditService, AuditAction } from '@/modules/audit/audit.service'
import { ReservationRepository } from './reservations.repository'
import { ChairBlockRepository } from '@/modules/chair_blocks/chair_blocks.repository'
import { FinancialRepository } from '@/modules/financial/repositories/financial.repository'
import { FinancialService } from '@/modules/financial/services/financial.service'
import {
  toReservationDto,
  calcTotalDays,
  calcAmounts,
  ReservationStatus,
  type ReservationDto,
  type CreateReservationBody,
  type UpdateReservationStatusBody,
  type ListReservationsQuery,
} from './reservations.schema'

// =============================================================================
// Reservations Service
// =============================================================================
//
// Regras de negocio:
//
//   create:
//     1. Verifica se client_id e chair_id pertencem a mesma empresa (via where company_id).
//     2. Anti-overbooking: verifica sobreposicao de datas para a poltrona.
//     3. Verifica que a poltrona nao esta em status incompativel (maintenance/inactive).
//     4. Calcula total_days, total_amount, final_amount automaticamente.
//     5. Cria reserva com status=pending.
//     6. Atualiza status da poltrona para reserved.
//     7. Registra auditoria.
//
//   updateStatus:
//     Transicoes validas:
//       pending   → confirmed | cancelled
//       confirmed → cancelled
//       cancelled → (sem transicao — estado final)
//       completed → (sem transicao — estado final)
//     Ao cancelar: poltrona volta para available.
//
//   remove (soft delete):
//     Apenas reservas em pending podem ser removidas.
//     Cancela a reserva e libera a poltrona.
// =============================================================================

export interface RequestContext {
  ip?:        string | null
  userAgent?: string | null
}

// Statuses de poltrona incompativeis com nova reserva
const INCOMPATIBLE_CHAIR_STATUSES = ['maintenance', 'inactive', 'sanitization'] as const

const repository = new ReservationRepository(prisma)
const financialRepository = new FinancialRepository(prisma)
const financialService = new FinancialService(financialRepository)

export const reservationsService = {
  async findAll(
    companyId: string,
    filters:   ListReservationsQuery,
  ): Promise<PaginatedResult<ReservationDto>> {
    const pagination: PaginationParams = { page: filters.page, limit: filters.limit }

    const { data, total } = await repository.findAll(
      companyId,
      { clientId: filters.clientId, chairId: filters.chairId, status: filters.status },
      pagination,
    )

    return buildPaginatedResult(data.map(toReservationDto), total, pagination)
  },

  async findById(id: string, companyId: string): Promise<ReservationDto> {
    const reservation = await repository.findById(id, companyId)
    if (!reservation) throw new NotFoundError('Reserva')
    return toReservationDto(reservation)
  },

  async create(
    companyId: string,
    body:      CreateReservationBody,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<ReservationDto> {
    const startDate = new Date(body.startDate)
    const endDate   = new Date(body.endDate)

    // Verificar que client pertence a empresa
    const client = await prisma.client.findFirst({
      where: { id: body.clientId, company_id: companyId, deleted_at: null },
    })
    if (!client) throw new NotFoundError('Cliente')

    // Verificar que chair pertence a empresa
    const chair = await prisma.chair.findFirst({
      where: { id: body.chairId, company_id: companyId, deleted_at: null },
    })
    if (!chair) throw new NotFoundError('Poltrona')

    // Verificar status da poltrona
    if ((INCOMPATIBLE_CHAIR_STATUSES as readonly string[]).includes(chair.status)) {
      throw new ValidationError(
        `Poltrona ${chair.code} esta em ${chair.status} e nao pode ser reservada.`,
      )
    }

    // Anti-overbooking: verificar sobreposicao de datas
    // Utilizamos lock pessimista na poltrona para evitar race conditions entre a verificacao e a criacao
        
    // Calcular valores
    const totalDays = calcTotalDays(startDate, endDate)
    const { totalAmount, finalAmount } = calcAmounts(
      body.dailyRate,
      totalDays,
      body.discount,
    )
const reservation = await prisma.$transaction(async (tx) => {
      // Anti-overbooking: verificar sobreposicao de datas
      // Utilizamos lock pessimista na poltrona para evitar race conditions entre a verificacao e a criacao
      await tx.$executeRaw`SELECT id FROM chairs WHERE id = ${body.chairId} FOR UPDATE`;

      const blockRepo = new ChairBlockRepository(tx)
      const hasBlock = await blockRepo.hasOverlap(body.chairId, startDate, endDate, tx)
      if (hasBlock) {
        throw new ConflictError(
          `A poltrona ${chair.code} possui um bloqueio de manutenção ou administrativo no período informado.`
        )
      }

      const hasOverlap = await repository.hasOverlap(
        body.chairId,
        companyId,
        startDate,
        endDate,
        undefined,
        tx,
      )
      if (hasOverlap) {
        throw new ConflictError(
          `A poltrona ${chair.code} ja possui reserva ativa para o periodo informado.`,
        )
      }

      // Criar reserva e atualizar status da poltrona
      const createdReservation = await repository.create(
        companyId,
        body,
        {
          totalDays,
          totalAmount,
          finalAmount,
        },
        tx,
      )

      await financialService.createTransaction(actor.id, companyId, {
        reservationId: createdReservation.id,
        type: 'charge',
        amount: finalAmount,
        dueDate: new Date(new Date().getTime() + 7 * 24 * 60 * 60 * 1000), // Default 7 days
        description: `Cobrança da reserva ${createdReservation.id} - Poltrona ${chair.code}`,
      })

      await tx.chair.update({
        where: { id: body.chairId },
        data:  { status: 'reserved' },
      })

      return createdReservation
    })

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.CREATE,
      entity:    'reservations',
      entityId:  reservation.id,
      newValues: {
        clientId:  body.clientId,
        chairId:   body.chairId,
        startDate: body.startDate,
        endDate:   body.endDate,
        totalDays,
        finalAmount,
      },
      ip:        ctx.ip       ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toReservationDto(reservation)
  },

  async updateStatus(
    id:        string,
    companyId: string,
    body:      UpdateReservationStatusBody,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<ReservationDto> {
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Reserva')

    // Validar transicoes permitidas
    const validTransitions: Partial<Record<ReservationStatus, ReservationStatus[]>> = {
      [ReservationStatus.pending]:   [ReservationStatus.confirmed, ReservationStatus.cancelled],
      [ReservationStatus.confirmed]: [ReservationStatus.active, ReservationStatus.cancelled],
      [ReservationStatus.active]:    [ReservationStatus.completed, ReservationStatus.cancelled],
    }

    const allowed = validTransitions[existing.status] ?? []
    if (!allowed.includes(body.status)) {
      throw new ValidationError(
        `Transicao de "${existing.status}" para "${body.status}" nao e permitida.`,
      )
    }

    // Ao cancelar: liberar a poltrona
    if (body.status === ReservationStatus.cancelled) {
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data:  { status: ReservationStatus.cancelled },
        }),
        prisma.chair.update({
          where: { id: existing.chair_id },
          data:  { status: 'available' },
        }),
      ])
    } else if (body.status === ReservationStatus.active) {
      // Quando a reserva torna-se ativa, a poltrona esta alugada
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data:  { status: ReservationStatus.active },
        }),
        prisma.chair.update({
          where: { id: existing.chair_id },
          data:  { status: 'rented' },
        }),
      ])
    } else if (body.status === ReservationStatus.completed) {
      // Quando a reserva termina, a poltrona vai para sanitizacao
      await prisma.$transaction([
        prisma.reservation.update({
          where: { id },
          data:  { status: ReservationStatus.completed },
        }),
        prisma.chair.update({
          where: { id: existing.chair_id },
          data:  { status: 'sanitization' },
        }),
      ])
    } else {
      await repository.updateStatus(id, body.status)
    }

    const updated = await repository.findById(id, companyId)

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.UPDATE,
      entity:    'reservations',
      entityId:  id,
      oldValues: { status: existing.status },
      newValues: { status: body.status },
      ip:        ctx.ip       ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return toReservationDto(updated!)
  },

  async remove(
    id:        string,
    companyId: string,
    actor:     AuthenticatedUser,
    ctx:       RequestContext,
  ): Promise<void> {
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Reserva')

    if (existing.status !== ReservationStatus.pending) {
      throw new ValidationError(
        'Somente reservas com status "pending" podem ser removidas. Use o cancelamento para outras.',
      )
    }

    await prisma.$transaction([
      prisma.reservation.update({
        where: { id },
        data:  { deleted_at: new Date(), status: ReservationStatus.cancelled },
      }),
      prisma.chair.update({
        where: { id: existing.chair_id },
        data:  { status: 'available' },
      }),
    ])

    await auditService.log({
      companyId,
      userId:    actor.id,
      action:    AuditAction.DELETE,
      entity:    'reservations',
      entityId:  id,
      oldValues: { status: existing.status, chairId: existing.chair_id },
      ip:        ctx.ip       ?? null,
      userAgent: ctx.userAgent ?? null,
    })
  },
}