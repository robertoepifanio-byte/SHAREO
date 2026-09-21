import crypto from "crypto"
import { CredentialsSignin } from "next-auth"
import { prisma } from "@/lib/prisma"
import { decryptPII, encryptPII, hashToken } from "@/lib/crypto"
import { checkRateLimit, RATE_LIMITS } from "@/lib/rateLimit"
import { generateTotpSecret, totpUri, verifyTotp } from "@/lib/totp"

/**
 * 2FA de administrador (TOTP + códigos de recuperação).
 *
 * Regra de produto: TODO `role=ADMIN` precisa do segundo fator. Um admin sem 2FA
 * consegue entrar (a senha vale), mas a sessão nasce SEM `mfa` e é tratada como
 * usuário comum até ele cadastrar o autenticador — ver `lib/auth.ts`
 * (rebaixamento na sessão) e `middleware.ts` (redireciona para o cadastro).
 */

/** Erros que o formulário de login distingue pelo `code` devolvido pelo signIn. */
export class MfaRequiredError extends CredentialsSignin {
  code = "mfa_required"
}
export class MfaInvalidError extends CredentialsSignin {
  code = "mfa_invalid"
}

const RECOVERY_CODE_COUNT = 10

// Alfabeto sem 0/O/1/I/L — o código é transcrito à mão de um papel.
const RECOVERY_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"
const RECOVERY_LENGTH   = 10

/** `XXXXX-XXXXX`. 10 caracteres de um alfabeto de 31 ≈ 49 bits: não se adivinha, e cada código só vale uma vez. */
export function generateRecoveryCodes(): string[] {
  return Array.from({ length: RECOVERY_CODE_COUNT }, () => {
    let raw = ""
    for (let i = 0; i < RECOVERY_LENGTH; i++) raw += RECOVERY_ALPHABET[crypto.randomInt(RECOVERY_ALPHABET.length)]
    return `${raw.slice(0, 5)}-${raw.slice(5)}`
  })
}

/** Aceita minúsculas, espaços e sem hífen. `null` se não tiver a forma de um código de recuperação. */
export function normalizeRecoveryCode(input: string): string | null {
  const raw = input.replace(/[\s-]/g, "").toUpperCase()
  if (raw.length !== RECOVERY_LENGTH) return null
  for (const ch of raw) if (!RECOVERY_ALPHABET.includes(ch)) return null
  return raw
}

type FactorUser = {
  id:                 string
  totpSecretEnc:      string | null
  totpLastStep:       number | null
  totpRecoveryHashes: string[]
}

type SecondFactor = "totp" | "recovery"

/**
 * Valida o segundo fator (código de 6 dígitos OU código de recuperação).
 *
 * Os dois consumos são ATÔMICOS no banco, não "lê, decide, grava": dois logins
 * simultâneos com o mesmo código vêm ambos de uma leitura em que ele ainda
 * valia, e só o `UPDATE` condicional garante que exatamente um passe.
 */
async function verifySecondFactor(user: FactorUser, input: string): Promise<SecondFactor | null> {
  const rl = await checkRateLimit(`mfa:user:${user.id}`, RATE_LIMITS.adminMfa.limit, RATE_LIMITS.adminMfa.windowMs)
  if (!rl.allowed) return null

  const digits = input.replace(/\s/g, "")
  if (/^\d{6}$/.test(digits)) {
    if (!user.totpSecretEnc) return null
    const step = verifyTotp(decryptPII(user.totpSecretEnc), digits, { lastUsedStep: user.totpLastStep })
    if (step === null) return null
    const { count } = await prisma.user.updateMany({
      where: { id: user.id, OR: [{ totpLastStep: null }, { totpLastStep: { lt: step } }] },
      data:  { totpLastStep: step },
    })
    return count === 1 ? "totp" : null
  }

  const recovery = normalizeRecoveryCode(input)
  if (!recovery) return null
  const hash  = hashToken(recovery)
  const count = await prisma.$executeRaw`
    UPDATE "users"
       SET "totpRecoveryHashes" = array_remove("totpRecoveryHashes", ${hash})
     WHERE "id" = ${user.id} AND ${hash} = ANY("totpRecoveryHashes")`
  return count === 1 ? "recovery" : null
}

/**
 * Passo do login: chamado DEPOIS de a senha estar correta.
 * Devolve se a sessão nasce com o segundo fator verificado; lança `MfaRequiredError`
 * (pede o código) ou `MfaInvalidError` (código errado). Quem não é admin, ou é admin
 * que ainda não cadastrou o autenticador, entra sem `mfa` (a sessão é rebaixada).
 */
export async function checkAdminSecondFactor(
  user: FactorUser & { role: string; totpEnabledAt: Date | null },
  code: string | undefined,
): Promise<boolean> {
  if (user.role !== "ADMIN" || !user.totpEnabledAt) return false

  if (!code?.trim()) throw new MfaRequiredError()
  const factor = await verifySecondFactor(user, code)
  if (!factor) throw new MfaInvalidError()

  if (factor === "recovery") {
    // Trilha de auditoria: usar recuperação significa que o celular não estava à mão.
    await prisma.adminLog
      .create({
        data: {
          adminId: user.id, action: "MFA_RECOVERY_CODE_USED", entityType: "User", entityId: user.id,
          metadata: { restantes: Math.max(user.totpRecoveryHashes.length - 1, 0) },
        },
      })
      .catch((e) => console.warn("[adminLog]", e instanceof Error ? e.message : e))
  }
  return true
}

// ─── Cadastro do autenticador ────────────────────────────────────────────────

/**
 * Inicia (ou reinicia) o cadastro: gera um segredo novo e o guarda cifrado, ainda
 * SEM `totpEnabledAt`. Recusa quem já tem 2FA ativo — trocar o autenticador de um
 * admin que já o tem passa pelo reset feito por outro superadmin.
 */
export async function startEnrollment(userId: string, email: string): Promise<{ secret: string; uri: string } | null> {
  const secret = generateTotpSecret()
  const { count } = await prisma.user.updateMany({
    where: { id: userId, totpEnabledAt: null },
    data:  { totpSecretEnc: encryptPII(secret), totpLastStep: null },
  })
  if (count !== 1) return null
  return { secret, uri: totpUri(secret, email) }
}

/**
 * Confirma o cadastro com um código do app. Devolve os códigos de recuperação
 * EM CLARO — esta é a única vez em que existem em claro; o banco guarda o hash.
 */
export async function confirmEnrollment(userId: string, code: string): Promise<string[] | null> {
  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { role: true, isActive: true, deletedAt: true, totpSecretEnc: true, totpEnabledAt: true },
  })
  if (!user || user.role !== "ADMIN" || !user.isActive || user.deletedAt) return null
  if (!user.totpSecretEnc || user.totpEnabledAt) return null

  const step = verifyTotp(decryptPII(user.totpSecretEnc), code.replace(/\s/g, ""))
  if (step === null) return null

  const codes = generateRecoveryCodes()
  const { count } = await prisma.user.updateMany({
    // `totpEnabledAt: null` na condição: duas confirmações simultâneas não geram dois conjuntos de códigos.
    where: { id: userId, totpEnabledAt: null },
    data:  {
      totpEnabledAt:      new Date(),
      totpLastStep:       step,
      totpRecoveryHashes: codes.map((c) => hashToken(c.replace("-", ""))),
    },
  })
  return count === 1 ? codes : null
}

/** Apaga o segundo fator — o admin volta ao estado "não cadastrado" e refaz o cadastro no próximo login. */
export async function resetSecondFactor(userId: string): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data:  { totpSecretEnc: null, totpEnabledAt: null, totpLastStep: null, totpRecoveryHashes: [] },
  })
}
