import { z } from 'zod'

export const ChairBlockSchema = z.object({
  company_id: z.string().uuid(),
  chair_id: z.string().uuid(),
  type: z.enum(['maintenance', 'sanitization', 'manual', 'administrative']),
  reason: z.string().min(3),
  blocked_by: z.string().uuid(),
  start_date: z.string().transform(val => new Date(val)),
  end_date: z.string().transform(val => new Date(val)),
  resolved_at: z.string().nullable().transform(val => val ? new Date(val) : null),
  resolved_by: z.string().uuid().nullable(),
  notes: z.string().nullable(),
})

export type ChairBlockBody = z.infer<typeof ChairBlockSchema>
export type ChairBlockDto = {
  id: string
  company_id: string
  chair_id: string
  type: ChairBlockBody['type']
  reason: string
  blocked_by: string
  start_date: Date
  end_date: Date
  resolved_at: Date | null
  resolved_by: string | null
  notes: string | null
  created_at: Date
  updated_at: Date
}
