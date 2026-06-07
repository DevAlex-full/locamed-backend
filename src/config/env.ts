import dotenv from 'dotenv'
import { z } from 'zod'

// Carrega variaveis do arquivo .env ANTES de qualquer validacao.
// Em producao (Render), o .env nao existe — as vars vem do ambiente do sistema.
dotenv.config()

// =============================================================================
// Nota sobre autenticacao JWT:
//
// Este projeto usa Supabase com JWT Signing Keys ECC (P-256).
// Nao ha SUPABASE_JWT_SECRET porque o Supabase assina os tokens com
// chave privada EC (algoritmo ES256) e disponibiliza a chave publica via JWKS:
//
//   https://<project-ref>.supabase.co/auth/v1/.well-known/jwks.json
//
// O middleware authenticate.ts (Etapa 4) usara createRemoteJWKSet do jose
// para buscar e cachear o JWKS automaticamente a partir do SUPABASE_URL.
// Nenhuma variavel de ambiente adicional e necessaria para JWT.
// =============================================================================

const envSchema = z.object({
  // -- Servidor ---------------------------------------------------------------
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),

  PORT: z.coerce.number().int().min(1).max(65535).default(3333),

  HOST: z.string().min(1).default('0.0.0.0'),

  // -- Banco de Dados ---------------------------------------------------------
  // Use a connection string do Session Mode do Supabase (porta 5432).
  // NAO use Transaction Mode (6543) — incompativel com prepared statements do Prisma.
  DATABASE_URL: z
    .string()
    .min(1, 'DATABASE_URL e obrigatoria')
    .startsWith('postgresql://', 'DATABASE_URL deve ser uma connection string PostgreSQL valida'),

  // -- Supabase ---------------------------------------------------------------
  // SUPABASE_URL: usada para construir o JWKS endpoint e chamadas Admin Auth.
  SUPABASE_URL: z
    .string()
    .url('SUPABASE_URL deve ser uma URL valida'),

  SUPABASE_ANON_KEY: z
    .string()
    .min(1, 'SUPABASE_ANON_KEY e obrigatoria'),

  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY e obrigatoria'),

  // -- Seguranca --------------------------------------------------------------
  // Lista de origens permitidas no CORS (separadas por virgula, sem espacos).
  CORS_ORIGINS: z
    .string()
    .min(1, 'CORS_ORIGINS e obrigatoria')
    .transform((val) =>
      val
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),

  // -- Rate Limiting ----------------------------------------------------------
  RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(100),
  RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),

  // -- Asaas ------------------------------------------------------------------
  ASAAS_API_URL: z
    .string()
    .url('ASAAS_API_URL deve ser uma URL valida'),

  ASAAS_API_KEY: z
    .string()
    .min(1, 'ASAAS_API_KEY e obrigatoria'),

  ASAAS_WEBHOOK_TOKEN: z
    .string()
    .min(1, 'ASAAS_WEBHOOK_TOKEN e obrigatorio'),

  // -- Storage ----------------------------------------------------------------
  SUPABASE_STORAGE_BUCKET: z.string().min(1).default('documents'),
})

export type Env = z.infer<typeof envSchema>

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variaveis de ambiente invalidas ou ausentes:\n')

  const fieldErrors = parsed.error.flatten().fieldErrors
  for (const [field, errors] of Object.entries(fieldErrors)) {
    console.error(`  ${field}: ${errors?.join(', ') ?? 'invalida'}`)
  }

  console.error('\nCopie o arquivo .env.example para .env e preencha os valores.\n')
  process.exit(1)
}

export const env: Env = parsed.data