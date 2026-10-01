import { Contract, CreateContractData, UpdateContractData, ContractFilters } from '../contracts.schema'
import { IContractRepository } from '../repositories/contracts.repository'
import { auditService as defaultAuditService } from '@/modules/audit/audit.service'

export class ContractService {
  constructor(
    private repository: IContractRepository,
    private auditService = defaultAuditService
  ) {}

  async createContract(userId: string, companyId: string, data: CreateContractData): Promise<Contract> {
    const contract = await this.repository.create({
      company_id: companyId,
      reservation_id: data.reservationId,
      version: data.version ?? 1,
      storage_url: data.storageUrl,
    })

    await this.auditService.log({
      userId,
      companyId,
      action: 'CONTRACT',
      entity: 'Contract',
      entityId: contract.id,
      newValues: contract as unknown as Record<string, unknown>,
    })

    return contract
  }

  async getContract(companyId: string, id: string): Promise<Contract> {
    const contract = await this.repository.findById(id, companyId)
    if (!contract) throw new Error('Contrato não encontrado')
    return contract
  }

  async signContract(userId: string, companyId: string, id: string, data: UpdateContractData): Promise<Contract> {
    const contract = await this.repository.findById(id, companyId)
    if (!contract) throw new Error('Contrato não encontrado')

    const updated = await this.repository.update(id, companyId, {
      signed_at: data.signedAt ? new Date(data.signedAt) : null,
      signed_by: data.signedBy,
      signature_ip: data.signatureIp,
      notes: data.notes,
    })

    await this.auditService.log({
      userId,
      companyId,
      action: 'CONTRACT',
      entity: 'Contract',
      entityId: id,
      oldValues: contract as unknown as Record<string, unknown>,
      newValues: updated as unknown as Record<string, unknown>,
    })

    return updated
  }

  async listContracts(companyId: string, filters: ContractFilters, skip: number, take: number) {
    const result = await this.repository.list({ ...filters, companyId }, skip, take)
    
    return {
      data: result.data,
      total: result.total,
      page: Math.floor(skip / take) + 1,
      limit: take,
      totalPages: Math.ceil(result.total / take),
    }
  }
}

export const contractService = new ContractService(null as any)
