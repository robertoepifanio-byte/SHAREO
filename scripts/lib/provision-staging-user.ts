/**
 * Provisionamento de usuário de teste em staging — registro via API pública +
 * verificação de e-mail/cadastro direto no banco. Compartilhado por
 * scripts/create-staging-fixtures.ts (fixtures do E2E) e
 * scripts/create-pentest-account.ts (contas do pentest com Strix):
 * a LÓGICA de provisionar é a mesma nos dois; os DADOS (quais contas) e os
 * passos extras (login+storageState, promoção a admin, 2FA) não são —
 * cada script continua dono do seu conjunto de contas e do que fizer depois.
 */

import { PrismaClient } from '@prisma/client'

export type ProvisionUser = {
  name: string
  email: string
  password: string
  cpf: string
  phone: string
  city: string
  state: string
  cep: string
  street: string
  neighborhood: string
  consentVersion: string
}

/**
 * Registra via POST /api/auth/register. Idempotente (ignora conta/CPF já
 * existente). Reenvia em RATE_LIMITED — o endpoint de registro tem rate limit
 * real e falhar aqui derruba o script inteiro sem isso.
 */
export async function registerUser(
  stagingUrl: string,
  user: ProvisionUser,
  retries = 3,
): Promise<void> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const res = await fetch(`${stagingUrl}/api/auth/register`, {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...user, userType: 'PF' }),
    })
    const json = await res.json()

    if (res.ok) {
      console.log(`  ✅ Criado: ${user.email}`)
      return
    }

    const code = json.error?.code
    if (code === 'EMAIL_ALREADY_EXISTS' || code === 'CPF_ALREADY_EXISTS') {
      console.log(`  ℹ️  Já existe: ${user.email}`)
      return
    }

    if (code === 'RATE_LIMITED' && attempt < retries) {
      console.log(`  ⏳ Rate limit (${user.email}) — aguardando 75s (tentativa ${attempt}/${retries})...`)
      await new Promise((r) => setTimeout(r, 75_000))
      continue
    }

    throw new Error(`register failed (${user.email}): ${JSON.stringify(json.error)}`)
  }
}

/**
 * Marca os e-mails como verificados. `POST /api/bookings` lê `emailVerified`
 * do banco a cada requisição e responde 403 EMAIL_NOT_VERIFIED quando é null.
 */
export async function markEmailVerified(db: PrismaClient, emails: string[]): Promise<void> {
  const { count } = await db.user.updateMany({
    where: { email: { in: emails }, emailVerified: null },
    data:  { emailVerified: new Date() },
  })
  console.log(`  ✅ E-mails verificados: ${count} de ${emails.length} (o resto já estava)`)
}

/**
 * Completa o cadastro (endereço etc.) dos usuários que ficaram pela metade.
 * Espelha `commonData` de app/api/users/me/complete-registration/route.ts —
 * manter os campos em sincronia.
 */
export async function completeProfile(db: PrismaClient, users: ProvisionUser[]): Promise<void> {
  const now = new Date()
  await Promise.all(users.map(async (user) => {
    const { count } = await db.user.updateMany({
      where: { email: user.email, profileCompletedAt: null },
      data: {
        phone: user.phone, cep: user.cep, street: user.street,
        neighborhood: user.neighborhood, city: user.city, state: user.state,
        profileCompletedAt: now, ageDeclaredAt: now,
      },
    })
    console.log(count ? `  ✅ Cadastro completado: ${user.email}` : `  ℹ️  Cadastro já completo: ${user.email}`)
  }))
}
