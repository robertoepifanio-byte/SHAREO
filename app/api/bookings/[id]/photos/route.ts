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

type Ctx = { params: Promise<{ id: string }> }

const ALLOWED_PHASES = ["CHECKIN", "CHECKOUT"] as const
type Phase = (typeof ALLOWED_PHASES)[number]

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

  const isParticipant =
    booking.borrowerId === session.user.id || booking.ownerId === session.user.id
  if (!isParticipant)
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

  const { id } = await params

  const booking = await prisma.booking.findFirst({
    where:  { id, deletedAt: null },
    select: { borrowerId: true, ownerId: true, status: true },
  })
  if (!booking) return NextResponse.json({ error: { code: "NOT_FOUND" } }, { status: 404 })

  const isParticipant =
    booking.borrowerId === session.user.id || booking.ownerId === session.user.id
  if (!isParticipant)
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

  if (file.size > 10 * 1024 * 1024)
    return NextResponse.json(
      { error: { code: "VALIDATION_ERROR", message: "Arquivo muito grande (máx 10 MB)." } },
      { status: 400 }
    )

  const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
  const path     = `bookings/${id}/${phase.toLowerCase()}/${Date.now()}-${session.user.id}.${ext}`
  const buffer   = Buffer.from(await file.arrayBuffer())

  const supabase = createAdminClient()

  const { error: uploadError } = await supabase.storage
    .from("booking-photos")
    .upload(path, buffer, { contentType: file.type, upsert: false })

  if (uploadError)
    return NextResponse.json(
      { error: { code: "UPLOAD_ERROR", message: uploadError.message } },
      { status: 500 }
    )

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
