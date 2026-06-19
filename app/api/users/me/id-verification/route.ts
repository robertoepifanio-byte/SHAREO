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
import { getUploadLimits }   from "@/lib/platform-config"
import { isImageType, isMagicBytesValid } from "@/lib/imageUpload"

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
    },
  })

  return NextResponse.json({ data: { status: "PENDING" } })
}
