import { AppError } from './AppError'

// 403 — Usuário autenticado mas sem permissão para este recurso (RBAC)
export class ForbiddenError extends AppError {
  constructor(message: string = 'Acesso negado') {
    super(message, 403, 'FORBIDDEN')
  }
}