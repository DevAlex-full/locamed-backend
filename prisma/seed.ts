import { PrismaClient, CompanyPlan, ChairStatus } from '@prisma/client'

// =============================================================================
// Seed de Desenvolvimento
// =============================================================================
//
// Cria dados minimos para rodar o sistema localmente:
//   - 1 empresa
//   - 5 poltronas
//   - 2 clientes de exemplo
//
// ATENCAO - Criacao de usuarios:
//   users.id = Supabase auth.users.id (UUID externo, nao gerado aqui).
//   Para criar o primeiro admin, siga os passos abaixo apos rodar o seed.
//
// Passos pos-seed:
//   1. Acesse Supabase Dashboard > Authentication > Users
//   2. Clique em "Add user" e crie um usuario com email e senha
//   3. Copie o UUID gerado pelo Supabase
//   4. Adicione no .env:
//        SEED_ADMIN_SUPABASE_ID=<uuid-copiado>
//        SEED_ADMIN_EMAIL=<email-que-voce-usou>
//   5. Rode novamente: npm run db:seed
//      O seed criara o registro na tabela users automaticamente
// =============================================================================

const prisma = new PrismaClient()

async function main(): Promise<void> {
  console.log('\n Iniciando seed de desenvolvimento...\n')

  // ---------------------------------------------------------------------------
  // Empresa
  // ---------------------------------------------------------------------------
  const company = await prisma.company.upsert({
    where: { document: '00.000.000/0001-00' },
    update: {},
    create: {
      name: 'Poltronas Cirurgicas Ltda',
      document: '00.000.000/0001-00',
      email: 'contato@poltronas.dev',
      phone: '(11) 99999-9999',
      address: 'Rua das Flores',
      number: '100',
      neighborhood: 'Centro',
      city: 'Sao Paulo',
      state: 'SP',
      zip_code: '01310-100',
      plan: CompanyPlan.pro,
      active: true,
      settings: {
        timezone: 'America/Sao_Paulo',
        currency: 'BRL',
        daily_rate_default: 150,
      },
    },
  })

  console.log(` Empresa: ${company.name}`)
  console.log(`   ID: ${company.id}\n`)

  // ---------------------------------------------------------------------------
  // Usuario Admin (requer SEED_ADMIN_SUPABASE_ID no .env)
  // ---------------------------------------------------------------------------
  const adminSupabaseId = process.env['SEED_ADMIN_SUPABASE_ID']
  const adminEmail      = process.env['SEED_ADMIN_EMAIL'] ?? 'admin@poltronas.dev'

  if (!adminSupabaseId) {
    console.warn(' AVISO: SEED_ADMIN_SUPABASE_ID nao configurado.')
    console.warn('        Crie um usuario no Supabase Auth e configure no .env.')
    console.warn(`        ID da empresa para usar: ${company.id}\n`)
  } else {
    const admin = await prisma.user.upsert({
      where: { id: adminSupabaseId },
      update: {
        name: 'Administrador',
        role: 'admin',
        active: true,
      },
      create: {
        id: adminSupabaseId,
        company_id: company.id,
        name: 'Administrador',
        email: adminEmail,
        role: 'admin',
        active: true,
      },
    })

    console.log(` Admin: ${admin.email} (${admin.role})`)
    console.log(`   ID: ${admin.id}\n`)
  }

  // ---------------------------------------------------------------------------
  // Poltronas
  // ---------------------------------------------------------------------------
  const chairsData = [
    {
      code: 'POL-001',
      patrimony_number: 'PAT-2024-001',
      model: 'Reclinavel Standard',
      manufacturer: 'MedChair',
      acquisition_value: 2500.00,
      status: ChairStatus.available,
    },
    {
      code: 'POL-002',
      patrimony_number: 'PAT-2024-002',
      model: 'Reclinavel Standard',
      manufacturer: 'MedChair',
      acquisition_value: 2500.00,
      status: ChairStatus.available,
    },
    {
      code: 'POL-003',
      patrimony_number: 'PAT-2024-003',
      model: 'Reclinavel Premium',
      manufacturer: 'MedChair',
      acquisition_value: 3800.00,
      status: ChairStatus.available,
    },
    {
      code: 'POL-004',
      patrimony_number: 'PAT-2024-004',
      model: 'Reclinavel Premium',
      manufacturer: 'MedChair',
      acquisition_value: 3800.00,
      status: ChairStatus.maintenance,
    },
    {
      code: 'POL-005',
      patrimony_number: 'PAT-2024-005',
      model: 'Reclinavel Motorizado',
      manufacturer: 'OrthoTec',
      acquisition_value: 6200.00,
      status: ChairStatus.available,
    },
  ]

  let chairsCreated = 0

  for (const data of chairsData) {
    const existing = await prisma.chair.findFirst({
      where: {
        company_id: company.id,
        code: data.code,
        deleted_at: null,
      },
    })

    if (!existing) {
      await prisma.chair.create({
        data: {
          company_id: company.id,
          code: data.code,
          patrimony_number: data.patrimony_number,
          model: data.model,
          manufacturer: data.manufacturer,
          acquisition_date: new Date('2024-01-15'),
          acquisition_value: data.acquisition_value,
          status: data.status,
        },
      })
      chairsCreated++
    }
  }

  console.log(
    ` Poltronas: ${chairsCreated} criadas / ${chairsData.length - chairsCreated} ja existiam\n`,
  )

  // ---------------------------------------------------------------------------
  // Clientes de exemplo
  // ---------------------------------------------------------------------------
  const clientsData = [
    {
      name: 'Maria Silva Santos',
      cpf: '111.111.111-11',
      phone: '(11) 98888-1111',
      whatsapp: '(11) 98888-1111',
      email: 'maria.silva@exemplo.com',
      city: 'Sao Paulo',
      state: 'SP',
      doctor: 'Dr. Carlos Medeiros',
      hospital: 'Hospital Santa Cruz',
      surgery_date: new Date('2024-03-10'),
    },
    {
      name: 'Jose Pereira Lima',
      cpf: '222.222.222-22',
      phone: '(11) 97777-2222',
      whatsapp: '(11) 97777-2222',
      city: 'Sao Paulo',
      state: 'SP',
      doctor: 'Dra. Ana Rodrigues',
      hospital: 'Hospital Albert Einstein',
      surgery_date: new Date('2024-04-05'),
    },
  ]

  let clientsCreated = 0

  for (const data of clientsData) {
    const existing = await prisma.client.findFirst({
      where: {
        company_id: company.id,
        cpf: data.cpf,
        deleted_at: null,
      },
    })

    if (!existing) {
      await prisma.client.create({
        data: {
          company_id: company.id,
          ...data,
        },
      })
      clientsCreated++
    }
  }

  console.log(
    ` Clientes: ${clientsCreated} criados / ${clientsData.length - clientsCreated} ja existiam\n`,
  )

  // ---------------------------------------------------------------------------
  // Resumo
  // ---------------------------------------------------------------------------
  console.log('----------------------------------------------')
  console.log(' Seed concluido com sucesso!')
  console.log('----------------------------------------------')
  console.log(` Company ID : ${company.id}`)
  console.log(' Proximo    : configure SEED_ADMIN_SUPABASE_ID no .env')
  console.log('              e rode npm run db:seed novamente.\n')
}

main()
  .catch((error: unknown) => {
    console.error('\n Erro no seed:', error)
    process.exit(1)
  })
  .finally(async () => {
    // async/await garante que o disconnect e aguardado antes do processo encerrar.
    // Sem await, o Node.js poderia sair antes de fechar as conexoes com o banco.
    await prisma.$disconnect()
  })