// =============================================================================
// AppError — Classe base para todos os erros operacionais da aplicação
// =============================================================================
//
// Diferencia erros conhecidos (operacionais) de erros inesperados do sistema.
// O error-handler global usa `isOperational` para decidir o nível de log
// e a resposta enviada ao cliente.
//
// Erros operacionais (isOperational = true):
//   → São logados como warn ou info
//   → Mensagem original é enviada ao cliente
//   → São situações esperadas: não encontrado, acesso negado, etc.
//
// Erros não-operacionais (isOperational = false):
//   → São logados como error com stack trace completo
//   → Mensagem genérica é enviada ao cliente
//   → Requerem investigação do time de engenharia
// =============================================================================

export class AppError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly isOperational: boolean

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
  ) {
    super(message)

    this.name = this.constructor.name
    this.statusCode = statusCode
    this.code = code
    this.isOperational = isOperational

    // Mantém o stack trace apontando para onde o erro foi lançado,
    // não para este construtor.
    Error.captureStackTrace(this, this.constructor)
  }
}