import fp from 'fastify-plugin'
import multipart from '@fastify/multipart'
import { type FastifyInstance } from 'fastify'

// =============================================================================
// Plugin Multipart — Upload de Arquivos
// =============================================================================
//
// Habilita o parsing de requisicoes multipart/form-data no Fastify.
// Necessario para:
//   - Upload de fotos de entrega/retirada (Modulo Deliveries)
//   - Upload de assinaturas digitais
//   - Upload de documentos para contratos
//   - Qualquer rota que receba arquivos do frontend
//
// Limites configurados:
//   fileSize  - 5MB por arquivo: suficiente para fotos de entrega em qualidade
//               razoavel. Fotografias de celular em HD ficam em torno de 2-4MB.
//   files     - 5 arquivos por request: maximos para uma entrega com multiplas fotos
//   fields    - 10 campos nao-arquivo: suficiente para metadados do upload
//   fieldSize - 100KB por campo: para strings e JSONs de metadados
//   parts     - 15 partes totais (files + fields): evita abuse de multipart parsing
//
// Como usar nas rotas:
//   const data = await request.file()           // unico arquivo
//   const parts = request.parts()              // iterator para varios arquivos/campos
//   const files = await request.saveRequestFiles() // salva em temp e retorna paths
//
// Integracao com Supabase Storage (Modulo Deliveries):
//   1. Receber o arquivo via request.file()
//   2. Fazer upload para Supabase Storage via supabaseAdmin.storage
//   3. Salvar a URL publica na tabela delivery_photos
// =============================================================================

export const multipartPlugin = fp(async (app: FastifyInstance) => {
  await app.register(multipart, {
    limits: {
      // Tamanho maximo por arquivo (5MB)
      fileSize: 5 * 1024 * 1024,

      // Numero maximo de arquivos por request
      files: 5,

      // Numero maximo de campos nao-arquivo por request
      fields: 10,

      // Tamanho maximo por campo de texto/JSON (100KB)
      fieldSize: 100 * 1024,

      // Total de partes (arquivos + campos) por request
      parts: 15,

      // Tamanho maximo do header (1KB)
      headerPairs: 100,
    },

    // Anexa o arquivo ao request — necessario para acesso via request.file()
    attachFieldsToBody: false,
  })
})