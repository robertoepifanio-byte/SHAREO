import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { WEBHOOK_EVENTS } from "@/lib/outboundWebhooks"

type Params = { params: Promise<{ id: string }> }

const PatchSchema = z.object({
  isActive: z.boolean().optional(),
  events:   z.array(z.enum(WEBHOOK_EVENTS)).min(1).optional(),
})

// PATCH — ativar/desativar ou atualizar eventos
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const hook   = await prisma.outboundWebhook.findUnique({
      where:  { id },
      select: { userId: true },
    })

    if (!hook || hook.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Webhook não encontrado." } },
        { status: 404 },
      )
    }

    const body   = await req.json()
    const parsed = PatchSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos." } },
        { status: 400 },
      )
    }

    const updated = await prisma.outboundWebhook.update({
      where: { id },
      data: {
        ...(parsed.data.isActive !== undefined && { isActive: parsed.data.isActive, failureCount: 0 }),
        ...(parsed.data.events   !== undefined && { events:   parsed.data.events }),
      },
      select: { id: true, url: true, events: true, isActive: true, updatedAt: true },
    })

    return NextResponse.json({ data: updated })
  } catch (e) {
    console.error("[PATCH /api/pj/webhooks/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}

// DELETE — remove webhook
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    const { id } = await params
    const hook   = await prisma.outboundWebhook.findUnique({
      where:  { id },
      select: { userId: true },
    })

    if (!hook || hook.userId !== session.user.id) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Webhook não encontrado." } },
        { status: 404 },
      )
    }

    await prisma.outboundWebhook.delete({ where: { id } })

    return NextResponse.json({ data: { message: "Webhook removido." } })
  } catch (e) {
    console.error("[DELETE /api/pj/webhooks/:id]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
