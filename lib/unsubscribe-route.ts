/**
 * Esqueleto comum das rotas de descadastro.
 *
 * As duas listas (campanha de Fundadores e e-mails de reengajamento) precisam
 * exatamente do mesmo protocolo, e só ele muda de lista para lista:
 *
 *   GET  → clique humano no rodapé do e-mail; mostra uma confirmação.
 *   POST → aplica. Atende dois remetentes: o formulário da página de
 *          confirmação (responde HTML) e o one-click automático do provedor
 *          (RFC 8058, responde 204).
 *
 * 🪤 O GET NÃO altera estado, de propósito. A URL de descadastro vai no corpo
 * do e-mail E no header `List-Unsubscribe`, e scanners corporativos que abrem
 * links automaticamente — Microsoft Defender SafeLinks, alguns antivírus,
 * clientes que fazem prefetch — descadastrariam a pessoa sem ela clicar em
 * nada. Ela simplesmente pararia de receber, sem saber por quê. O one-click do
 * provedor continua funcionando porque usa POST, que é o que a RFC exige.
 *
 * O que de fato difere entre as listas é o token, o efeito no banco e a copy.
 * Antes desta extração o resto existia copiado, byte a byte, nos dois arquivos.
 *
 * Idempotente por contrato: descadastrar duas vezes devolve sucesso, não erro.
 * E um token válido sempre responde sucesso, mesmo para e-mail que não está na
 * base — não vazar se a conta existe é parte do desenho.
 */
import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { UnsubscribeLink } from "@/lib/unsubscribe-token"

export type UnsubscribeCopy = {
  /** Página do GET — pergunta antes de aplicar. */
  confirmTitle: string
  confirmBody: string
  confirmButton: string
  /** Página do POST vindo do formulário — já aplicado. */
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
function page(title: string, body: string, status: number, extra = "") {
  return new NextResponse(
    `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex">
<title>${title} · ShareO</title></head>
<body style="margin:0;font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;background:#F8FAFC;color:#0F172A">
<div style="max-width:520px;margin:15vh auto;padding:32px;background:#fff;border-radius:12px;border:1px solid #E2E8F0;text-align:center">
<h1 style="margin:0 0 12px;font-size:20px;color:#003366">${title}</h1>
<p style="margin:0;font-size:15px;line-height:1.6;color:#475569">${body}</p>
${extra}
</div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } },
  )
}

/**
 * Formulário de confirmação. Sem `action`: pela especificação HTML, `action`
 * ausente significa a URL do documento, e `method=post` preserva a query
 * string — é dela que `email` e `token` são lidos, nos dois métodos. Assim não
 * há campo oculto para alguém esquecer de preencher.
 *
 * 🪤 Isso acopla a rota a NUNCA ser redirecionada. Um `redirects` novo, uma
 * normalização de barra final ou um rewrite que descarte a query mata o POST
 * em silêncio: o formulário vai sem credencial e a pessoa recebe "Link
 * inválido" sem entender por quê.
 */
function confirmForm(label: string) {
  return `<form method="post" style="margin:24px 0 0">
<button type="submit" style="min-height:44px;padding:12px 28px;font-size:15px;font-weight:700;color:#fff;background:#007B3C;border:0;border-radius:8px;cursor:pointer">${label}</button>
</form>`
}

export function makeUnsubscribeHandlers(config: UnsubscribeRouteConfig) {
  function credentials(req: NextRequest) {
    const email = req.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? ""
    const token = req.nextUrl.searchParams.get("token") ?? ""
    return { email, valid: config.link.verify(email, token) }
  }

  const invalidPage = () => page("Link inválido", config.copy.invalidBody, 400)

  return {
    // Sem `try/catch`, de propósito: nada aqui lança. `verify` engole a própria
    // exceção (AUTH_SECRET ausente vira `false`), `searchParams.get` não lança
    // e `page` só monta a resposta. Um catch seria uma página de erro
    // inalcançável — e um `console.error` sugerindo um modo de falha que não
    // existe para quem for depurar.
    async GET(req: NextRequest) {
      const { valid } = credentials(req)
      return valid
        ? page(
            config.copy.confirmTitle,
            config.copy.confirmBody,
            200,
            confirmForm(config.copy.confirmButton),
          )
        : invalidPage()
    },

    async POST(req: NextRequest) {
      // 🪤 Declarado FORA do `try`: o `catch` precisa saber quem está do outro
      // lado. Como `const` interno, toda falha respondia corpo vazio — e quem
      // recebia isso era a pessoa que acabou de clicar em "Sim, desligar",
      // vendo tela branca no exato momento da revogação (LGPD art. 18). A
      // alternativa dela vira marcar como spam, no mesmo remetente que manda
      // reset de senha.
      let oneClick = false

      try {
        // RFC 8058 manda o provedor postar `List-Unsubscribe=One-Click` no
        // corpo, com `application/x-www-form-urlencoded` — que o formulário
        // humano também usa, então o Content-Type não distingue. O corpo é o
        // único sinal normativo.
        //
        // Corpo ilegível conta como humano: não dá para saber quem é, e errar
        // para esse lado custa 200 em vez de 204 numa máquina que aceita
        // qualquer 2xx — o descadastro é aplicado nos dois ramos.
        oneClick = (await req.text().catch(() => "")).includes("List-Unsubscribe=One-Click")

        const { email, valid } = credentials(req)
        if (valid) await config.apply(email)

        if (oneClick) return new NextResponse(null, { status: valid ? 204 : 400 })
        return valid ? page(config.copy.successTitle, config.copy.successBody, 200) : invalidPage()
      } catch (e) {
        console.error(`[POST ${config.label}]`, e instanceof Error ? e.message : e)
        return oneClick
          ? new NextResponse(null, { status: 500 })
          : page("Erro", "Não conseguimos processar agora. Tente novamente em alguns minutos.", 500)
      }
    },
  }
}
