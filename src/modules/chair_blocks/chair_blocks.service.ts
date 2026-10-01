import { prisma } from '@/config/database'
import { NotFoundError, ConflictError } from '@/shared/errors'
import { ChairBlockRepository } from './chair_blocks.repository'
import { ChairBlockBody } from './chair_blocks.schema'
import type { PaginationParams } from '@/shared/types/common'

export const chairBlockService = {
  async create(
    companyId: string,
    userId:    string,
    body:      ChairBlockBody,
  ) {
    const repository = new ChairBlockRepository(prisma)
    const hasOverlap = await repository.hasOverlap(
      body.chair_id, 
      new Date(body.start_date), 
      new Date(body.end_date)
    )
    if (hasOverlap) {
      throw new ConflictError('A poltrona ja possui um bloqueio no periodo informado.')
    }
    return repository.create(companyId, userId, body)
  },
  async findAll(
    companyId: string,
    pagination: PaginationParams,
  ) {
    const repository = new ChairBlockRepository(prisma)
    return repository.findAll(companyId, pagination)
  },
  async remove(id: string, companyId: string) {
    const repository = new ChairBlockRepository(prisma)
    const block = await repository.findById(id, companyId)
    if (!block) throw new NotFoundError('Bloqueio')
    return repository.softDelete(id)
  }
}
