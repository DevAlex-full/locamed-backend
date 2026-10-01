export enum AsaasPaymentStatus {
  PENDING = 'PENDING',
  RECEIVED = 'RECEIVED',
  OVERDUE = 'OVERDUE',
  CONFIRMED = 'CONFIRMED',
  REFUNDED = 'REFUNDED'
}

export interface AsaasCustomer {
  id?: string
  name: string
  cpfCnpj: string
  email: string
  phone: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
}

export interface AsaasPayment {
  id: string
  paymentMethod: string
  value: number
  dueDate: string
  status: AsaasPaymentStatus
  paymentUrl?: string
  invoiceUrl?: string
}

export interface AsaasPaymentResponse {
  id: string
  paymentUrl?: string
  invoiceUrl?: string
}

export interface IAsaasAdapter {
  createCustomer(customer: AsaasCustomer): Promise<{ id: string }>
  createPayment(customerId: string, amount: number, dueDate: Date, description: string): Promise<AsaasPaymentResponse>
  getPaymentStatus(paymentId: string): Promise<{ status: AsaasPaymentStatus }>
  refundPayment(paymentId: string, value: number): Promise<{ id: string }>
}

import { z } from 'zod';

export const AsaasWebhookSchema = z.object({
  event: z.string(),
  payment: z.object({
    id: z.string(),
    value: z.coerce.number(),
    status: z.string(),
    paymentMethod: z.string(),
    dueDate: z.string(),
  }),
});

export type AsaasWebhookPayload = z.infer<typeof AsaasWebhookSchema>;
