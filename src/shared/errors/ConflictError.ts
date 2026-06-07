import { AppError } from './AppError'

// 409 — Conflito de dados (overbooking, CPF duplicado, etc.)
export class ConflictError extends AppError {
  constructor(message: string = 'Conflito de dados') {
    super(message, 409, 'CONFLICT')
  }
}