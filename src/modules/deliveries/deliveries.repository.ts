import {
  type PrismaClient,
  type Delivery,
} from '@prisma/client'
import type { Prisma } from '@prisma/client'
import type { DeliveryBody } from './deliveries.schema'

export type DeliveryWithRelations = Delivery & {
  reservation: { id: string }
  client: { name: string }
}

const WITH_RELATIONS = {
  reservation: { select: { id: true } },
  client: { select: { name: true } },
} as const

export class DeliveryRepository {
  constructor(private readonly db: PrismaClient | Prisma.TransactionClient) {}

  async findById(id: string, companyId: string): Promise<DeliveryWithRelations | null> {
    return this.db.delivery.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
      include: WITH_RELATIONS,
    })
  }

  async findAll(companyId: string): Promise<DeliveryWithRelations[]> {
    return this.db.delivery.findMany({
      where: { company_id: companyId, deleted_at: null },
      include: WITH_RELATIONS,
    })
  }

  async create(
    companyId: string,
    data: DeliveryBody,
    tx?: Prisma.TransactionClient,
  ): Promise<DeliveryWithRelations> {
    const db = tx ?? this.db
    return db.delivery.create({
      data: {
        company_id: companyId,
        reservation_id: data.reservation_id,
        type: data.type,
        scheduled_at: new Date(data.scheduled_at),
        address: data.address,
        notes: data.notes,
        latitude: data.latitude,
        longitude: data.longitude,
      },
      include: WITH_RELATIONS,
    })
  }

  async update(id: string, data: Partial<DeliveryBody>): Promise<DeliveryWithRelations> {
    return this.db.delivery.update({
      where: { id },
      data: {
        ...data,
        scheduled_at: data.scheduled_at ? new Date(data.scheduled_at) : undefined,
      },
      include: WITH_RELATIONS,
    })
  }
}
