import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { env } from './env'
import type { Database } from '@/shared/types/database.types'

// =============================================================================
// Supabase Admin Client — Server-side ONLY
// =============================================================================
//
// Este client usa a SERVICE_ROLE_KEY, que bypassa completamente o RLS.
// NUNCA expor esta chave no frontend ou em logs.
//
// Tipagem: createClient<Database> usa o tipo Database de database.types.ts.
// Isso garante que o retorno seja SupabaseClient<Database, 'public', ...>
// sem nenhum `any` na cadeia de tipos — satisfaz @typescript-eslint/no-unsafe-assignment.
//
// Casos de uso permitidos:
//   - Criar usuarios no Supabase Auth (supabaseAdmin.auth.admin.createUser)
//   - Atualizar app_metadata (company_id, role) nos tokens JWT dos usuarios
//   - Deletar usuarios do Auth
//
// Casos de uso PROIBIDOS:
//   - Queries de banco de dados (use Prisma)
//   - Leitura de tabelas (use Prisma)
//   - Exposicao ao frontend
// =============================================================================

export const supabaseAdmin: SupabaseClient<Database> = createClient<Database>(
  env.SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      // Servidor nao precisa de refresh automatico — tokens sao de curta duracao
      autoRefreshToken: false,
      // Servidor nao persiste sessao — cada request e stateless
      persistSession: false,
    },
  },
)