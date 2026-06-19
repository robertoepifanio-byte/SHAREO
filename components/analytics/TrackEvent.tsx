"use client"

import { useEffect, useRef } from "react"
import { trackEvent, type GA4Event } from "./GoogleAnalytics"

/**
 * Client leaf que dispara um evento GA4 uma única vez no mount.
 * Uso em Server Components: <TrackEvent event={{ name: "item_view", params: {...} }} />
 */
export function TrackEvent({ event }: { event: GA4Event }) {
  const fired = useRef(false)

  useEffect(() => {
    if (fired.current) return
    fired.current = true
    trackEvent(event)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
