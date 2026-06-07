import { AppError } from './AppError'

export class NotFoundError extends AppError {
  constructor(resource: string = 'Recurso') {
    super(`${resource} não encontrado`, 404, 'NOT_FOUND')
  }
}