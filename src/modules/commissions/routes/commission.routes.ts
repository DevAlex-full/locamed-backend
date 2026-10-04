import { FastifyInstance } from 'fastify';
import { CommissionSchema } from '../commission.schema';
import { CommissionService } from '../services/commission.service';
import { CommissionRepository } from '../repositories/commission.repository';

export async function commissionRoutes(fastify: FastifyInstance) {
  const repository = new CommissionRepository();
  const service = new CommissionService(repository);

  fastify.post('/', async (request, reply) => {
    try {
      const data = CommissionSchema.parse(request.body);
      const { userId, companyId } = request.user as AuthenticatedUser;
      const commission = await service.calculateAndCreate(userId, companyId, data);
      return reply.status(201).send(commission);
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });

  fastify.get('/', async (request) => {
    const { companyId } = request.user as AuthenticatedUser;
    const { page = 1, limit = 20, ...filters } = request.query as any;
    const skip = (page - 1) * limit;
    
    const result = await service.listByCompany(companyId, filters, skip, limit);
    return {
      data: result.data,
      total: result.total,
      page,
      limit,
      totalPages: Math.ceil(result.total / limit),
    };
  });

  fastify.patch('/:id/pay', async (request, reply) => {
    try {
      const { id } = request.params as any;
      const { userId, companyId } = request.user as AuthenticatedUser;
      const { paymentDate } = request.body as any;
      
      if (!paymentDate) return reply.status(400).send({ error: 'paymentDate is required' });
      
      const commission = await service.markAsPaid(userId, companyId, id, new Date(paymentDate));
      return commission;
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}