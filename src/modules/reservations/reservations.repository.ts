import {
  type PrismaClient,
  type Reservation,
  ReservationStatus,
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { getPrismaSkip } from '@/shared/utils/pagination'
import type { PaginationParams } from '@/shared/types/common'
import type { CreateReservationBody } from './reservations.schema'

export type ReservationWithRelations = Reservation & {
  client: { name: string } | null
  chair:  { code: string } | null
}

const WITH_RELATIONS = {
  client: { select: { name: true } },
  chair:  { select: { code: true } },
} as const

export class ReservationRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient) {}

  async findById(
    id:        string,
    companyId: string,
  ): Promise<ReservationWithRelations | null> {
    return this.db.reservation.findFirst({
      where:   { id, company_id: companyId, deleted_at: null },
      include: WITH_RELATIONS,
    })
  }

  async findAll(
    companyId:  string,
    filters:    { clientId?: string; chairId?: string; status?: ReservationStatus },
    pagination: PaginationParams,
  ): Promise<{ data: ReservationWithRelations[]; total: number }> {
    const where: Prisma.ReservationWhereInput = {
      company_id: companyId,
      deleted_at: null,
      ...(filters.clientId && { client_id: filters.clientId }),
      ...(filters.chairId  && { chair_id:  filters.chairId }),
      ...(filters.status   && { status:    filters.status }),
    }

    // FIX: Only use $transaction if we are the primary PrismaClient.
    // If we are a TransactionClient, we can't start another transaction.
    if ('$transaction' in this.db) {
      const [data, total] = await this.db.$transaction([
        this.db.reservation.findMany({
          where,
          include:  WITH_RELATIONS,
          orderBy:  { start_date: 'desc' },
          skip:     getPrismaSkip(pagination),
          take:     pagination.limit,
        }),
        this.db.reservation.count({ where }),
      ])
      return { data, total }
    } else {
      // In a transaction, execute sequentially
      const data = await this.db.reservation.findMany({
        where,
        include:  WITH_RELATIONS,
        orderBy:  { start_date: 'desc' },
        skip:     getPrismaSkip(pagination),
        take:     pagination.limit,
      })
      const total = await this.db.reservation.count({ where })
      return { data, total }
    }
  }

  async hasOverlap(
    chairId:    string,
    companyId:  string,
    startDate:  Date,
    endDate:    Date,
    excludeId?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<boolean> {
    const db = tx ?? this.db
    const count = await db.reservation.count({
      where: {
        chair_id:   chairId,
        company_id: companyId,
        deleted_at: null,
        status:     { notIn: [ReservationStatus.cancelled, ReservationStatus.completed] },
        start_date: { lte: endDate },
        end_date:   { gte: startDate },
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
    return count > 0
  }

  async create(
    companyId: string,
    data:      CreateReservationBody,
    computed:  {
      totalDays:   number
      totalAmount: number
      finalAmount: number
    },
    tx?: Prisma.TransactionClient,
  ): Promise<ReservationWithRelations> {
    const db = tx ?? this.db
    return db.reservation.create({
      data: {
        company_id:     companyId,
        client_id:      data.clientId,
        chair_id:       data.chairId,
        partner_id:     data.partnerId     ?? null,
        start_date:     new Date(data.startDate),
        end_date:       new Date(data.endDate),
        total_days:     computed.totalDays,
        daily_rate:     data.dailyRate,
        total_amount:   computed.totalAmount,
        discount:       data.discount,
        final_amount:   computed.finalAmount,
        status:         ReservationStatus.pending,
        payment_method: data.paymentMethod ?? null,
        notes:          data.notes         ?? null,
      },
      include: WITH_RELATIONS,
    })
  }

  async updateStatus(
    id:        string,
    status:    ReservationStatus,
  ): Promise<ReservationWithRelations> {
    return this.db.reservation.update({
      where:   { id },
      data:    { status },
      include: WITH_RELATIONS,
    })
  }

  async softDelete(id: string): Promise<Reservation> {
    return this.db.reservation.update({
      where: { id },
      data:  { deleted_at: new Date() },
    })
  }
}
