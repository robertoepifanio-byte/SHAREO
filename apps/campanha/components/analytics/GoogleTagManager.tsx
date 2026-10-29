/**
 * Google Tag Manager — DESLIGADO desde 29/10/2026, aguardando parecer jurídico.
 *
 * Histórico: ativado na campanha em 15/09/2026 ([[project-gtm-campanha-2026-09-15]]),
 * revertendo a trava de 04/09. No go-live (01/10) mediu-se que o container
 * `GTM-5TQLGHFT` disparava ao GA4 e ao Google Ads — transferência internacional
 * não prevista na decisão C2.9 (art. 33). Desligado no marketplace (#549) e aqui.
 * Registro e perguntas em `docs/juridico/incidente-gtm-ga4-d0-2026-10-01.md`.
 *
 * `GTM_LIBERADO` é o interruptor único — mesmo papel que `GA4_LIBERADO` tem
 * no componente irmão: um lugar versionado e grepável. Só religar após o
 * parecer, com o container restrito ao que a Política declarar.
 */

import Script from "next/script"

export const GTM_LIBERADO = false

// O ID do container não é segredo (aparece em texto puro em todo HTML
// publicado), por isso o default hardcoded; a env var só permite trocar de
// container por ambiente sem precisar editar código.
const GTM_ID = process.env.NEXT_PUBLIC_GTM_ID || "GTM-5TQLGHFT"

/** Vai o mais alto possível no documento — chamar no layout raiz. */
export function GoogleTagManagerScript() {
  if (!GTM_LIBERADO) return null

  return (
    // afterInteractive (não beforeInteractive): mesma estratégia que o
    // @next/third-parties oficial do Next.js usa para GTM — prioriza não
    // atrasar hidratação/LCP da landing paga sobre ganhar alguns ms na
    // largada das tags.
    <Script id="gtm-script" strategy="afterInteractive">
      {`
        (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
        new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
        j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
        'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
        })(window,document,'script','dataLayer','${GTM_ID}');
      `}
    </Script>
  )
}

/**
 * Fallback sem JS — precisa ser o primeiro elemento dentro de <body>, por
 * recomendação do próprio Google. Só executa em navegador com JavaScript
 * desligado; nesse cenário o resto da landing (React, formulário) também não
 * funciona, então o impacto real de não estar perfeitamente no topo é baixo.
 */
export function GoogleTagManagerNoscript() {
  if (!GTM_LIBERADO) return null

  return (
    <noscript>
      <iframe
        src={`https://www.googletagmanager.com/ns.html?id=${GTM_ID}`}
        height="0"
        width="0"
        style={{ display: "none", visibility: "hidden" }}
        title="Google Tag Manager"
      />
    </noscript>
  )
}
