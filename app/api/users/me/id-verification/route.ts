/**
 * POST /api/users/me/id-verification
 * Envia documentos para verificação de identidade.
 * Body: FormData com "document" (foto do doc) e "selfie" (selfie do usuário)
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { auth }             from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUploadLimits, getBiometricConsentConfig } from "@/lib/platform-config"
import { isImageType, isMagicBytesValid } from "@/lib/imageUpload"
import { BIOMETRIC_CONSENT_VERSION } from "@/lib/legal-config"
import { BIOMETRIC_CONSENT_TEXT } from "@/lib/legal/biometric-consent-text"
import { hashToken } from "@/lib/crypto"
import { extractClientIp } from "@/lib/access-log"

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
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

  const userId = session.user.id
  const now    = Date.now()

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

  const docExt    = docFile.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const selfieExt = selfie.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const docPath   = `id-verification/${userId}/document-${now}.${docExt}`
  const selfiePath = `id-verification/${userId}/selfie-${now}.${selfieExt}`

  const [docUpload, selfieUpload] = await Promise.all([
    supabase.storage.from("id-docs").upload(docPath,    docBuf,    { contentType: docFile.type }),
    supabase.storage.from("id-docs").upload(selfiePath, selfieBuf, { contentType: selfie.type }),
  ])

  if (docUpload.error || selfieUpload.error) {
    const detail = docUpload.error?.message ?? selfieUpload.error?.message ?? "unknown"
    console.error("[id-verification upload]", detail)
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: `Falha ao enviar arquivos: ${detail}` } },
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
