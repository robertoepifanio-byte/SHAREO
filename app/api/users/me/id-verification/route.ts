/**
 * GET /api/users/me/id-verification
 * Status de verificação + documento cadastrado (mascarado). Fonte:
 * app/perfil/documentos/page.tsx linhas 17-46 (mesma lógica de decrypt/mask,
 * escopada nesta rota — não em /api/users/me — pra não pagar o custo de
 * decriptografia em toda chamada do endpoint de perfil, que é usado por
 * várias telas que não precisam desse dado).
 *
 * POST /api/users/me/id-verification
 * Envia documentos para verificação de identidade.
 * Body: FormData com "document" (foto do doc) e "selfie" (selfie do usuário)
 * Aceita Bearer token (mobile) ou cookie de sessão (web) via resolveUserId.
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { resolveUserId }    from "@/lib/resolveUserId"
import { prisma }           from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUploadLimits, getBiometricConsentConfig } from "@/lib/platform-config"
import { isImageType, isMagicBytesValid, EXT_BY_MIME } from "@/lib/imageUpload"
import { BIOMETRIC_CONSENT_VERSION } from "@/lib/legal-config"
import { BIOMETRIC_CONSENT_TEXT } from "@/lib/legal/biometric-consent-text"
import { hashToken, decryptDocument, maskCPF, maskCNPJ } from "@/lib/crypto"
import { extractClientIp } from "@/lib/access-log"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

export async function GET(req: NextRequest) {
  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  // Rate limit de leitura — este GET faz decrypt AES por chamada (custo de CPU/KMS).
  // O React Query do app pode refazer o fetch a cada focus; sem limite, um loop de
  // refetch dispara milhares de decrypts/min. Achado revisão s41 (segurança).
  const rl = await checkRateLimit(`id-verification-read:${userId}`, 30, 60_000, req)
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: {
      userType:             true,
      cpfEncrypted:         true,
      cnpjEncrypted:        true,
      idVerificationStatus: true,
      idRejectionReason:    true,
      idSelfieConsentAt:    true,
    },
  })

  if (!user) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  const { required: biometricConsentRequired } = await getBiometricConsentConfig()

  // Decriptografar e mascarar — nunca expor o valor completo ao cliente
  // (verbatim de app/perfil/documentos/page.tsx linhas 33-46).
  let maskedDocument: string | null = null
  let docLabel = "CPF"
  try {
    if (user.userType === "PJ" && user.cnpjEncrypted) {
      maskedDocument = maskCNPJ(decryptDocument(user.cnpjEncrypted))
      docLabel       = "CNPJ"
    } else if (user.cpfEncrypted) {
      maskedDocument = maskCPF(decryptDocument(user.cpfEncrypted))
      docLabel       = "CPF"
    }
  } catch {
    // Erro de decriptografia — não expor nada
  }

  return NextResponse.json({
    data: {
      idVerificationStatus:    user.idVerificationStatus,
      idRejectionReason:       user.idRejectionReason,
      maskedDocument,
      docLabel,
      biometricConsentRequired,
      hasBiometricConsent:     user.idSelfieConsentAt !== null,
    },
  })
}

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  const userId = await resolveUserId(req)
  if (!userId) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  // M4 (SEC-MED): rate limit por usuário — mesmo padrão de checkRateLimit/rateLimitResponse
  // já usado em POST /api/bookings e RATE_LIMITS em lib/rateLimit.ts.
  const rl = await checkRateLimit(
    `upload:${userId}`,
    RATE_LIMITS.upload.limit,
    RATE_LIMITS.upload.windowMs,
    req,
  )
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const user = await prisma.user.findUnique({
    where:  { id: userId },
    select: { idVerificationStatus: true },
  })

  if (user?.idVerificationStatus === "VERIFIED")
    return NextResponse.json({ error: { code: "ALREADY_VERIFIED" } }, { status: 409 })

  if (user?.idVerificationStatus === "PENDING")
    return NextResponse.json({ error: { code: "ALREADY_PENDING", message: "Documentos já enviados, aguarde a análise." } }, { status: 409 })

  const formData = await req.formData() as globalThis.FormData
  const docFile  = formData.get("document") as File | null
  const selfie   = formData.get("selfie")   as File | null

  if (!docFile || !selfie)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Envie o documento e a selfie." } },
      { status: 400 }
    )

  const { maxUploadSizeMB } = await getUploadLimits()
  const MAX = maxUploadSizeMB * 1024 * 1024
  if (docFile.size > MAX || selfie.size > MAX)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: `Arquivo muito grande (máx ${maxUploadSizeMB} MB).` } },
      { status: 400 }
    )

  if (!isImageType(docFile.type) || !isImageType(selfie.type))
    return NextResponse.json(
      { error: { code: "INVALID_TYPE", message: "Documento e selfie devem ser imagens (JPEG, PNG, WebP, HEIC)." } },
      { status: 415 }
    )

  // Consentimento biométrico (LGPD art. 11 — decisão C1). Só exigido/gravado quando
  // a flag biometricConsentRequired está ligada. Com a flag OFF (default), este bloco
  // é inerte e o fluxo de KYC segue idêntico ao atual.
  const { required: biometricConsentRequired } = await getBiometricConsentConfig()
  let consentData: {
    idSelfieConsentAt: Date
    idSelfieConsentVersion: string
    idSelfieConsentTextHash: string
    idSelfieConsentIp: string
  } | null = null

  if (biometricConsentRequired) {
    const consentAccepted = formData.get("biometricConsent") === "true"
    if (!consentAccepted)
      return NextResponse.json(
        {
          error: {
            code:    "BIOMETRIC_CONSENT_REQUIRED",
            message: "É necessário consentir com o tratamento biométrico da selfie para prosseguir.",
          },
        },
        { status: 412 }
      )
    consentData = {
      idSelfieConsentAt:       new Date(),
      idSelfieConsentVersion:  BIOMETRIC_CONSENT_VERSION,
      // Hash da MESMA string canônica exibida na UI — prova de qual versão o titular leu.
      idSelfieConsentTextHash: hashToken(BIOMETRIC_CONSENT_TEXT),
      idSelfieConsentIp:       extractClientIp(req),
    }
  }

  const now = Date.now()

  const [docArr, selfieArr] = await Promise.all([
    docFile.arrayBuffer(),
    selfie.arrayBuffer(),
  ])

  if (!(await isMagicBytesValid(docArr)) || !(await isMagicBytesValid(selfieArr)))
    return NextResponse.json(
      { error: { code: "INVALID_TYPE", message: "Arquivo inválido ou corrompido." } },
      { status: 415 }
    )

  const docBuf    = Buffer.from(docArr)
  const selfieBuf = Buffer.from(selfieArr)

  // A2 (SEC-ALTO): extensão derivada do MIME já validado, NUNCA do nome do cliente
  // (evita salvar .php/.exe no bucket privado). Paridade com app/api/upload/route.ts.
  const docExt    = EXT_BY_MIME[docFile.type.toLowerCase()] ?? "jpg"
  const selfieExt = EXT_BY_MIME[selfie.type.toLowerCase()]  ?? "jpg"
  const docPath   = `id-verification/${userId}/document-${now}.${docExt}`
  const selfiePath = `id-verification/${userId}/selfie-${now}.${selfieExt}`

  const [docUpload, selfieUpload] = await Promise.all([
    supabase.storage.from("id-docs").upload(docPath,    docBuf,    { contentType: docFile.type }),
    supabase.storage.from("id-docs").upload(selfiePath, selfieBuf, { contentType: selfie.type }),
  ])

  if (docUpload.error || selfieUpload.error) {
    // M2 (SEC-MED): log interno com detalhe; resposta ao cliente é genérica
    // (paridade com app/api/upload/route.ts e app/api/items/[id]/images/route.ts).
    const detail = docUpload.error?.message ?? selfieUpload.error?.message ?? "unknown"
    console.error("[id-verification upload]", detail)
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: "Falha ao enviar arquivos. Tente novamente." } },
      { status: 500 }
    )
  }

  // Bucket id-docs é privado — não usar getPublicUrl (retorna URL inoperante).
  // Salvar o storage path diretamente; a admin page gera signed URLs sob demanda.
  await prisma.user.update({
    where: { id: userId },
    data: {
      idVerificationStatus: "PENDING",
      idDocumentUrl:        docPath,
      idSelfieUrl:          selfiePath,
      idSubmittedAt:        new Date(),
      ...(consentData ?? {}),
    },
  })

  return NextResponse.json({ data: { status: "PENDING" } })
}
