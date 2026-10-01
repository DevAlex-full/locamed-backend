import { CreateAvailabilityData } from '../availability.schema';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export interface IAvailabilityRepository {
  create(data: CreateAvailabilityData): Promise<any>;
  findById(id: string): Promise<any | null>;
  findByPoltrona(poltronaId: string, start: Date, end: Date): Promise<any[]>;
  delete(id: string): Promise<void>;
  update(id: string, data: Partial<CreateAvailabilityData>): Promise<any>;
}

export class AvailabilityRepository implements IAvailabilityRepository {
  async create(data: CreateAvailabilityData) {
    return await prisma.chairBlock.create({ 
      data: {
        chair_id: data.poltronaId,
        type: data.type as any,
        reason: data.reason || 'Bloqueio manual',
        start_date: data.startDate,
        end_date: data.endDate,
        blocked_by: '00000000-0000-0000-0000-000000000000', 
        company_id: '00000000-0000-0000-0000-000000000000', 
      } 
    });
  }

  async findById(id: string) {
    return await prisma.chairBlock.findUnique({ where: { id } });
  }

  async findByPoltrona(poltronaId: string, start: Date, end: Date) {
    return await prisma.chairBlock.findMany({
      where: {
        chair_id: poltronaId,
        OR: [
          { start_date: { lte: end }, end_date: { gte: start } },
        ],
      },
    });
  }

  async delete(id: string) {
    await prisma.chairBlock.delete({ where: { id } });
  }

  async update(id: string, data: Partial<CreateAvailabilityData>) {
    return await prisma.chairBlock.update({
      where: { id },
      data: {
        start_date: data.startDate,
        end_date: data.endDate,
        reason: data.reason,
      } as any,
    });
  }
}
