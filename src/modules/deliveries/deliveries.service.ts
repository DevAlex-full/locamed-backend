import { prisma } from '@/config/database'
import { NotFoundError } from '@/shared/errors'
import { DeliveryRepository } from './deliveries.repository'
import { DeliveryBody } from './deliveries.schema'

export const deliveryService = {
  async create(companyId: string, body: DeliveryBody) {
    const repository = new DeliveryRepository(prisma)
    return repository.create(companyId, body)
  },

  async findAll(companyId: string) {
    const repository = new DeliveryRepository(prisma)
    return repository.findAll(companyId)
  },

  async findById(id: string, companyId: string) {
    const repository = new DeliveryRepository(prisma)
    const delivery = await repository.findById(id, companyId)
    if (!delivery) throw new NotFoundError('Entrega')
    return delivery
  },

  async update(id: string, companyId: string, body: Partial<DeliveryBody>) {
    const repository = new DeliveryRepository(prisma)
    const existing = await repository.findById(id, companyId)
    if (!existing) throw new NotFoundError('Entrega')
    return repository.update(id, body)
  }
}
