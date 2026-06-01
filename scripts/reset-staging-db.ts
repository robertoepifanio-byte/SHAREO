/**
 * Limpa TODOS os dados do banco de staging para reruns de testes E2E.
 *
 * Preserva:
 *   - categories (dados de referência — necessários para criar itens nos testes)
 *   - _prisma_migrations (histórico de migrations — nunca apagar)
 *
 * Segurança: só executa se DATABASE_URL aponta para o Supabase de staging
 * (fflpuoluiqmhpvcxubqi.supabase.co). Recusa qualquer outra URL.
 *
 * Uso:
 *   1. Fazer pull das vars de staging:
 *        npx vercel@54.6.1 env pull --environment=preview .env.staging.local
 *
 *   2. Rodar o script com o DATABASE_URL de staging:
 *        $env:DATABASE_URL = "postgres://..."; $env:DIRECT_URL = "postgres://..."
 *        pnpm exec tsx scripts/reset-staging-db.ts
 *
 *   3. Recriar os fixtures de sessão:
 *        pnpm exec tsx scripts/create-staging-fixtures.ts
 */

import { PrismaClient } from '@prisma/client'

// Project ID do Supabase de staging — aparece na URL direta e no username do pooler
const STAGING_PROJECT_ID = 'fflpuoluiqmhpvcxubqi'

const prisma = new PrismaClient()

async function main() {
  const dbUrl = process.env.DATABASE_URL ?? ''

  if (!dbUrl.includes(STAGING_PROJECT_ID)) {
    console.error('❌ Abortado: DATABASE_URL não aponta para o banco de staging.')
    console.error(`   Esperado: URL contendo project ID "${STAGING_PROJECT_ID}"`)
    console.error(`   Recebido: ${dbUrl ? dbUrl.replace(/:[^@]+@/, ':***@') : '(vazio)'}`)
    console.error('')
    console.error('   Use o arquivo com as credenciais de staging:')
    console.error('   pnpm exec tsx --env-file=.env.staging-migrate scripts/reset-staging-db.ts')
    process.exit(1)
  }

  console.log('🗑️  Reset do banco de staging')
  console.log(`   Host: ${STAGING_PROJECT_ID}`)
  console.log('   Preservando: categories, _prisma_migrations\n')

  // Conta registros antes para exibir no relatório
  const [users, items, bookings, reviews, conversations, messages] = await Promise.all([
    prisma.user.count(),
    prisma.item.count(),
    prisma.booking.count(),
    prisma.review.count(),
    prisma.conversation.count(),
    prisma.message.count(),
  ])

  console.log('📊 Antes:')
  console.log(`   users: ${users}`)
  console.log(`   items: ${items}`)
  console.log(`   bookings: ${bookings}`)
  console.log(`   reviews: ${reviews}`)
  console.log(`   conversations: ${conversations}`)
  console.log(`   messages: ${messages}`)
  console.log('')

  // TRUNCATE CASCADE apaga users e todas as tabelas dependentes em cadeia.
  // PostgreSQL propaga o CASCADE independente de onDelete na FK do schema Prisma.
  // Tabelas limpas via cascade:
  //   accounts, sessions, items, item_images, bookings, reviews,
  //   conversations, messages, conversation_participants, booking_photos,
  //   contract_acceptances, notifications, favorites, referral_credits,
  //   outbound_webhooks, admin_logs
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE
      users,
      password_reset_tokens,
      verification_tokens
    CASCADE
  `)

  const [{ count: catCount }] = await prisma.$queryRaw<[{ count: bigint }]>`
    SELECT COUNT(*) AS count FROM categories
  `

  console.log('✅ Banco limpo.')
  console.log(`   Categories preservadas: ${catCount}`)
  console.log('')
  console.log('📋 Próximos passos:')
  console.log('   1. Recriar fixtures de sessão:')
  console.log('      pnpm exec tsx scripts/create-staging-fixtures.ts')
  console.log('')
  console.log('   2. Rodar os smoke tests:')
  console.log('      pnpm playwright test --config=playwright.staging.config.ts')
}

main()
  .catch((err) => {
    console.error('\n❌ Erro:', err.message)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
