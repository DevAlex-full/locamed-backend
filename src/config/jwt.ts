import { createRemoteJWKSet, type JWTPayload, type RemoteJWKSetOptions } from 'jose'
import type { UserRole } from '@/shared/types/common'
import { env } from './env'

// =============================================================================
// JWT — Configuracao e Tipagem para ECC P-256 + JWKS
// =============================================================================
//
// Este arquivo configura a validacao de JWT para projetos Supabase que usam
// JWT Signing Keys ECC (P-256), em vez do modelo legado HS256 com secret.
//
// Diferenca entre HS256 e ES256 (ECC P-256):
// -----------------------------------------------
//   HS256 (legado):
//     - Algoritmo simetrico (HMAC-SHA256)
//     - Usa um segredo compartilhado (SUPABASE_JWT_SECRET)
//     - Verificacao local: nao requer chamada de rede
//
//   ES256 (atual — este projeto):
//     - Algoritmo assimetrico (ECDSA com curva P-256 e SHA-256)
//     - Supabase assina com chave privada EC
//     - Verificacao usa a chave publica EC, disponivel via JWKS
//     - Mais seguro: chave privada nunca sai do Supabase
//
// JWKS (JSON Web Key Set):
// -----------------------------------------------
//   Endpoint padrao do Supabase:
//     https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
//
//   O jose (createRemoteJWKSet) gerencia automaticamente:
//     - Busca inicial das chaves publicas (lazy na primeira verificacao)
//     - Cache em memoria das chaves (sem re-fetch a cada request)
//     - Renovacao automatica em caso de rotacao de chaves (key rotation)
//     - Selecao da chave correta pelo kid (Key ID) presente no header do JWT
//
// Fluxo de verificacao (implementado na Etapa 4 em authenticate.ts):
// -----------------------------------------------
//   import { jwtVerify } from 'jose'
//   import { SUPABASE_JWKS, SUPABASE_JWT_ISSUER } from '@/config/jwt'
//
//   const { payload } = await jwtVerify<SupabaseJWTPayload>(token, SUPABASE_JWKS, {
//     issuer: SUPABASE_JWT_ISSUER,
//   })
//
//   // Extrair claims do payload:
//   const userId    = payload.sub                        // UUID do usuario
//   const companyId = payload.app_metadata?.company_id   // UUID da empresa
//   const role      = payload.app_metadata?.role          // Role RBAC
//   const email     = payload.email                       // Email
//
// Erros que jwtVerify pode lancar (tratar em authenticate.ts):
// -----------------------------------------------
//   JWTExpired                       -> 401 "Sessao expirada"
//   JWTInvalid                       -> 401 "Token invalido"
//   JWSSignatureVerificationFailed   -> 401 "Assinatura invalida"
//   JWTClaimValidationFailed         -> 401 "Claims invalidas"
//   Qualquer outro                   -> 401 generico (nao expor detalhes)
//
// app_metadata vs user_metadata:
// -----------------------------------------------
//   app_metadata  -> definido pelo servidor via Supabase Admin SDK — CONFIAVEL
//                    Campos: company_id, role
//                    So o servidor pode alterar (usuario nao pode forjar)
//
//   user_metadata -> pode ser alterado pelo proprio usuario — NAO USAR para RBAC
//                    Campos: avatar_url, display_name, preferencias de UI
//
// =============================================================================

// Opcoes do JWKS remoto
const JWKS_OPTIONS: RemoteJWKSetOptions = {
  // Intervalo minimo entre re-fetches em caso de chave nao encontrada.
  // Evita flood de requests ao endpoint do Supabase em caso de token invalido.
  cooldownDuration: 30_000, // 30 segundos

  // Tempo maximo para o fetch do JWKS antes de falhar.
  // Previne que requests lentos bloqueiem a autenticacao.
  timeoutDuration: 5_000, // 5 segundos
}

// JWKS remoto do Supabase Auth.
// createRemoteJWKSet retorna uma funcao (nao faz fetch imediatamente).
// O fetch e lazy: ocorre apenas na primeira chamada a jwtVerify.
// As chaves sao cacheadas em memoria apos o primeiro fetch.
export const SUPABASE_JWKS = createRemoteJWKSet(
  new URL(`${env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
  JWKS_OPTIONS,
)

// Issuer do JWT Supabase — validado pelo jose durante jwtVerify.
// Formato: https://<project-ref>.supabase.co/auth/v1
export const SUPABASE_JWT_ISSUER = `${env.SUPABASE_URL}/auth/v1`

// Configuracao geral do JWT
export const JWT_CONFIG = {
  // ES256: ECDSA com P-256 e SHA-256 (algoritmo usado pelo Supabase com ECC keys)
  // Com JWKS, o jose seleciona o algoritmo automaticamente via JWK.alg
  algorithm: 'ES256',

  // Tempo de expiracao recomendado para access token (em segundos)
  // Configurar no Supabase Dashboard > Auth > JWT expiry
  accessTokenExpiresInSeconds: 900, // 15 minutos

  // Tempo de expiracao do refresh token (em segundos)
  refreshTokenExpiresInSeconds: 604_800, // 7 dias
} as const

// =============================================================================
// Tipo do payload JWT do Supabase
// =============================================================================
//
// Estende JWTPayload padrao do jose com os claims especificos do Supabase.
// sub, email, role sao claims padrao do Supabase.
// app_metadata e adicionado via Supabase Admin SDK ao criar o usuario.

export interface SupabaseJWTPayload extends JWTPayload {
  // ID do usuario (= auth.users.id no Supabase) — sempre presente
  sub: string

  // Email do usuario autenticado
  email?: string

  // Role da sessao Supabase (ex: "authenticated") — NAO usar para RBAC
  // Usar app_metadata.role para controle de acesso na aplicacao
  role?: string

  // Claims customizados adicionados via Supabase Admin SDK
  // Estes campos sao controlados exclusivamente pelo servidor
  app_metadata?: {
    company_id?: string  // UUID da empresa -> injetado em request.user.companyId
    role?: UserRole      // Role RBAC -> injetado em request.user.role
  }
}