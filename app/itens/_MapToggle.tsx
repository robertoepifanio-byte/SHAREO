"use client"

import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { useCallback, type ReactNode } from "react"

interface Props {
  mapContent:  ReactNode
  listContent: ReactNode
  initialView: "map" | "list"
}

export function MapToggle({ mapContent, listContent, initialView }: Props) {
  const showMap   = initialView === "map"
  const router    = useRouter()
  const pathname  = usePathname()
  const params    = useSearchParams()

  const toggle = useCallback(() => {
    const next = new URLSearchParams(params.toString())
    if (showMap) {
      next.delete("view")
    } else {
      next.set("view", "map")
    }
    router.replace(`${pathname}?${next.toString()}`, { scroll: false })
  }, [showMap, router, pathname, params])

  return (
    <>
      <div className="mb-4 flex justify-end">
        <button
          type="button"
          onClick={toggle}
          aria-pressed={showMap}
          className="inline-flex h-11 min-w-[44px] items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-semibold text-foreground hover:border-brand/40 hover:bg-brand/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
        >
          {showMap ? (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
                <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
              </svg>
              Ver em lista
            </>
          ) : (
            <>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
              Ver no mapa
            </>
          )}
        </button>
      </div>

      {showMap ? (
        <div className="overflow-hidden rounded-xl border border-border">
          {mapContent}
        </div>
      ) : (
        listContent
      )}
    </>
  )
}
