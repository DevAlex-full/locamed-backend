import { PrismaClient, Prisma } from '@prisma/client'
import { Contract, ContractFilters } from '../contracts.schema'

export interface IContractRepository {
  create(data: any): Promise<Contract>
  findById(id: string, companyId: string): Promise<Contract | null>
  findByReservation(reservationId: string, companyId: string): Promise<Contract[]>
  update(id: string, companyId: string, data: any): Promise<Contract>
  delete(id: string, companyId: string): Promise<void>
  list(filters: ContractFilters, skip: number, take: number): Promise<{ data: Contract[]; total: number }>
}

export class ContractRepository implements IContractRepository {
  constructor(private prisma: PrismaClient | Prisma.TransactionClient) {}

  async create(data: { 
    company_id: string; 
    reservation_id: string; 
    version: number; 
    storage_url: string 
  }): Promise<Contract> {
    return this.prisma.contract.create({
      data,
    }) as Promise<Contract>
  }

  async findById(id: string, companyId: string): Promise<Contract | null> {
    return this.prisma.contract.findFirst({
      where: { id, company_id: companyId },
    }) as Promise<Contract | null>
  }

  async findByReservation(reservationId: string, companyId: string): Promise<Contract[]> {
    return this.prisma.contract.findMany({
      where: { reservation_id: reservationId, company_id: companyId },
      orderBy: { version: 'desc' },
    }) as Promise<Contract[]>
  }

  async update(id: string, companyId: string, data: any): Promise<Contract> {
    return this.prisma.contract.update({
      where: { id, company_id: companyId },
      data: { 
        ...data,
      },
    }) as Promise<Contract>
  }

  async delete(id: string, _companyId: string): Promise<void> {
    await this.prisma.contract.delete({
      where: { id },
    })
  }

  async list(filters: ContractFilters, skip: number, take: number): Promise<{ data: Contract[]; total: number }> {
    const where: any = { company_id: filters.companyId }
    if (filters.reservationId) where.reservation_id = filters.reservationId

    const [data, total] = await Promise.all([
      this.prisma.contract.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: 'desc' },
      }),
      this.prisma.contract.count({ where }),
    ])

    return { data: data as Contract[], total }
  }
}