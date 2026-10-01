import { Commission } from '../commission.schema';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface ICommissionRepository {
  create(data: any): Promise<Commission>;
  update(id: string, companyId: string, data: any): Promise<Commission>;
  findByPartner(partnerId: string, companyId: string, filters: any, skip: number, take: number): Promise<{ data: Commission[], total: number }>;
  findByReservation(reservationId: string, companyId: string): Promise<Commission | null>;
  listByCompany(companyId: string, filters: any, skip: number, take: number): Promise<{ data: Commission[], total: number }>;
}

export class CommissionRepository implements ICommissionRepository {
  private mapToCommission(p: any): Commission {
    return {
      ...p,
      amount_cents: Math.round(Number(p.amount) * 100), // Convert Decimal to Cents
      status: p.status.toUpperCase(),
      payment_date: p.paid_at,
    } as any;
  }

  async create(data: any) {
    const p = await prisma.commission.create({ 
      data: { 
        ...data, 
        amount: data.amount_cents / 100, // Convert Cents to Decimal
        status: data.status.toLowerCase() 
      } 
    });
    return this.mapToCommission(p);
  }

  async update(id: string, companyId: string, data: any) {
    const updateData: any = { ...data };
    if (data.status) updateData.status = data.status.toLowerCase();
    if (data.amount_cents) updateData.amount = data.amount_cents / 100;
    if (data.payment_date) updateData.paid_at = data.payment_date;
    
    const p = await prisma.commission.update({
      where: { id, company_id: companyId },
      data: updateData,
    });
    return this.mapToCommission(p);
  }

  async findByPartner(partnerId: string, companyId: string, filters: any, skip: number, take: number) {
    const where = { partner_id: partnerId, company_id: companyId, ...filters };
    const [data, total] = await prisma.$transaction([
      prisma.commission.findMany({ where, skip, take, orderBy: { created_at: 'desc' } }),
      prisma.commission.count({ where }),
    ]);
    return { data: data.map(this.mapToCommission), total };
  }

  async findByReservation(reservationId: string, companyId: string) {
    const p = await prisma.commission.findFirst({ 
      where: { reservation_id: reservationId, company_id: companyId } 
    });
    return p ? this.mapToCommission(p) : null;
  }

  async listByCompany(companyId: string, filters: any, skip: number, take: number) {
    const where = { company_id: companyId, ...filters };
    const [data, total] = await prisma.$transaction([
      prisma.commission.findMany({ where, skip, take, orderBy: { created_at: 'desc' } }),
      prisma.commission.count({ where }),
    ]);
    return { data: data.map(this.mapToCommission), total };
  }
}
