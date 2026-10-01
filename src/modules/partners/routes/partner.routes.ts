import { FastifyInstance } from 'fastify';
import { PartnerSchema } from '../partner.schema';
import { PartnerService } from '../services/partner.service';
import { PartnerRepository } from '../repositories/partner.repository';

export async function partnerRoutes(fastify: FastifyInstance) {
  const repository = new PartnerRepository();
  const service = new PartnerService(repository);

  fastify.post('/', async (request, reply) => {
    try {
      const data = PartnerSchema.parse(request.body);
      const { userId, companyId } = request.user as any;
      const partner = await service.createPartner(userId, companyId, data);
      return reply.status(201).send(partner);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/', async (request) => {
    const { companyId } = request.user as any;
    const { page = 1, limit = 20, ...filters } = request.query as any;
    const skip = (page - 1) * limit;
    
    const result = await service.listPartners(companyId, filters, skip, limit);
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  });

  fastify.patch('/:id', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { userId, companyId } = request.user as any;
      const data = request.body as any;
      const partner = await service.updatePartner(userId, companyId, id, data);
      return partner;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.delete('/:id', async (request, reply) => {
    const { id } = request.params as any;
    const { userId, companyId } = request.user as any;
    await service.deletePartner(userId, companyId, id);
    return reply.status(204).send();
  });
}
