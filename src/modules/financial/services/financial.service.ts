import { FinancialTransaction, CreateFinancialTransactionData, FinancialTransactionFilters } from '../financial.schema'
import { IFinancialRepository } from '../repositories/financial.repository'
import { auditService as defaultAuditService } from '@/modules/audit/audit.service'
import { Decimal } from '@prisma/client/runtime/library'
import { reservationsService } from '@/modules/reservations/reservations.service'

export class FinancialService {
  constructor(
    private repository: IFinancialRepository,
    private auditService = defaultAuditService
  ) {}

  async createTransaction(userId: string, companyId: string, data: CreateFinancialTransactionData): Promise<FinancialTransaction> {
    const transaction = await this.repository.create({
      company_id: companyId,
      reservation_id: data.reservationId,
      type: data.type,
      amount: new Decimal(data.amount),
      payment_method: data.paymentMethod,
      due_date: new Date(data.dueDate),
      description: data.description,
      metadata: data.metadata,
      status: 'pending',
    })

    await this.auditService.log({
      userId,
      companyId,
      action: 'PAYMENT',
      entity: 'FinancialTransaction',
      entityId: transaction.id,
      newValues: transaction as unknown as Record<string, unknown>,
    })

    return transaction
  }

  async updateTransactionStatus(userId: string, companyId: string, id: string, status: any, paidAt?: Date): Promise<FinancialTransaction> {
    const transaction = await this.repository.findById(id, companyId)
    if (!transaction) throw new Error('Transação não encontrada')

    const updated = await this.repository.updateStatus(id, companyId, status, paidAt)

    await this.auditService.log({
      userId,
      companyId,
      action: 'PAYMENT',
      entity: 'FinancialTransaction',
      entityId: id,
      oldValues: transaction as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    })

    return updated
  }

  async listTransactions(companyId: string, filters: FinancialTransactionFilters, skip: number, take: number) {
    const result = await this.repository.list({ ...filters, companyId }, skip, take)
    
    return {
      data: result.data,
      total: result.total,
      page: Math.floor(skip / take) + 1,
      limit: take,
      totalPages: Math.ceil(result.total / take),
    }
  }

  async confirmPayment(paymentId: string, amount: number, userId: string, companyId: string) {
    // In a real scenario, we would lookup the transaction by paymentId (Asaas ID)
    // and mark it as PAID.
    const transaction = await this.repository.findById(paymentId, companyId)
    if (!transaction) throw new Error('Transação não encontrada')

    await this.repository.updateStatus(paymentId, companyId, 'paid');
    
    await this.auditService.log({
      userId,
      companyId,
      action: 'UPDATE',
      entity: 'FinancialTransaction',
      entityId: paymentId,
      newValues: { status: 'PAID', amount },
    });

    // AUTOMATION: If this payment is linked to a reservation, confirm the reservation
    if (transaction.reservation_id) {
      await reservationsService.updateStatus(
        transaction.reservation_id,
        companyId,
        { status: 'confirmed' },
        { id: userId, companyId },
        { ip: null, userAgent: null }
      )
    }
  }
}