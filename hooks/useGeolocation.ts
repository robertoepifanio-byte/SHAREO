"use client"

import { useCallback, useState } from "react"

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

export function useGeolocation() {
  const [state, setState] = useState<GeoState>({ lat: null, lng: null, error: null, loading: false })

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState(s => ({ ...s, error: "Geolocalização não suportada" }))
      return
    }
    setState(s => ({ ...s, loading: true, error: null }))
    navigator.geolocation.getCurrentPosition(
      pos => setState({ lat: pos.coords.latitude, lng: pos.coords.longitude, error: null, loading: false }),
      err => setState(s => ({ ...s, error: err.message, loading: false })),
    )
  }, [])

  return { ...state, request }
}
