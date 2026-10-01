import { Availability, CreateAvailabilityData } from '../availability.schema';
import { IAvailabilityRepository } from '../repositories/availability.repository';

export class AvailabilityService {
  constructor(private repository: IAvailabilityRepository) {}

  async blockDate(data: CreateAvailabilityData): Promise<Availability> {
    const overlaps = await this.repository.findByPoltrona(
      data.poltronaId, 
      data.startDate, 
      data.endDate
    );

    if (overlaps.length > 0) {
      throw new Error('Este período já possui um bloqueio ativo.');
    }

    return await this.repository.create(data) as any;
  }

  async listBlocks(poltronaId: string, start: Date, end: Date) {
    return await this.repository.findByPoltrona(poltronaId, start, end);
  }

  async releaseBlock(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
