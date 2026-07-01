/**
 * POST /api/bookings/[id]/photos
 * Faz upload de fotos de check-in ou check-out para o Supabase Storage.
 * Body: FormData com campo "phase" (CHECKIN|CHECKOUT) e "file" (imagem)
 *
 * GET /api/bookings/[id]/photos?phase=CHECKIN|CHECKOUT
 * Retorna URLs das fotos de uma fase.
 */
import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { auth }             from "@/lib/auth"
import { prisma }           from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUploadLimits }   from "@/lib/platform-config"
import { isImageType, isMagicBytesValid, EXT_BY_MIME } from "@/lib/imageUpload"
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "@/lib/rateLimit"

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_PHASES = ["CHECKIN", "CHECKOUT"] as const
type Phase = (typeof ALLOWED_PHASES)[number]

// Extra (dedup seguro): guard de participante de locação — evita repetição inline.
function isBookingParticipant(
  booking: { borrowerId: string; ownerId: string },
  userId: string,
): boolean {
  return booking.borrowerId === userId || booking.ownerId === userId
}

export async function GET(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  const { id }  = await params
  const phase   = req.nextUrl.searchParams.get("phase") as Phase | null

  const booking = await prisma.booking.findFirst({
    where:  { id, deletedAt: null },
    select: { borrowerId: true, ownerId: true },
  })
  if (!booking) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  if (!isBookingParticipant(booking, session.user.id))
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const photos = await prisma.bookingPhoto.findMany({
    where:   { bookingId: id, ...(phase ? { phase } : {}) },
    orderBy: { createdAt: "asc" },
    select:  { id: true, url: true, phase: true, uploadedBy: true, createdAt: true },
  })

  return NextResponse.json({ data: photos })
}

export async function POST(req: NextRequest, { params }: Ctx) {
  const session = await auth()
  if (!session) return NextResponse.json({ error: { code: "UNAUTHORIZED" } }, { status: 401 })

  // M4 (SEC-MED): rate limit por usuário — mesmo padrão de checkRateLimit/rateLimitResponse
  // já usado em POST /api/bookings e RATE_LIMITS em lib/rateLimit.ts.
  const rl = await checkRateLimit(
    `upload:${session.user.id}`,
    RATE_LIMITS.upload.limit,
    RATE_LIMITS.upload.windowMs,
    req,
  )
  if (!rl.allowed) return rateLimitResponse(rl.resetAt)

  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where:  { id, deletedAt: null },
    select: { borrowerId: true, ownerId: true, status: true },
  })
  if (!booking) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  if (!isBookingParticipant(booking, session.user.id))
    return NextResponse.json({ error: { code: "FORBIDDEN" } }, { status: 403 })

  const formData = await req.formData() as globalThis.FormData
  const phase    = formData.get("phase") as string
  const file     = formData.get("file") as File | null

  if (!ALLOWED_PHASES.includes(phase as Phase))
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "phase deve ser CHECKIN ou CHECKOUT." } },
      { status: 400 }
    )

  if (!file || file.size === 0)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Arquivo obrigatório." } },
      { status: 400 }
    )

  const { maxUploadSizeMB } = await getUploadLimits()
  if (file.size > maxUploadSizeMB * 1024 * 1024)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: `Arquivo muito grande (máx ${maxUploadSizeMB} MB).` } },
      { status: 400 }
    )

  if (!isImageType(file.type))
    return NextResponse.json(
      { error: { code: "INVALID_TYPE", message: "Selecione uma imagem (JPEG, PNG, WebP, HEIC)." } },
      { status: 415 }
    )

  // A2 (SEC-ALTO): extensão derivada do MIME já validado, NUNCA do nome do cliente
  // (evita salvar .php/.exe no bucket). Paridade com app/api/upload/route.ts.
  const ext      = EXT_BY_MIME[file.type.toLowerCase()] ?? "jpg"
  const path     = `bookings/${id}/${phase.toLowerCase()}/${Date.now()}-${session.user.id}.${ext}`
  const arrayBuf = await file.arrayBuffer()
  if (!(await isMagicBytesValid(arrayBuf)))
    return NextResponse.json(
      { error: { code: "INVALID_TYPE", message: "Arquivo inválido ou corrompido." } },
      { status: 415 }
    )
  const buffer   = Buffer.from(arrayBuf)

  const supabase = createAdminClient()

  const { error: uploadError } = await supabase.storage
    .from("booking-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError) {
    // M1 (SEC-MED): log interno com detalhe; resposta ao cliente é genérica
    // (paridade com app/api/upload/route.ts e app/api/items/[id]/images/route.ts).
    console.error("[booking-photos upload]", uploadError.message)
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: "Falha no upload." } },
      { status: 500 }
    )
  }

  const { data: { publicUrl } } = supabase.storage
    .from("booking-photos")
    .getPublicUrl(path)

  const photo = await prisma.bookingPhoto.create({
    data: {
      bookingId:  id,
      url:        publicUrl,
      phase:      phase as Phase,
      uploadedBy: session.user.id,
    },
  })

  return NextResponse.json({ data: photo }, { status: 201 })
}
