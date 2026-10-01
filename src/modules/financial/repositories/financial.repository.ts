import { PrismaClient, TransactionStatus } from '@prisma/client'
import { FinancialTransaction, FinancialTransactionFilters } from '../financial.schema'

export interface IFinancialRepository {
  create(data: any): Promise<FinancialTransaction>
  findById(id: string, companyId: string): Promise<FinancialTransaction | null>
  findByReservation(reservationId: string, companyId: string): Promise<FinancialTransaction[]>
  updateStatus(id: string, companyId: string, status: TransactionStatus, paidAt?: Date): Promise<FinancialTransaction>
  list(filters: FinancialTransactionFilters, skip: number, take: number): Promise<{ data: FinancialTransaction[]; total: number }>
}

export class FinancialRepository implements IFinancialRepository {
  constructor(private prisma: PrismaClient) {}

  async create(data: any): Promise<FinancialTransaction> {
    return this.prisma.financialTransaction.create({
      data,
    }) as Promise<FinancialTransaction>
  }

  async findById(id: string, companyId: string): Promise<FinancialTransaction | null> {
    return this.prisma.financialTransaction.findFirst({
      where: { id, company_id: companyId },
    }) as Promise<FinancialTransaction | null>
  }

  async findByReservation(reservationId: string, companyId: string): Promise<FinancialTransaction[]> {
    return this.prisma.financialTransaction.findMany({
      where: { reservation_id: reservationId, company_id: companyId },
      orderBy: { created_at: 'desc' },
    }) as Promise<FinancialTransaction[]>
  }

  async updateStatus(id: string, companyId: string, status: TransactionStatus, paidAt?: Date): Promise<FinancialTransaction> {
    return this.prisma.financialTransaction.update({
      where: { id, company_id: companyId },
      data: { status, paid_at: paidAt },
    }) as Promise<FinancialTransaction>
  }

  async list(filters: FinancialTransactionFilters, skip: number, take: number): Promise<{ data: FinancialTransaction[]; total: number }> {
    const where: any = { company_id: filters.companyId }
    if (filters.status) where.status = filters.status
    if (filters.type) where.type = filters.type
    if (filters.reservationId) where.reservation_id = filters.reservationId

    const [data, total] = await Promise.all([
      this.prisma.financialTransaction.findMany({
        where,
        skip,
        take,
        orderBy: { due_date: 'asc' },
      }),
      this.prisma.financialTransaction.count({ where }),
    ])

    return { data: data as FinancialTransaction[], total }
  }
}
