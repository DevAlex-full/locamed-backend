import { z } from 'zod';

export const PartnerSchema = z.object({
  name: z.string().min(2, 'Nome é obrigatório'),
  user_id: z.string().uuid('ID do usuário deve ser um UUID válido'),
  type: z.enum(['medical', 'clinic']),
  specialty: z.string().optional(),
  referral_code: z.string().min(3, 'Código de indicação é obrigatório'),
  commission_rate: z.coerce.number().min(0).max(100),
  active: z.boolean().optional(),
});

export type Partner = z.infer<typeof PartnerSchema> & { id: string; company_id: string };
export type CreatePartnerData = z.infer<typeof PartnerSchema>;
export type UpdatePartnerData = Partial<CreatePartnerData>;
