import { Partner, UpdatePartnerData } from '../partner.schema';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IPartnerRepository {
  create(data: any): Promise<Partner>;
  update(id: string, companyId: string, data: UpdatePartnerData): Promise<Partner>;
  list(companyId: string, filters: any, skip: number, take: number): Promise<{ data: Partner[], total: number }>;
  softDelete(id: string, companyId: string): Promise<void>;
  findByReferralCode(code: string): Promise<Partner | null>;
}

export class PartnerRepository implements IPartnerRepository {
  private mapToPartner(p: any): Partner {
    return {
      ...p,
      commission_rate: Number(p.commission_rate),
    };
  }

  async create(data: any) {
    const p = await prisma.partner.create({ data });
    return this.mapToPartner(p);
  }

  async update(id: string, companyId: string, data: UpdatePartnerData) {
    const p = await prisma.partner.update({
      where: { id, company_id: companyId }, // FIXED: Strict IDOR check
      data: { ...data },
    });
    return this.mapToPartner(p);
  }

  async list(companyId: string, filters: any, skip: number, take: number) {
    const where = {
      company_id: companyId, // FIXED: Always filter by company
      active: filters.active ?? true,
      ...filters,
    };

    const [data, total] = await prisma.$transaction([
      prisma.partner.findMany({ where, skip, take, orderBy: { name: 'asc' } }),
      prisma.partner.count({ where }),
    ]);

    return { data: data.map(this.mapToPartner), total };
  }

  async softDelete(id: string, companyId: string) {
    await prisma.partner.update({
      where: { id, company_id: companyId }, // FIXED: Strict IDOR check
      data: { active: false, deleted_at: new Date() },
    });
  }

  async findByReferralCode(code: string) {
    const p = await prisma.partner.findFirst({ where: { referral_code: code } });
    return p ? this.mapToPartner(p) : null;
  }
}
