import { type PrismaClient, type Chair, ChairStatus } from '@prisma/client'
import type { Prisma } from '@prisma/client'
import { getPrismaSkip } from '@/shared/utils/pagination'
import type { PaginationParams } from '@/shared/types/common'
import type { CreateChairBody, UpdateChairBody } from './chairs.schema'

// =============================================================================
// Chairs Repository
// =============================================================================
//
// Regras obrigatorias:
//   - company_id SEMPRE nos filtros where (ADR-003)
//   - deleted_at: null em TODAS as queries de leitura
//   - status nao filtra deleted_at — uma poltrona deletada nao deve aparecer
//     independente do status
//
// Nota sobre acquisition_value (Decimal):
//   Prisma aceita number | string | Prisma.Decimal para campos Decimal.
//   Passamos o number diretamente — o driver PostgreSQL faz a conversao.
// =============================================================================

export class ChairRepository {
  constructor(private readonly db: PrismaClient) {}

  // Busca poltrona por ID dentro da empresa
  async findById(id: string, companyId: string): Promise<Chair | null> {
    return this.db.chair.findFirst({
      where: { id, company_id: companyId, deleted_at: null },
    })
  }

  // Verifica unicidade do codigo dentro da empresa
  // excludeId: exclui a propria poltrona na verificacao de UPDATE
  async findByCode(
    code:      string,
    companyId: string,
    excludeId?: string,
  ): Promise<Chair | null> {
    return this.db.chair.findFirst({
      where: {
        code,
        company_id: companyId,
        deleted_at: null,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
    })
  }

  // Lista poltronas com busca e filtro de status opcional
  async findAll(
    companyId:  string,
    search:     string | undefined,
    status:     ChairStatus | undefined,
    pagination: PaginationParams,
  ): Promise<{ data: Chair[]; total: number }> {
    const where: Prisma.ChairWhereInput = {
      company_id: companyId,
      deleted_at: null,
      ...(status !== undefined && { status }),
      ...(search !== undefined && {
        OR: [
          { code:         { contains: search, mode: 'insensitive' } },
          { model:        { contains: search, mode: 'insensitive' } },
          { manufacturer: { contains: search, mode: 'insensitive' } },
        ],
      }),
    }

    const [data, total] = await this.db.$transaction([
      this.db.chair.findMany({
        where,
        orderBy: { code: 'asc' },
        skip:    getPrismaSkip(pagination),
        take:    pagination.limit,
      }),
      this.db.chair.count({ where }),
    ])

    return { data, total }
  }

  // Cria nova poltrona
  async create(companyId: string, data: CreateChairBody): Promise<Chair> {
    return this.db.chair.create({
      data: {
        company_id:        companyId,
        code:              data.code,
        patrimony_number:  data.patrimonyNumber  ?? null,
        model:             data.model            ?? null,
        manufacturer:      data.manufacturer     ?? null,
        acquisition_date:  data.acquisitionDate  ? new Date(data.acquisitionDate) : null,
        acquisition_value: data.acquisitionValue ?? null,
        status:            data.status,
        notes:             data.notes            ?? null,
      },
    })
  }

  // Atualiza poltrona — company_id verificado no service antes
  async update(id: string, data: UpdateChairBody): Promise<Chair> {
    return this.db.chair.update({
      where: { id },
      data: {
        ...(data.code              !== undefined && { code:              data.code }),
        ...(data.patrimonyNumber   !== undefined && { patrimony_number:  data.patrimonyNumber }),
        ...(data.model             !== undefined && { model:             data.model }),
        ...(data.manufacturer      !== undefined && { manufacturer:      data.manufacturer }),
        ...(data.acquisitionDate   !== undefined && {
          acquisition_date: data.acquisitionDate ? new Date(data.acquisitionDate) : null,
        }),
        ...(data.acquisitionValue  !== undefined && { acquisition_value: data.acquisitionValue }),
        ...(data.status            !== undefined && { status:            data.status }),
        ...(data.notes             !== undefined && { notes:             data.notes }),
      },
    })
  }

  // Soft delete — define deleted_at para o timestamp atual
  async softDelete(id: string): Promise<Chair> {
    return this.db.chair.update({
      where: { id },
      data:  { deleted_at: new Date() },
    })
  }
}