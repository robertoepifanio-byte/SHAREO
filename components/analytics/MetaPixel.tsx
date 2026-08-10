/**
 * Meta Pixel — PREPARADO E DESLIGADO.
 *
 * Sem `NEXT_PUBLIC_META_PIXEL_ID` definido este componente não renderiza nada e
 * nenhuma requisição sai para o Meta. Existe para que ligar o pixel no dia da
 * verba seja um flip de variável de ambiente, e não um deploy de véspera.
 *
 * ── Por que existir antes de haver verba ────────────────────────────────────
 * O CSP de produção libera Google Analytics e NÃO libera facebook.net. Subir o
 * pixel sem mexer no CSP resulta em falha SILENCIOSA — o script é bloqueado, o
 * Gerenciador de Anúncios não recebe evento nenhum, e a campanha roda cega sem
 * que nada apareça quebrado na tela. É a armadilha nº 1 documentada no
 * CLAUDE.md. Esta PR resolve o CSP junto, para o dia da ativação não ter
 * surpresa.
 *
 * ⚠️ ANTES DE DEFINIR A VARIÁVEL, LEIA ───────────────────────────────────────
 * O pixel não é analytics interno: ele COMPARTILHA dados de navegação com um
 * terceiro, para uso publicitário do terceiro. Sob a LGPD isso é a hipótese que
 * mais claramente pede consentimento — e o projeto NÃO tem banner de cookies
 * hoje (o GA4 carrega direto, com anonymize_ip, o que é outra conversa).
 *
 * Ligar isto exige, nesta ordem:
 *   1. Parecer via /shareo-juridico sobre base legal e necessidade de banner;
 *   2. Se necessário, mecanismo de consentimento que condicione o carregamento;
 *   3. Menção explícita ao pixel em /privacidade.
 *
 * Definir a variável sem esses três passos transforma uma decisão de compliance
 * numa configuração de painel — que é exatamente como esse tipo de problema
 * costuma acontecer sem ninguém decidir nada.
 */

import Script from "next/script"

const PIXEL_ID = process.env.NEXT_PUBLIC_META_PIXEL_ID

export function MetaPixel({ nonce }: { nonce?: string }) {
  if (!PIXEL_ID) return null

  return (
    <>
      <Script id="meta-pixel" strategy="afterInteractive" nonce={nonce}>
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window,document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${PIXEL_ID}');
          fbq('track', 'PageView');
        `}
      </Script>

      {/*
        Sem <noscript><img></noscript>: o fallback do Meta dispara ANTES de
        qualquer decisão de consentimento e não é cancelável por JS. Se o pixel
        vier a ser condicionado a consentimento, essa tag furaria a condição.
        A perda é a fração de visitas sem JS, que numa campanha paga é ruído.
      */}
    </>
  )
}

/**
 * Evento de conversão do pixel. Espelha o `trackEvent` do GA4 e é no-op quando
 * o pixel não está carregado — chamar sem o pixel ligado não quebra nada.
 */
export function trackPixelEvent(name: "Lead" | "CompleteRegistration", params?: Record<string, string | number | boolean>) {
  if (typeof window === "undefined" || !("fbq" in window)) return
  // @ts-expect-error fbq é injetado globalmente pelo script acima
  window.fbq("track", name, params)
}
