import { jwtVerify, errors as JoseErrors } from 'jose'
import { type FastifyRequest, type FastifyReply } from 'fastify'
import { SUPABASE_JWKS, SUPABASE_JWT_ISSUER, type SupabaseJWTPayload } from '@/config/jwt'
import { UserRoles, type UserRole } from '@/shared/types/common'
import { UnauthorizedError } from '@/shared/errors'

// =============================================================================
// Middleware de Autenticacao — JWT ECC (ES256) via JWKS
// =============================================================================
//
// Responsabilidades:
//   1. Extrair o Bearer token do header Authorization
//   2. Verificar assinatura com SUPABASE_JWKS (ES256, P-256)
//   3. Validar o issuer do token
//   4. Extrair e validar claims obrigatorias do app_metadata
//   5. Injetar request.user para handlers subsequentes
//
// Uso nas rotas:
//   { preHandler: [authenticate] }
//   { preHandler: [authenticate, authorize([UserRoles.ADMIN])] }
//
// Seguranca:
//   - Token NUNCA e logado (nem em erro)
//   - Mensagens de erro sao genericas para o cliente
//   - Detalhes tecnicos sao logados internamente via request.log
//   - JoseErrors distintos recebem mensagens distintas (apenas JWTExpired e especifico)
//
// Sobre request.user:
//   - Apos este middleware: request.user e GARANTIDO como definido
//   - companyId vem de app_metadata.company_id (configurado pelo servidor via Admin SDK)
//   - role vem de app_metadata.role (nunca de user_metadata — usuario pode alterar)
//
// JWKS (createRemoteJWKSet em jwt.ts):
//   - Lazy: busca as chaves publicas apenas na primeira verificacao
//   - Cache em memoria: nao faz request ao Supabase a cada JWT verificado
//   - Key rotation: renova automaticamente se a chave nao for encontrada no cache
// =============================================================================

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
): Promise<void> {
  // -- 1. Extrair Bearer token do header Authorization ------------------------
  const authHeader = request.headers.authorization

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new UnauthorizedError('Token de autenticacao ausente ou mal formatado.')
  }

  // authHeader.slice(7) remove "Bearer " (7 caracteres)
  const token = authHeader.slice(7)

  if (!token) {
    throw new UnauthorizedError('Token de autenticacao ausente.')
  }

  // -- 2. Verificar JWT com JWKS do Supabase ----------------------------------
  let payload: SupabaseJWTPayload

  try {
    const result = await jwtVerify<SupabaseJWTPayload>(token, SUPABASE_JWKS, {
      // Valida que o token foi emitido pelo Auth do nosso projeto Supabase
      issuer: SUPABASE_JWT_ISSUER,
    })
    payload = result.payload
  } catch (error) {
    // Token expirado: mensagem especifica para guiar o usuario a fazer login
    if (error instanceof JoseErrors.JWTExpired) {
      throw new UnauthorizedError('Sessao expirada. Faca login novamente.')
    }

    // Assinatura invalida, token malformado ou issuer incorreto:
    // mensagem generica por seguranca (nao revelar detalhes da validacao)
    if (
      error instanceof JoseErrors.JWTInvalid ||
      error instanceof JoseErrors.JWSSignatureVerificationFailed ||
      error instanceof JoseErrors.JWTClaimValidationFailed
    ) {
      throw new UnauthorizedError('Token invalido.')
    }

    // Erro de rede ou JWKS indisponivel: logar detalhes internamente
    // O JWKS e cacheado — este erro so ocorre se o Supabase estiver fora do ar
    request.log.error(
      {
        err: error,
        reqId: request.id,
        url: request.url,
        method: request.method,
      },
      'Erro ao verificar JWT — JWKS pode estar indisponivel',
    )

    throw new UnauthorizedError('Falha na autenticacao. Tente novamente.')
  }

  // -- 3. Extrair e validar claims obrigatorias do payload --------------------
  //
  // app_metadata e preenchido via Supabase Admin SDK (server-side only).
  // Um token valido do Supabase sem app_metadata indica que o usuario
  // foi criado no Auth mas nao foi configurado na aplicacao.
  const userId    = payload.sub
  const email     = payload.email
  const companyId = payload.app_metadata?.company_id
  const role      = payload.app_metadata?.role

  if (!userId || !email || !companyId || !role) {
    request.log.warn(
      {
        reqId:        request.id,
        hasUserId:    Boolean(userId),
        hasEmail:     Boolean(email),
        hasCompanyId: Boolean(companyId),
        hasRole:      Boolean(role),
      },
      'JWT valido mas com claims obrigatorias ausentes — app_metadata nao configurado',
    )

    throw new UnauthorizedError(
      'Perfil de usuario incompleto. Contate o administrador do sistema.',
    )
  }

  // -- 4. Validar que o role e um valor reconhecido pelo sistema --------------
  //
  // Protege contra tokens com roles fabricados ou desatualizados.
  const validRoles = Object.values(UserRoles) as string[]

  if (!validRoles.includes(role)) {
    request.log.warn(
      { reqId: request.id, role },
      'JWT com role desconhecido — app_metadata.role invalido',
    )

    throw new UnauthorizedError('Perfil de acesso desconhecido.')
  }

  // -- 5. Injetar usuario autenticado no request ------------------------------
  //
  // A partir daqui, qualquer handler ou hook subsequente pode acessar
  // request.user com seguranca — companyId e role sao garantidos.
  //
  // companyId e injetado em TODAS as queries Prisma nos repositories
  // para garantir o isolamento multi-tenant (ADR-003).
  request.user = {
    id:        userId,
    companyId,
    role:      role as UserRole,
    email,
  }
}