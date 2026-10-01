import { FastifyInstance } from 'fastify';
import { AsaasWebhookPayload } from '../types/asaas.types';
import { AsaasWebhookService } from '../services/asaas.webhook.service';
import { FinancialService } from '../../services/financial.service';
import { FinancialRepository } from '../../repositories/financial.repository';
import { prisma } from '@/config/database';
import { z } from 'zod';

const AsaasWebhookSchema = z.object({
  event: z.string(),
  payment: z.object({
    id: z.string(),
    value: z.number(),
  }).optional(),
});

export async function asaasWebhookRoutes(fastify: FastifyInstance) {
  const financialRepo = new FinancialRepository(prisma);
  const financialService = new FinancialService(financialRepo);
  const service = new AsaasWebhookService(financialService);

  fastify.post('/', async (request, reply) => {
    try {
      const token = request.headers['asaas-webhook-token'] as string;
      const isValid = await service.validateToken(token);
      
      if (!isValid) {
        return reply.status(401).send({ error: 'Invalid webhook token' });
      }

      const payload = AsaasWebhookSchema.parse(request.body) as AsaasWebhookPayload;
      
      const systemUser = '00000000-0000-0000-0000-000000000000';
      const companyId = '00000000-0000-0000-0000-000000000000';

      await service.process(payload, systemUser, companyId);
      
      return reply.status(200).send({ received: true });
    } catch (error: any) {
      return reply.status(400).send({ error: error.message });
    }
  });
}
