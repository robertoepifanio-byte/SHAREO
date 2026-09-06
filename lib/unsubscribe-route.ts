/**
 * Esqueleto comum das rotas de descadastro.
 *
 * As duas listas (campanha de Fundadores e e-mails de reengajamento) precisam
 * exatamente do mesmo protocolo, e só ele muda de lista para lista:
 *
 *   GET  → clique humano no rodapé do e-mail, responde HTML de confirmação.
 *   POST → one-click automático do provedor (RFC 8058), responde 204.
 *
 * O que de fato difere entre elas é o token, o efeito no banco e dois textos.
 * Antes desta extração o resto — a página HTML autocontida e os dois handlers —
 * existia copiado, byte a byte, nos dois arquivos: corrigir contraste, `lang`
 * ou um link quebrado na confirmação exigia lembrar de editar os dois, e a
 * terceira lista copiaria tudo de novo.
 *
 * Idempotente por contrato: descadastrar duas vezes devolve sucesso, não erro.
 * E um token válido sempre responde sucesso, mesmo para e-mail que não está na
 * base — não vazar se a conta existe é parte do desenho.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { UnsubscribeLink } from "@/lib/unsubscribe-token"

export type UnsubscribeCopy = {
  successTitle: string
  successBody: string
  invalidBody: string
}

export type UnsubscribeRouteConfig = {
  /** Rótulo do log — aparece em `[GET /api/...]`. */
  label: string
  link: UnsubscribeLink
  /** Aplica o descadastro. Não deve lançar para e-mail inexistente. */
  apply: (email: string) => Promise<void>
  copy: UnsubscribeCopy
}

/**
 * HTML mínimo e autocontido: a resposta é aberta a partir do cliente de e-mail,
 * muitas vezes num webview sem acesso ao CSS da aplicação. Cores da paleta
 * ShareO embutidas por isso — não é hardcode por descuido.
 */
function page(title: string, body: string, status: number) {
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

export function makeUnsubscribeHandlers(config: UnsubscribeRouteConfig) {
  async function unsubscribe(req: NextRequest): Promise<"ok" | "invalid"> {
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? ""
    const token = req.nextUrl.searchParams.get("token") ?? ""

    if (!config.link.verify(email, token)) return "invalid"

    await config.apply(email)
    return "ok"
  }

  return {
    async GET(req: NextRequest) {
      try {
        const r = await unsubscribe(req)
        return r === "invalid"
          ? page("Link inválido", config.copy.invalidBody, 400)
          : page(config.copy.successTitle, config.copy.successBody, 200)
      } catch (e) {
        console.error(`[GET ${config.label}]`, e instanceof Error ? e.message : e)
        return page("Erro", "Não conseguimos processar agora. Tente novamente em alguns minutos.", 500)
      }
    },

    /** One-click do provedor de e-mail (RFC 8058). Sem corpo de resposta. */
    async POST(req: NextRequest) {
      try {
        const r = await unsubscribe(req)
        return new NextResponse(null, { status: r === "invalid" ? 400 : 204 })
      } catch (e) {
        console.error(`[POST ${config.label}]`, e instanceof Error ? e.message : e)
        return new NextResponse(null, { status: 500 })
      }
    },
  }
}
