import { Commission, CreateCommissionData } from '../commission.schema';
import { ICommissionRepository } from '../repositories/commission.repository';
import { auditService as defaultAuditService } from '@/modules/audit/audit.service';

export class CommissionService {
  constructor(
    private repository: ICommissionRepository,
    private auditService = defaultAuditService
  ) {}

  async calculateAndCreate(userId: string, companyId: string, data: CreateCommissionData): Promise<Commission> {
    const commission = await this.repository.create({
      ...data,
      company_id: companyId,
    });

    await this.auditService.log({
      userId,
      companyId,
      action: 'CREATE',
      entity: 'Commission',
      entityId: commission.id,
      newValues: commission as unknown as Record<string, unknown>,
    });

    return commission;
  }

  async markAsPaid(userId: string, companyId: string, id: string, paymentDate: Date): Promise<Commission> {
    const commission = await this.repository.update(id, companyId, {
      status: 'PAID',
      payment_date: paymentDate,
    });

    await this.auditService.log({
      userId,
      companyId,
      action: 'UPDATE',
      entity: 'Commission',
      entityId: id,
      newValues: { status: 'PAID', payment_date: paymentDate },
    });

    return commission;
  }

  async listByPartner(partnerId: string, companyId: string, filters: any, skip: number, take: number) {
    return await this.repository.findByPartner(partnerId, companyId, filters, skip, take);
  }

  async listByCompany(companyId: string, filters: any, skip: number, take: number) {
    return await this.repository.listByCompany(companyId, filters, skip, take);
  }
}
