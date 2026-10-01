import { Partner, CreatePartnerData, UpdatePartnerData } from '../partner.schema';
import { IPartnerRepository } from '../repositories/partner.repository';
import { auditService as defaultAuditService } from '@/modules/audit/audit.service';

export class PartnerService {
  constructor(
    private repository: IPartnerRepository,
    private auditService = defaultAuditService
  ) {}

  async createPartner(userId: string, companyId: string, data: CreatePartnerData): Promise<Partner> {
    const partner = await this.repository.create({
      ...data,
      company_id: companyId,
      user_id: userId,
    });

    await this.auditService.log({
      userId,
      companyId,
      action: 'CREATE',
      entity: 'Partner',
      entityId: partner.id,
      newValues: partner as unknown as Record<string, unknown>,
    });

    return partner;
  }

  async updatePartner(userId: string, companyId: string, id: string, data: UpdatePartnerData): Promise<Partner> {
    const partner = await this.repository.update(id, companyId, data);

    await this.auditService.log({
      userId,
      companyId,
      action: 'UPDATE',
      entity: 'Partner',
      entityId: id,
      newValues: partner as unknown as Record<string, unknown>,
    });

    return partner;
  }

  async listPartners(companyId: string, filters: any, skip: number, take: number) {
    return await this.repository.list(companyId, filters, skip, take);
  }

  async deletePartner(userId: string, companyId: string, id: string): Promise<void> {
    await this.repository.softDelete(id, companyId);

    await this.auditService.log({
      userId,
      companyId,
      action: 'DELETE',
      entity: 'Partner',
      entityId: id,
    });
  }
}
