import { z } from 'zod'

export const DeliverySchema = z.object({
  reservation_id: z.string().uuid(),
  driver_id: z.string().uuid().nullable(),
  type: z.enum(['delivery', 'pickup']),
  scheduled_at: z.string().transform(val => new Date(val)),
  address: z.string().min(5),
  notes: z.string().nullable(),
  latitude: z.string().nullable().transform(val => val ? parseFloat(val) : null),
  longitude: z.string().nullable().transform(val => val ? parseFloat(val) : null),
})

export const UpdateDeliverySchema = z.object({
  completed_at: z.string().nullable().transform(val => val ? new Date(val) : null),
  signature_url: z.string().nullable(),
  notes: z.string().nullable(),
})

export type DeliveryBody = z.infer<typeof DeliverySchema>
export type UpdateDeliveryBody = z.infer<typeof UpdateDeliverySchema>
export type DeliveryDto = {
  id: string
  company_id: string
  reservation_id: string
  driver_id: string | null
  type: 'delivery' | 'pickup'
  scheduled_at: Date
  completed_at: Date | null
  address: string
  notes: string | null
  latitude: number | null
  longitude: number | null
  signature_url: string | null
  created_at: Date
  updated_at: Date
}
