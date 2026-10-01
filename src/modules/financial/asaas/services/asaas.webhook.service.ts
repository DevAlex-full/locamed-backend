import { AsaasWebhookPayload } from '../types/asaas.types';
import { FinancialService } from '../../services/financial.service';
import { auditService as defaultAuditService } from '@/modules/audit/audit.service';

export class AsaasWebhookService {
  constructor(
    private financialService: FinancialService,
    private auditService = defaultAuditService
  ) {}

  async validateToken(token: string | undefined): Promise<boolean> {
    const secretToken = process.env.ASAAS_WEBHOOK_TOKEN || 'default_secret_token';
    return token === secretToken;
  }

  async process(payload: AsaasWebhookPayload, userId: string, companyId: string) {
    if (payload.event === 'PAYMENT_RECEIVED' && payload.payment) {
      await this.financialService.confirmPayment(payload.payment.id, payload.payment.value, userId, companyId);
    }

    await this.auditService.log({
      userId,
      companyId,
      action: 'UPDATE', // Fixed from 'WEBHOOK_RECEIVED' to standard AuditAction
      entity: 'AsaasWebhook',
      entityId: payload.payment?.id || 'N/A',
      newValues: { event: payload.event },
    });
  }
}
