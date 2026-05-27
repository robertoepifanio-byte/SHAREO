"use client"

import { useRef, useState } from "react"
import Image from "next/image"

interface Photo { id: string; url: string; phase: string; createdAt: string }

interface Props {
  bookingId:      string
  phase:          "CHECKIN" | "CHECKOUT"
  existingPhotos: Photo[]
  canUpload:      boolean   // true quando é o dono na fase correta
  label:          string    // "Retirada" | "Devolução"
}

export function CheckInOut({ bookingId, phase, existingPhotos: initial, canUpload, label }: Props) {
  const [photos,  setPhotos]  = useState<Photo[]>(initial)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const fileRef = useRef<HTMLInputElement>(null)

  async function upload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setLoading(true); setError("")
    const fd = new FormData()
    fd.append("phase", phase)
    fd.append("file",  file)

    const res  = await fetch(`/api/bookings/${bookingId}/photos`, { method: "POST", body: fd })
    const json = await res.json()
    setLoading(false)
    if (!res.ok) { setError(json.error?.message ?? "Erro ao enviar foto."); return }
    setPhotos((p) => [...p, json.data])
    if (fileRef.current) fileRef.current.value = ""
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>

      {photos.length === 0 && (
        <p className="text-xs text-muted-foreground italic">Sem fotos registradas</p>
      )}

      <div className="flex flex-wrap gap-2">
        {photos.map((p) => (
          <div key={p.id} className="relative h-20 w-20 overflow-hidden rounded-lg border border-border">
            <Image src={p.url} alt={label} fill className="object-cover" />
          </div>
        ))}

        {canUpload && (
          <label className={`flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border bg-background hover:border-brand hover:bg-brand/5 transition-colors ${loading ? "opacity-50 pointer-events-none" : ""}`}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            <span className="mt-1 text-[10px] text-muted-foreground">{loading ? "…" : "Foto"}</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="sr-only"
              onChange={upload}
              disabled={loading}
            />
          </label>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
    </div>
  )
}
