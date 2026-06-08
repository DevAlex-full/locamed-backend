import { prisma } from '@/config/database'
import { NotFoundError } from '@/shared/errors'
import type { AuthenticatedUser } from '@/shared/types/common'
import { auditService, AuditAction } from '@/modules/audit/audit.service'
import { CompanyRepository } from './companies.repository'
import {
  companyToDto,
  type CompanyDto,
  type UpdateCompanyBody,
  type UpdateCompanyData,
} from './companies.schema'
import type { RequestContext } from '@/modules/users/users.service'

// =============================================================================
// Companies Service
// =============================================================================
//
// Cada empresa acessa apenas seus proprios dados.
// O companyId vem SEMPRE de request.user.companyId (nunca do body).
//
// getCurrent:
//   Retorna os dados completos da empresa atual.
//   Usada pelo frontend para exibir configuracoes e dados do perfil da empresa.
//
// updateCurrent:
//   Apenas admin e super_admin podem atualizar (enforce via authorize na rota).
//   document (CNPJ) nao pode ser alterado — identificador legal.
//   plan e active nao estao expostos aqui — gerenciados via fluxo de subscricao.
//   Registra auditoria com old_values e new_values dos campos alterados.
// =============================================================================

const repository = new CompanyRepository(prisma)

export const companiesService = {
  // GET /companies/current
  async getCurrent(companyId: string): Promise<CompanyDto> {
    const company = await repository.findById(companyId)
    if (!company) throw new NotFoundError('Empresa')
    return companyToDto(company)
  },

  // PATCH /companies/current
  async updateCurrent(
    companyId: string,
    body: UpdateCompanyBody,
    requestingUser: AuthenticatedUser,
    ctx: RequestContext,
  ): Promise<CompanyDto> {
    // Buscar estado atual para auditoria
    const existing = await repository.findById(companyId)
    if (!existing) throw new NotFoundError('Empresa')

    // Mapear body (camelCase) para o formato do banco (snake_case)
    const updateData: UpdateCompanyData = {
      ...(body.name         !== undefined ? { name:         body.name }         : {}),
      ...(body.email        !== undefined ? { email:        body.email }        : {}),
      ...(body.phone        !== undefined ? { phone:        body.phone }        : {}),
      ...(body.address      !== undefined ? { address:      body.address }      : {}),
      ...(body.number       !== undefined ? { number:       body.number }       : {}),
      ...(body.complement   !== undefined ? { complement:   body.complement }   : {}),
      ...(body.neighborhood !== undefined ? { neighborhood: body.neighborhood } : {}),
      ...(body.city         !== undefined ? { city:         body.city }         : {}),
      ...(body.state        !== undefined ? { state:        body.state }        : {}),
      ...(body.zipCode      !== undefined ? { zip_code:     body.zipCode }      : {}),
    }

    const updated = await repository.update(companyId, updateData)

    // Auditoria — captura apenas os campos que foram enviados no body
    await auditService.log({
      companyId,
      userId:    requestingUser.id,
      action:    AuditAction.UPDATE,
      entity:    'companies',
      entityId:  companyId,
      oldValues: {
        name:         existing.name,
        email:        existing.email,
        phone:        existing.phone,
        address:      existing.address,
        city:         existing.city,
        state:        existing.state,
        zip_code:     existing.zip_code,
      },
      newValues: {
        name:         updated.name,
        email:        updated.email,
        phone:        updated.phone,
        address:      updated.address,
        city:         updated.city,
        state:        updated.state,
        zip_code:     updated.zip_code,
      },
      ip:        ctx.ip ?? null,
      userAgent: ctx.userAgent ?? null,
    })

    return companyToDto(updated)
  },
}