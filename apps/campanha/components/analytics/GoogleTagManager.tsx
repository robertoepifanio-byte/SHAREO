/**
 * Google Tag Manager — ativo na campanha desde 15/09/2026.
 *
 * Autorização e histórico: [[project-gtm-campanha-2026-09-15]] (memória do
 * projeto). Resumo: reverte conscientemente a trava de 04/09 documentada em
 * `GoogleAnalytics.tsx` ("nenhuma ferramenta de medição de terceiro").
 *
 * `GTM_LIBERADO` é o interruptor único — mesmo papel que `GA4_LIBERADO` tem
 * no componente irmão: um lugar versionado e grepável pra desligar, sem
 * precisar remover o arquivo, se o jurídico reverter de novo (já aconteceu
 * uma vez com o GA4 em 04/09).
 */

import Script from "next/script"

export const GTM_LIBERADO = true

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
