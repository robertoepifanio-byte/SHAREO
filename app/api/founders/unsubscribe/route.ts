/**
 * GET|POST /api/founders/unsubscribe?email=…&token=…
 *
 * Descadastro da lista de interessados do pré-lançamento.
 *
 * Por que existe: a campanha é NACIONAL e envia e-mail em volume. Isso obriga
 *   (a) LGPD art. 18 — revogação do consentimento tem que ser tão fácil quanto
 *       concedê-la; "mande e-mail para privacidade@" não sustenta isso em volume;
 *   (b) regras de bulk sender de Gmail/Yahoo — exigem List-Unsubscribe com
 *       one-click acima de ~5k destinatários/dia.
 *
 * GET  → clique humano no rodapé do e-mail, responde HTML de confirmação.
 * POST → one-click automático do provedor (List-Unsubscribe-Post), responde 204.
 *
 * Sem sessão de propósito: o clique vem do cliente de e-mail, sem cookie. A
 * autenticação é o HMAC do próprio e-mail (ver lib/founders-unsubscribe.ts).
 * Idempotente: descadastrar duas vezes devolve sucesso, não erro.
 */
import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { revalidateTag } from "next/cache"
import { prisma } from "@/lib/prisma"
import { verifyUnsubscribeToken } from "@/lib/founders-unsubscribe"

export const runtime = "nodejs"

async function unsubscribe(req: NextRequest): Promise<"ok" | "invalid"> {
  const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? ""
  const token = req.nextUrl.searchParams.get("token") ?? ""

  if (!verifyUnsubscribeToken(email, token)) return "invalid"

  const lead = await prisma.founderLead.findUnique({
    where:  { email },
    select: { id: true, status: true },
  })

  // Não vaza se o e-mail existe ou não — token válido sempre responde sucesso.
  if (!lead) return "ok"
  if (lead.status === "UNSUBSCRIBED") return "ok"

  await prisma.founderLead.update({
    where: { id: lead.id },
    data:  { status: "UNSUBSCRIBED" },
  })

  after(() =>
    prisma.founderAuditLog
      .create({ data: { leadId: lead.id, action: "UNSUBSCRIBED" } })
      .catch(() => {}),
  )
  revalidateTag("founders")

  return "ok"
}

function page(title: string, body: string, status: number) {
  // HTML mínimo e autocontido: a resposta é aberta a partir do cliente de e-mail,
  // muitas vezes num webview sem acesso ao CSS da aplicação.
  return new NextResponse(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · ShareO</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F8FAFC;color:#0F172A">
<div style="max-width:520px;margin:15vh auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #E2E8F0;text-align:center">
<h1 style="margin:0 0 12px;font-size:20px;color:#003366">${title}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#475569">${body}</p>
</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )
}

export async function GET(req: NextRequest) {
  try {
    const r = await unsubscribe(req)
    if (r === "invalid") {
      return page(
        "Link inválido",
        "Este link de descadastro não é válido ou expirou. Se quiser sair da lista, responda a qualquer e-mail nosso ou escreva para <a href=\"mailto:privacidade@shareo.com.br\" style=\"color:#007B3C\">privacidade@shareo.com.br</a>.",
        400,
      )
    }
    return page(
      "Tudo certo — você saiu da lista",
      "Não enviaremos mais e-mails sobre o lançamento do ShareO. Mudou de ideia? É só entrar na lista de novo pelo site.",
      200,
    )
  } catch (e) {
    console.error("[GET /api/founders/unsubscribe]", e instanceof Error ? e.message : e)
    return page("Erro", "Não conseguimos processar agora. Tente novamente em alguns minutos.", 500)
  }
}

/** One-click do provedor de e-mail (RFC 8058). Sem corpo de resposta. */
export async function POST(req: NextRequest) {
  try {
    const r = await unsubscribe(req)
    return new NextResponse(null, { status: r === "invalid" ? 400 : 204 })
  } catch (e) {
    console.error("[POST /api/founders/unsubscribe]", e instanceof Error ? e.message : e)
    return new NextResponse(null, { status: 500 })
  }
}
