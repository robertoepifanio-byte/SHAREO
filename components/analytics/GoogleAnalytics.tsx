/**
 * P3-82 — Google Analytics 4 para instrumentação de KPIs.
 *
 * KPIs monitorados:
 *   - Pageviews e bounce rate (automático pelo GA4)
 *   - item_view: CTR de cards → detalhe
 *   - booking_started: conversão busca → checkout
 *   - booking_completed: reserva confirmada
 *   - review_submitted: avaliação enviada
 */

import Script from "next/script"

const GA_ID = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

export function GoogleAnalytics({ nonce }: { nonce?: string }) {
  if (!GA_ID) return null

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
        strategy="afterInteractive"
        nonce={nonce}
      />
      <Script id="ga4-init" strategy="afterInteractive" nonce={nonce}>
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${GA_ID}', {
            page_path: window.location.pathname,
            anonymize_ip: true,
            cookie_flags: 'SameSite=None;Secure'
          });
        `}
      </Script>
    </>
  )
}

// Helper tipado para eventos customizados
export type GA4Event =
  | { name: "item_view";          params: { item_id: string; item_name: string; category: string } }
  | { name: "booking_started";    params: { item_id: string; price: number } }
  | { name: "booking_completed";  params: { booking_id: string; value: number } }
  | { name: "review_submitted";   params: { review_type: string; rating: number } }
  | { name: "search";             params: { search_term: string; results_count: number } }
  | { name: "favorite_added";     params: { item_id: string } }

export function trackEvent(event: GA4Event) {
  if (typeof window === "undefined" || !("gtag" in window)) return
  // @ts-expect-error gtag is injected globally
  window.gtag("event", event.name, event.params)
}
