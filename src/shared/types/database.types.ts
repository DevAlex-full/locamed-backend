// =============================================================================
// Supabase Database Types — Placeholder
// =============================================================================
//
// Este arquivo define o tipo Database minimo para o Supabase Admin Client.
//
// Por que este arquivo existe?
//   O createClient<Database>() do Supabase requer um tipo Database explicito
//   para ser type-safe (sem `any`). Sem ele, o cliente retorna
//   SupabaseClient<any, any, ...> que dispara @typescript-eslint/no-unsafe-assignment.
//
// Por que o tipo esta vazio?
//   O supabaseAdmin em src/config/supabase.ts e usado EXCLUSIVAMENTE para
//   operacoes de autenticacao via Supabase Auth Admin API:
//     - createUser, updateUser (para configurar app_metadata com company_id e role)
//     - deleteUser
//   Nenhuma query de banco de dados passa por este client — isso e responsabilidade
//   exclusiva do Prisma. Logo, o schema das tabelas nao e necessario aqui.
//
// Para gerar tipos completos (necessario se voce usar supabaseAdmin para queries):
//   npx supabase gen types typescript \
//     --project-id <seu-project-id> \
//     > src/types/database.types.ts
//
// Estrutura do tipo Database conforme o padrao do Supabase:
//   { [_ in never]: never } = objeto vazio type-safe (sem chaves, sem `any`)
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: { [_ in never]: never }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}