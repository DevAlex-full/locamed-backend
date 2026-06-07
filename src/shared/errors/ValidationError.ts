import { AppError } from './AppError'

// 422 — Dados válidos sintaticamente mas inválidos semanticamente
// Usado quando a validação Zod falha ou regras de negócio rejeitam os dados.
export class ValidationError extends AppError {
  public readonly details: Record<string, string[]>

  constructor(
    message: string = 'Dados inválidos',
    details: Record<string, string[]> = {},
  ) {
    super(message, 422, 'VALIDATION_ERROR')
    this.details = details
  }
}