/**
 * POST /api/upload
 *
 * Endpoint genérico de upload para o Supabase Storage.
 * Aceita multipart/form-data com os campos:
 *   - file   (File)    — obrigatório
 *   - bucket (string)  — opcional, padrão: "booking-photos"
 *
 * Buckets permitidos (whitelist de segurança):
 *   - booking-photos  (público)
 *   - item-images     (público)
 *
 * Retorna: { url: string }
 */

import type { NextRequest } from "next/server"
import { NextResponse }     from "next/server"
import { auth }             from "@/lib/auth"
import { createAdminClient } from "@/lib/supabase/admin"
import { getUploadLimits } from "@/lib/platform-config"

const ALLOWED_BUCKETS = new Set(["booking-photos", "item-images"])

function isImageType(mime: string): boolean {
  return mime.startsWith("image/") || mime === "application/octet-stream"
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const formData = await req.formData() as globalThis.FormData
    const file     = formData.get("file")
    const bucket   = (formData.get("bucket") as string | null) ?? "booking-photos"

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: { code: "MISSING_FILE", message: "Arquivo obrigatório." } },
        { status: 400 },
      )
    }

    if (!ALLOWED_BUCKETS.has(bucket)) {
      return NextResponse.json(
        { error: { code: "INVALID_BUCKET", message: "Bucket não permitido." } },
        { status: 400 },
      )
    }

    if (!isImageType(file.type)) {
      return NextResponse.json(
        { error: { code: "INVALID_TYPE", message: "Apenas imagens são aceitas." } },
        { status: 422 },
      )
    }

    const { maxUploadSizeMB } = await getUploadLimits()
    if (file.size > maxUploadSizeMB * 1024 * 1024) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: `Arquivo maior que ${maxUploadSizeMB} MB.` } },
        { status: 422 },
      )
    }

    const ext      = file.name.split(".").pop()?.toLowerCase() ?? "jpg"
    const path     = `uploads/${session.user.id}/${Date.now()}.${ext}`
    const buffer   = Buffer.from(await file.arrayBuffer())
    const supabase = createAdminClient()

    const { error: uploadError } = await supabase.storage
      .from(bucket)
      .upload(path, buffer, {
        contentType:  file.type || "image/jpeg",
        cacheControl: "3600",
        upsert:       false,
      })

    if (uploadError) {
      console.error("[POST /api/upload]", uploadError.message)
      return NextResponse.json(
        { error: { code: "UPLOAD_FAILED", message: "Falha no upload da imagem." } },
        { status: 500 },
      )
    }

    const { data: { publicUrl } } = supabase.storage
      .from(bucket)
      .getPublicUrl(path)

    return NextResponse.json({ url: publicUrl }, { status: 201 })
  } catch (e) {
    console.error("[POST /api/upload]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
