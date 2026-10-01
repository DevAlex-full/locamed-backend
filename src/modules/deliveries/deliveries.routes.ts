import { FastifyInstance } from 'fastify'
import { DeliveryRepository } from './deliveries.repository'
import { prisma } from '@/config/database'
import { AuthenticatedUser } from '@/shared/types/common'
import { DeliveryBody } from './deliveries.schema'

export async function deliveryRoutes(fastify: FastifyInstance): Promise<void> {
  const repository = new DeliveryRepository(prisma)

  fastify.post('/', async (request, reply) => {
    const user = request.user as AuthenticatedUser
    if (!user) return reply.status(401).send({ message: 'Unauthorized' })
    const body = request.body as DeliveryBody
    const delivery = await repository.create(user.companyId, body)
    return delivery
  })

  fastify.get('/', async (request, reply) => {
    const user = request.user as AuthenticatedUser
    if (!user) return reply.status(401).send({ message: 'Unauthorized' })
    const deliveries = await repository.findAll(user.companyId)
    return deliveries
  })
}
