import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_BYTES  = Number(process.env.STORAGE_MAX_FILE_SIZE_MB ?? 5) * 1024 * 1024
const ALLOWED    = ["image/jpeg", "image/png", "image/webp"]
const BUCKET     = process.env.NEXT_PUBLIC_STORAGE_BUCKET ?? "item-images"
const MAX_IMAGES = 10

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const { id } = await params
    const item = await prisma.item.findFirst({
      where: { id, deletedAt: null },
      select: { ownerId: true, _count: { select: { images: true } } },
    })

    if (!item) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Anúncio não encontrado." } },
        { status: 404 }
      )
    }

    if (item.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Sem permissão." } },
        { status: 403 }
      )
    }

    if (item._count.images >= MAX_IMAGES) {
      return NextResponse.json(
        { error: { code: "IMAGE_LIMIT", message: `Máximo de ${MAX_IMAGES} fotos por anúncio.` } },
        { status: 422 }
      )
    }

    const formData = await req.formData()
    const file = formData.get("file")

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "MISSING_FILE", message: "Arquivo obrigatório." } },
        { status: 400 }
      )
    }

    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: `Tamanho máximo: ${process.env.STORAGE_MAX_FILE_SIZE_MB ?? 5}MB.` } },
        { status: 413 }
      )
    }

    if (!ALLOWED.includes(file.type)) {
      return NextResponse.json(
        { error: { code: "INVALID_TYPE", message: "Formatos aceitos: JPEG, PNG, WebP." } },
        { status: 415 }
      )
    }

    const ext      = (file.name.split(".").pop() ?? "jpg").toLowerCase()
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`
    const path     = `${id}/${filename}`

    const supabase = createAdminClient()
    const { error: uploadError } = await supabase.storage
      .from(BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false })

    if (uploadError) {
      console.error("[images/upload]", uploadError.message)
      return NextResponse.json(
        { error: { code: "UPLOAD_FAILED", message: "Falha no upload. Tente novamente." } },
        { status: 500 }
      )
    }

    const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(path)

    const image = await prisma.itemImage.create({
      data: { itemId: id, url: publicUrl, order: item._count.images },
      select: { id: true, url: true, order: true },
    })

    return NextResponse.json({ data: image }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/items/[id]/images]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}

export async function DELETE(req: NextRequest, { params }: RouteContext) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 }
      )
    }

    const { id } = await params
    const { imageId } = (await req.json()) as { imageId?: string }

    if (!imageId) {
      return NextResponse.json(
        { error: { code: "MISSING_IMAGE_ID", message: "imageId obrigatório." } },
        { status: 400 }
      )
    }

    const image = await prisma.itemImage.findFirst({
      where: { id: imageId, itemId: id },
      include: { item: { select: { ownerId: true } } },
    })

    if (!image) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Imagem não encontrada." } },
        { status: 404 }
      )
    }

    if (image.item.ownerId !== session.user.id && session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Sem permissão." } },
        { status: 403 }
      )
    }

    // Extract storage path from the public URL
    const url = new URL(image.url)
    const storagePath = url.pathname.split(`/${BUCKET}/`)[1]

    if (storagePath) {
      const supabase = createAdminClient()
      await supabase.storage.from(BUCKET).remove([storagePath])
    }

    await prisma.itemImage.delete({ where: { id: imageId } })

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[DELETE /api/items/[id]/images]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 }
    )
  }
}
