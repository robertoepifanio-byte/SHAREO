/**
 * POST /api/users/me/id-verification
 * Envia documentos para verificação de identidade.
 * Body: FormData com "document" (foto do doc) e "selfie" (selfie do usuário)
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { auth }             from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { createClient }     from "@supabase/supabase-js"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
)

export async function POST(req: NextRequest) {
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

  const formData = await req.formData()
  const docFile  = formData.get("document") as File | null
  const selfie   = formData.get("selfie")   as File | null

  if (!docFile || !selfie)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Envie o documento e a selfie." } },
      { status: 400 }
    )

  const MAX = 10 * 1024 * 1024
  if (docFile.size > MAX || selfie.size > MAX)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Arquivo muito grande (máx 10 MB)." } },
      { status: 400 }
    )

  const userId = session.user.id
  const now    = Date.now()

  const [docBuf, selfieBuf] = await Promise.all([
    docFile.arrayBuffer().then(Buffer.from),
    selfie.arrayBuffer().then(Buffer.from),
  ])

  const docExt    = docFile.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const selfieExt = selfie.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const docPath   = `id-verification/${userId}/document-${now}.${docExt}`
  const selfiePath = `id-verification/${userId}/selfie-${now}.${selfieExt}`

  const [docUpload, selfieUpload] = await Promise.all([
    supabase.storage.from("id-docs").upload(docPath,    docBuf,    { contentType: docFile.type }),
    supabase.storage.from("id-docs").upload(selfiePath, selfieBuf, { contentType: selfie.type }),
  ])

  if (docUpload.error || selfieUpload.error) {
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: "Falha ao enviar arquivos." } },
      { status: 500 }
    )
  }

  const docUrl    = supabase.storage.from("id-docs").getPublicUrl(docPath).data.publicUrl
  const selfieUrl = supabase.storage.from("id-docs").getPublicUrl(selfiePath).data.publicUrl

  await prisma.user.update({
    where: { id: userId },
    data: {
      idVerificationStatus: "PENDING",
      idDocumentUrl:        docUrl,
      idSelfieUrl:          selfieUrl,
      idSubmittedAt:        new Date(),
    },
  })

  return NextResponse.json({ data: { status: "PENDING" } })
}
