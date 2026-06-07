import {
  type FastifyRequest,
  type FastifyReply,
  type HookHandlerDoneFunction,
} from 'fastify'
import { type UserRole } from '@/shared/types/common'
import { ForbiddenError, UnauthorizedError } from '@/shared/errors'

// =============================================================================
// Middleware RBAC — Role-Based Access Control
// =============================================================================
//
// Factory que retorna um preHandler do Fastify para verificar o role do usuario.
// Deve sempre ser usado APOS authenticate():
//
//   { preHandler: [authenticate, authorize([UserRoles.ADMIN])] }
//
// Uso por modulo:
//
//   // Apenas admins e operators podem criar clientes:
//   { preHandler: [authenticate, authorize([UserRoles.ADMIN, UserRoles.OPERATOR])] }
//
//   // Apenas admins:
//   { preHandler: [authenticate, authorize([UserRoles.ADMIN])] }
//
//   // Parceiros medicos e clinicas podem consultar disponibilidade:
//   { preHandler: [authenticate, authorize([
//       UserRoles.ADMIN,
//       UserRoles.OPERATOR,
//       UserRoles.MEDICAL_PARTNER,
//       UserRoles.CLINIC_PARTNER,
//     ])]
//   }
//
// Por que padrao callback e nao async?
//   authorize so executa checagens sincronas (sem Promises, sem I/O).
//   Usar `async` sem `await` dispararia @typescript-eslint/require-await.
//   O padrao callback (request, reply, done) => void e a alternativa
//   idiomatica do Fastify para preHandlers sincronos.
//   Erros passados para done(error) sao encaminhados ao error-handler global.
//
// Acesso granular (isolamento de recursos proprios):
//   Verificacoes de "o parceiro so pode ver as proprias reservas" NAO ficam aqui.
//   Elas ficam nos services/repositories, que filtram por request.user.id
//   ou request.user.companyId. Este middleware cuida apenas do nivel de role.
// =============================================================================

export function authorize(allowedRoles: UserRole[]): (
  request: FastifyRequest,
  reply: FastifyReply,
  done: HookHandlerDoneFunction,
) => void {
  return function checkRole(
    request: FastifyRequest,
    _reply: FastifyReply,
    done: HookHandlerDoneFunction,
  ): void {
    // Seguranca: authorize() chamado sem authenticate() antes
    // Nao deve acontecer em producao — indica erro de configuracao de rota
    if (!request.user) {
      request.log.error(
        { reqId: request.id, url: request.url, method: request.method },
        'authorize() chamado sem authenticate() — configuracao de rota incorreta',
      )
      done(new UnauthorizedError('Autenticacao necessaria.'))
      return
    }

    // Verificar se o role do usuario esta na lista de roles permitidos
    if (!allowedRoles.includes(request.user.role)) {
      request.log.warn(
        {
          reqId:         request.id,
          userId:        request.user.id,
          companyId:     request.user.companyId,
          userRole:      request.user.role,
          allowedRoles,
          url:           request.url,
          method:        request.method,
        },
        'Acesso negado por RBAC',
      )

      done(
        new ForbiddenError(
          `Acesso negado. Requer um dos seguintes perfis: ${allowedRoles.join(', ')}.`,
        ),
      )
      return
    }

    // Role valido — continuar para o handler da rota
    done()
  }
}