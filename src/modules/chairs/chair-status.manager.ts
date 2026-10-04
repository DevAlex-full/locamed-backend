import { ChairStatus } from './chairs.schema'

export const ChairStatusManager = {
  // Defines the hierarchy of status priority
  // If a chair has an active reservation, it MUST be in a reserved/rented state regardless of manual override
  calculateStatus(currentStatus: ChairStatus, hasActiveReservation: boolean, hasPendingReservation: boolean, isUnderMaintenance: boolean): ChairStatus {
    if (isUnderMaintenance) return 'maintenance'
    if (hasActiveReservation) return 'rented'
    if (hasPendingReservation) return 'reserved'
    return currentStatus
  },
  
  // Validates if a status transition is allowed
  canTransition(from: ChairStatus, to: ChairStatus): boolean {
    const allowedTransitions: Record<ChairStatus, ChairStatus[]> = {
      available: ['reserved', 'maintenance', 'inactive'],
      reserved: ['rented', 'available', 'cancelled'], // cancelled is not a status, but a transition to available
      rented: ['sanitization', 'maintenance'],
      sanitization: ['available', 'maintenance'],
      maintenance: ['available', 'inactive'],
      inactive: ['available', 'maintenance'],
    }
    return (allowedTransitions[from] || []).includes(to)
  }
}
