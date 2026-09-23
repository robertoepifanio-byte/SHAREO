/**
 * Zera o 2FA de UM administrador direto no banco — o último recurso para quando o admin
 * perdeu o celular E os códigos de recuperação e NÃO há outro superadmin para reiniciá-lo
 * pela tela (Admin → Usuários → Administradores → "Reiniciar 2FA").
 *
 * Depois disto o admin entra só com a senha, cai no cadastro do 2FA e refaz o autenticador.
 * O painel fica bloqueado para ele até lá (o login novo nasce sem `mfa`).
 *
 * ⚠️ As sessões JÁ abertas dele NÃO são encerradas por aqui — o epoch de invalidação mora no
 * Redis e o script não o toca. Uma sessão aberta ANTES, com `mfa`, segue valendo até expirar.
 * Se o motivo do reset for suspeita de comprometimento, reinicie pela tela (que invalida as
 * sessões) ou troque a senha da conta.
 *
 * Uso (o ambiente é declarado ANTES, para não zerar o 2FA no banco errado):
 *   node --env-file=.env.prod-run --import tsx scripts/reset-admin-2fa.ts <email>
 *
 * Confirme a identidade da pessoa por outro canal antes de rodar — este script não pergunta.
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const email = process.argv[2]?.trim().toLowerCase()
  if (!email) {
    console.error('Uso: node --env-file=<arquivo-do-ambiente> --import tsx scripts/reset-admin-2fa.ts <email>')
    process.exit(1)
  }

  const host = (process.env.DATABASE_URL ?? '').match(/@([^:/?]+)/)?.[1] ?? '(DATABASE_URL ausente)'
  console.log(`Banco: ${host}`)

  const user = await prisma.user.findUnique({
    where:  { email },
    select: { id: true, email: true, role: true, adminRole: true, totpEnabledAt: true },
  })
  if (!user || user.role !== 'ADMIN') {
    console.error(`Nenhum administrador com o e-mail ${email}.`)
    process.exit(1)
  }
  if (!user.totpEnabledAt) {
    console.log(`${user.email} já está sem 2FA cadastrado — nada a fazer.`)
    return
  }

  await prisma.user.update({
    where: { id: user.id },
    data:  { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [] },
  })
  await prisma.adminLog.create({
    data: { adminId: user.id, action: 'MFA_RESET', entityType: 'User', entityId: user.id, metadata: { via: 'scripts/reset-admin-2fa.ts' } },
  })
  console.log(`✅ 2FA zerado: ${user.email} (${user.adminRole}). No próximo login ele refaz o cadastro.`)
}

main()
  .catch((e) => { console.error(e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
