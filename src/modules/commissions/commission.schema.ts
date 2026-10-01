import { z } from 'zod';

export const CommissionSchema = z.object({
  partner_id: z.string().uuid(),
  reservation_id: z.string().uuid(),
  amount_cents: z.coerce.number().int().min(0), // Cents for precision
  status: z.enum(['PENDING', 'PAID', 'CANCELLED']),
  payment_date: z.coerce.date().optional(),
  notes: z.string().optional(),
});

export type Commission = z.infer<typeof CommissionSchema> & { id: string; company_id: string; created_at: Date };
export type CreateCommissionData = z.infer<typeof CommissionSchema>;
export type UpdateCommissionData = Partial<CreateCommissionData>;
