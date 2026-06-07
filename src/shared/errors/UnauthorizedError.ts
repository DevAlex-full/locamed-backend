import { AppError } from './AppError'

// 401 — Usuário não autenticado (sem token ou token inválido)
export class UnauthorizedError extends AppError {
  constructor(message: string = 'Autenticação necessária') {
    super(message, 401, 'UNAUTHORIZED')
  }
}