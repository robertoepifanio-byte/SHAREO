/**
 * Google Tag Manager no marketplace (go-live, 01/10/2026). Cópia de
 * apps/campanha/components/analytics/GoogleTagManager.tsx, com nonce: o CSP de
 * produção do app é por nonce. `GTM_LIBERADO` é literal de propósito —
 * analytics-declaracao.test.ts exige o GTM nas Políticas enquanto for `true`.
 *
 * ⚠️ A Política (§5.2) promete que nenhuma etiqueta lê o que a pessoa digita, e
 * aqui o GTM fica carregado em telas com CPF, e-mail, endereço e chat: o
 * container NÃO pode ter gatilho de formulário, variável de elemento de
 * formulário nem Enhanced Conversions. O código não tem como impedir isso.
 */

import Script from "next/script"

export const GTM_LIBERADO = true

// O ID do container não é segredo (vai em texto puro em todo HTML publicado).
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-5TQLGHFT"

export function GoogleTagManager({ nonce }: { nonce?: string }) {
  if (!GTM_LIBERADO) return null

  return (
    // lazyOnload: o app inteiro carrega o GTM, então ele espera o navegador
    // ficar ocioso; eventos empurrados antes entram na fila do dataLayer. O
    // nonce também vai no <script> do gtm.js para o CSP aceitá-lo.
    <Script id="gtm-script" strategy="lazyOnload" nonce={nonce}>
      {`
        (function(w,d,s,l,i,n){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;if(n)j.setAttribute('nonce',n);
        f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}','${nonce ?? ""}');
      `}
    </Script>
  )
}

/** Conversões enviadas ao dataLayer — SEM parâmetro: tudo do cadastro é dado
 *  pessoal. Separado do `trackEvent` (GA4) de propósito: ligar o GTM não pode
 *  fazer os eventos GA4 com item_id/search_term passarem a sair. */
type GtmEvento = "sign_up"

export function gtmEvent(evento: GtmEvento) {
  if (!GTM_LIBERADO || typeof window === "undefined") return
  const w = window as unknown as { dataLayer?: unknown[] }
  ;(w.dataLayer ||= []).push({ event: evento })
}
