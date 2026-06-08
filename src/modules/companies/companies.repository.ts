import { type PrismaClient, type Company } from '@prisma/client'
import type { UpdateCompanyData } from './companies.schema'

// =============================================================================
// Companies Repository
// =============================================================================
//
// A tabela companies e o tenant raiz — nao tem company_id na propria tabela.
// O isolamento e garantido pelo id: cada empresa so acessa a si mesma via
// o companyId extraido do JWT (request.user.companyId).
//
// Nao ha soft delete em companies: desativacao usa o campo `active`.
// Nao ha findAll aqui: listagem de empresas e funcionalidade de super_admin
// (Etapa futura) e sera implementada no modulo admin dedicado.
// =============================================================================

export class CompanyRepository {
  constructor(private readonly db: PrismaClient) {}

  // Busca empresa pelo id — retorna null se nao encontrada
  async findById(id: string): Promise<Company | null> {
    return this.db.company.findUnique({ where: { id } })
  }

  // Atualiza empresa pelo id — company_id verificado no service antes desta chamada
  async update(id: string, data: UpdateCompanyData): Promise<Company> {
    return this.db.company.update({
      where: { id },
      data:  {
        ...(data.name         !== undefined && { name:         data.name }),
        ...(data.email        !== undefined && { email:        data.email }),
        ...(data.phone        !== undefined && { phone:        data.phone }),
        ...(data.address      !== undefined && { address:      data.address }),
        ...(data.number       !== undefined && { number:       data.number }),
        ...(data.complement   !== undefined && { complement:   data.complement }),
        ...(data.neighborhood !== undefined && { neighborhood: data.neighborhood }),
        ...(data.city         !== undefined && { city:         data.city }),
        ...(data.state        !== undefined && { state:        data.state }),
        ...(data.zip_code     !== undefined && { zip_code:     data.zip_code }),
      },
    })
  }
}