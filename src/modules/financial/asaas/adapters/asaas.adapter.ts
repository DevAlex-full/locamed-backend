import { IAsaasAdapter, AsaasCustomer, AsaasPaymentResponse, AsaasPaymentStatus } from '../types/asaas.types'


export class AsaasAdapter implements IAsaasAdapter {
  // PENDÊNCIA EXTERNA: API Key and Base URL will be used in real implementation
  // We leave these as comments for now to avoid TS6133 while in mock mode
  // private get apiKey() { return env.ASAAS_API_KEY }
  // private get baseUrl() { return 'https://www.asaas.com/api/v3' }

  async createCustomer(_customer: AsaasCustomer): Promise<{ id: string }> {
    // PENDÊNCIA EXTERNA: Implementação manual posterior com fetch/axios
    console.log('[ASAAS ADAPTER] createCustomer - MOCK IMPLEMENTATION')
    return { id: `asaas_cust_${Math.random().toString(36).substr(2, 9)}` }
  }

  async createPayment(_customerId: string, _amount: number, _dueDate: Date, _description: string): Promise<AsaasPaymentResponse> {
    // PENDÊNCIA EXTERNA: Implementação manual posterior com fetch/axios
    console.log('[ASAAS ADAPTER] createPayment - MOCK IMPLEMENTATION')
    return {
      id: `asaas_pay_${Math.random().toString(36).substr(2, 9)}`,
      paymentUrl: `https://asaas.com/payments/mock_${Math.random().toString(36).substr(2, 9)}`,
      invoiceUrl: `https://asaas.com/invoice/mock_${Math.random().toString(36).substr(2, 9)}`
    }
  }

  async getPaymentStatus(_paymentId: string): Promise<{ status: AsaasPaymentStatus }> {
    // PENDÊNCIA EXTERNA: Implementação manual posterior
    console.log('[ASAAS ADAPTER] getPaymentStatus - MOCK IMPLEMENTATION')
    return { status: AsaasPaymentStatus.PENDING }
  }

  async refundPayment(_paymentId: string, _value: number): Promise<{ id: string }> {
    // PENDÊNCIA EXTERNA: Implementação manual posterior
    console.log('[ASAAS ADAPTER] refundPayment - MOCK IMPLEMENTATION')
    return { id: `asaas_ref_${Math.random().toString(36).substr(2, 9)}` }
  }
}
