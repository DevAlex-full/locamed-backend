import { z } from 'zod';

export const AvailabilitySchema = z.object({
  poltronaId: z.string(),
  startDate: z.coerce.date(),
  endDate: z.coerce.date(),
  reason: z.string().optional(),
  type: z.enum(['MAINTENANCE', 'RESERVED', 'MANUAL_BLOCK']),
});

export type Availability = z.infer<typeof AvailabilitySchema>;
export type CreateAvailabilityData = Omit<Availability, 'id'>;
