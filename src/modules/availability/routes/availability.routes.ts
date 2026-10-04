import { FastifyInstance } from 'fastify';
import { AvailabilitySchema } from '../availability.schema';
import { AvailabilityService } from '../services/availability.service';
import { AvailabilityRepository } from '../repositories/availability.repository';

export async function availabilityRoutes(fastify: FastifyInstance) {
  const repository = new AvailabilityRepository();
  const service = new AvailabilityService(repository);

  fastify.post('/availability', async (request, reply) => {
    try {
      const data = AvailabilitySchema.parse(request.body);
      const block = await service.blockDate(data);
      return reply.status(201).send(block);
    } catch (error: unknown) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/availability/poltrona/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { start, end } = request.query as any;
    
    if (!start || !end) return reply.status(400).send({ error: 'Start and end dates are required' });
    
    const blocks = await service.listBlocks(id, new Date(start), new Date(end));
    return blocks;
  });

  fastify.delete('/availability/:id', async (request, reply) => {
    const { id } = request.params as any;
    await service.releaseBlock(id);
    return reply.status(204).send();
  });
}