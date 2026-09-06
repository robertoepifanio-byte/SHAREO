/**
 * PATCH /api/users/me/engagement-emails
 *
 * Liga/desliga os e-mails de reengajamento pelo próprio titular, a partir de
 * `/perfil/notificacoes`. É o mesmo efeito do link no rodapé do e-mail, pelo
 * caminho de quem já está logado — a LGPD (art. 18) pede que revogar seja tão
 * fácil quanto consentir, e "procure um e-mail antigo para achar o link" não
 * atende isso.
 *
 * Só afeta comunicação OPCIONAL. E-mail transacional — confirmação de reserva,
 * cobrança, reset de senha — não é desligável por aqui nem por lugar nenhum:
 * é execução do contrato.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { z } from "zod"
import { withUser } from "@/lib/withUser"
import { prisma } from "@/lib/prisma"

const schema = z.object({ enabled: z.boolean() })

export async function PATCH(req: NextRequest) {
  try {
    const user = await withUser(req)
    if (user instanceof NextResponse) return user

    const parsed = schema.safeParse(await req.json().catch(() => null))
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Envie { enabled: boolean }." } },
        { status: 400 },
      )
    }

    // O campo guarda a RECUSA; a UI fala em "receber". Inverter aqui mantém a
    // tela positiva ("Receber avisos") sem que o banco precise de um default
    // `true`, que exigiria backfill em toda a base existente.
    await prisma.user.update({
      where: { id: user.id },
      data:  { engagementEmailsOptOut: !parsed.data.enabled },
    })

    return NextResponse.json({ data: { enabled: parsed.data.enabled } })
  } catch (e) {
    console.error("[PATCH /api/users/me/engagement-emails]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
