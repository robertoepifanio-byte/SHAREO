"use client"

import { useRef, useState, useCallback, type ReactNode, type TouchEvent } from "react"
import { useRouter } from "next/navigation"

interface Props {
  children: ReactNode
  /** Distância de arrasto em px para acionar o refresh (padrão: 80) */
  threshold?: number
}

/**
 * P2-53 — Pull-to-refresh sem dependências externas.
 * Detecta o gesto de arrasto para baixo no topo da página e chama
 * router.refresh() ao atingir o threshold.
 * Exibe um spinner SVG durante o pull e enquanto o refresh está ocorrendo.
 */
export function PullToRefresh({ children, threshold = 80 }: Props) {
  const router     = useRouter()
  const startYRef  = useRef<number | null>(null)
  const [pullY,    setPullY]    = useState(0)       // px de arrasto atual (0–threshold)
  const [refreshing, setRefreshing] = useState(false)

  const isAtTop = () => window.scrollY === 0

  const onTouchStart = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (!isAtTop()) return
    startYRef.current = e.touches[0].clientY
  }, [])

  const onTouchMove = useCallback((e: TouchEvent<HTMLDivElement>) => {
    if (startYRef.current === null || !isAtTop()) return
    const delta = e.touches[0].clientY - startYRef.current
    if (delta < 0) { startYRef.current = null; return }
    // Aplica resistência: quanto mais arrasta, mais pesado fica
    setPullY(Math.min(delta * 0.45, threshold))
  }, [threshold])

  const onTouchEnd = useCallback(() => {
    if (startYRef.current === null) return
    startYRef.current = null

    if (pullY >= threshold) {
      setRefreshing(true)
      // router.refresh() é assíncrono mas não retorna Promise — aguarda 1 ciclo de UI
      router.refresh()
      setTimeout(() => {
        setRefreshing(false)
        setPullY(0)
      }, 1200)
    } else {
      setPullY(0)
    }
  }, [pullY, threshold, router])

  const spinnerVisible = pullY > 0 || refreshing
  // Progresso 0–1 para opacidade/escala do ícone
  const progress = Math.min(pullY / threshold, 1)

  return (
    <div
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      style={{ overscrollBehaviorY: "contain" }}
    >
      {/* Indicador visual de pull */}
      <div
        aria-live="polite"
        aria-label={refreshing ? "Atualizando…" : undefined}
        style={{
          height:           spinnerVisible ? `${Math.max(pullY, refreshing ? 48 : 0)}px` : "0px",
          overflow:         "hidden",
          transition:       pullY === 0 ? "height 0.25s ease" : "none",
          display:          "flex",
          alignItems:       "center",
          justifyContent:   "center",
        }}
      >
        {spinnerVisible && (
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            className="text-brand"
            style={{
              opacity:   refreshing ? 1 : progress,
              transform: refreshing
                ? "none"
                : `rotate(${progress * 360}deg) scale(${0.5 + progress * 0.5})`,
              animation: refreshing ? "spin 0.8s linear infinite" : undefined,
            }}
            aria-hidden="true"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        )}
      </div>

      {children}

      {/* Keyframe de spin — injetado inline para evitar dependência de CSS global */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
