import { IAsaasAdapter } from '../types/asaas.types'
import { AsaasAdapter } from '../adapters/asaas.adapter'

export class AsaasService {
  constructor(private adapter: IAsaasAdapter = new AsaasAdapter()) {}

  async initiatePayment(customerId: string, amount: number, dueDate: Date, description: string) {
    try {
      return await this.adapter.createPayment(customerId, amount, dueDate, description)
    } catch (error) {
      console.error('[ASAAS SERVICE] Error initiating payment:', error)
      throw new Error('Failed to initiate payment via Asaas')
    }
  }

  async syncPaymentStatus(paymentId: string) {
    try {
      return await this.adapter.getPaymentStatus(paymentId)
    } catch (error) {
      console.error('[ASAAS SERVICE] Error syncing payment status:', error)
      throw new Error('Failed to sync payment status via Asaas')
    }
  }
}

export const asaasService = new AsaasService()
