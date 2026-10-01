import { FastifyInstance } from 'fastify'
import { chairBlockService } from './chair_blocks.service'
import { AuthenticatedUser } from '@/shared/types/common'
import { ChairBlockBody } from './chair_blocks.schema'

export function chairBlockRoutes(fastify: FastifyInstance): void {
  fastify.post('/', async (request, reply) => {
    const user = request.user as AuthenticatedUser
    if (!user) return reply.status(401).send({ message: 'Unauthorized' })

    const body = request.body as ChairBlockBody
    return chairBlockService.create(user.companyId, user.id, body)
  })

  fastify.get('/', async (request, reply) => {
    const user = request.user as AuthenticatedUser
    if (!user) return reply.status(401).send({ message: 'Unauthorized' })

    const { page, limit } = request.query as { page?: string; limit?: string }
    return chairBlockService.findAll(user.companyId, { 
      page: Number(page) || 1, 
      limit: Number(limit) || 10 
    })
  })

  fastify.delete('/:id', async (request, reply) => {
    const user = request.user as AuthenticatedUser
    if (!user) return reply.status(401).send({ message: 'Unauthorized' })

    const { id } = request.params as { id: string }
    await chairBlockService.remove(id, user.companyId)
    return { success: true }
  })
}
