/**
 * POST /api/test/enroll-admin-totp
 *
 * Rota de apoio exclusiva para a suíte E2E: cadastra o 2FA de um admin FIXTURE com um
 * segredo TOTP conhecido, para o login da suíte poder calcular o código.
 *
 * Existe (em vez de o script de fixtures gravar no banco) porque o segredo é gravado
 * CIFRADO com a ENCRYPTION_KEY do runtime — e o CI não a conhece: a do GitHub Secret é a do
 * build, e a divergência fazia `decryptPII` lançar no login e o admin fixture nunca entrar
 * (visto em 23/09/2026: "Ocorreu um erro" na 2ª etapa do login, spec de admin em SKIP).
 * Aqui quem cifra é o próprio app, com a chave que ele vai usar para ler.
 *
 * Segurança: as três camadas de lib/e2eGuard.ts (kill-switch de produção, E2E_SECRET,
 * x-e2e-token) + só o e-mail do admin fixture, com role ADMIN. Nenhum admin real é alcançável.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { encryptPII } from "@/lib/crypto"
import { withE2EGuard } from "@/lib/e2eGuard"

// Só a conta fixture E2E (e2e/fixtures/test-credentials.ts): a rota existe para ela e nenhuma outra.
const EMAIL_FIXTURE = "admin.fixture@shareo-test.com"
const SEGREDO_BASE32 = /^[A-Z2-7]{32}$/

async function handler(req: NextRequest) {
  const body = (await req.json().catch(() => null)) as { email?: unknown; secret?: unknown } | null
  const email  = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
  const secret = typeof body?.secret === "string" ? body.secret : ""

  if (email !== EMAIL_FIXTURE || !SEGREDO_BASE32.test(secret)) {
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "email do admin fixture e secret base32 de 32 caracteres." } },
      { status: 400 },
    )
  }

  const { count } = await prisma.user.updateMany({
    where: { email, role: "ADMIN", deletedAt: null },
    data:  { totpSecretEnc: encryptPII(secret), totpEnabledAt: new Date(), totpLastStep: null, totpRecoveryHashes: [] },
  })
  if (count === 0) {
    return NextResponse.json({ error: { code: "NOT_FOUND", message: "Admin de teste não encontrado." } }, { status: 404 })
  }

  return NextResponse.json({ ok: true })
}

export const POST = withE2EGuard(handler)
