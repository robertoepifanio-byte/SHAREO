"use client"

import { useRef, useState } from "react"

type Status = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED"

interface Props {
  status:           Status
  rejectionReason?: string | null
}

const STATUS_INFO: Record<Status, { label: string; color: string; icon: string }> = {
  UNVERIFIED: { label: "Não verificado",        color: "text-muted-foreground", icon: "○" },
  PENDING:    { label: "Em análise",            color: "text-amber-600",        icon: "⏳" },
  VERIFIED:   { label: "Identidade verificada", color: "text-success",          icon: "✓" },
  REJECTED:   { label: "Recusado",              color: "text-destructive",      icon: "✗" },
}

export function IdVerification({ status: initialStatus, rejectionReason }: Props) {
  const [status,  setStatus]  = useState<Status>(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)
  const [open,    setOpen]    = useState(false)

  const docRef    = useRef<HTMLInputElement>(null)
  const selfieRef = useRef<HTMLInputElement>(null)

  const info = STATUS_INFO[status]

  async function compressImage(file: File, maxSizeMB = 4): Promise<Blob> {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => {
        URL.revokeObjectURL(url)
        const canvas = document.createElement("canvas")
        const MAX_PX = 1920
        let { width, height } = img
        if (width > MAX_PX || height > MAX_PX) {
          if (width > height) { height = Math.round(height * MAX_PX / width); width = MAX_PX }
          else                { width  = Math.round(width  * MAX_PX / height); height = MAX_PX }
        }
        canvas.width = width; canvas.height = height
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height)

        let quality = 0.85
        const tryCompress = () => {
          canvas.toBlob((blob) => {
            if (!blob) { reject(new Error("Falha ao compactar imagem")); return }
            if (blob.size <= maxSizeMB * 1024 * 1024 || quality <= 0.3) { resolve(blob); return }
            quality -= 0.1
            tryCompress()
          }, "image/jpeg", quality)
        }
        tryCompress()
      }
      img.onerror = () => reject(new Error("Imagem inválida"))
      img.src = url
    })
  }

  async function submit() {
    const doc    = docRef.current?.files?.[0]
    const selfie = selfieRef.current?.files?.[0]
    if (!doc || !selfie) { setError("Selecione o documento e a selfie."); return }

    setLoading(true); setError("")
    try {
      const [docBlob, selfieBlob] = await Promise.all([
        compressImage(doc),
        compressImage(selfie),
      ])
      const fd = new FormData()
      fd.append("document", docBlob, "document.jpg")
      fd.append("selfie",   selfieBlob, "selfie.jpg")

      const res  = await fetch("/api/users/me/id-verification", { method: "POST", body: fd })
      const json = await res.json()

      if (!res.ok) { setError(json.error?.message ?? "Erro ao enviar documentos."); return }
      setStatus("PENDING"); setSuccess(true); setOpen(false)
    } catch {
      setError("Não foi possível processar as imagens. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-foreground">Verificação de identidade</p>
          <p className={`text-xs font-semibold ${info.color}`}>
            {info.icon} {info.label}
          </p>
          {status === "REJECTED" && rejectionReason && (
            <p className="mt-0.5 text-xs text-destructive">{rejectionReason}</p>
          )}
        </div>

        {(status === "UNVERIFIED" || status === "REJECTED") && (
          <button
            onClick={() => setOpen(true)}
            className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-xs font-semibold text-foreground hover:bg-background transition-colors"
          >
            {status === "REJECTED" ? "Reenviar" : "Verificar"}
          </button>
        )}
        {status === "VERIFIED" && (
          <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
            ✓ Verificado
          </span>
        )}
      </div>

      {success && (
        <p className="mt-1 text-xs text-success">
          ✓ Documentos enviados! Nossa equipe analisará em até 24 horas.
        </p>
      )}

      {/* Modal de envio */}
      {open && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-surface shadow-2xl">
            <div className="border-b border-border px-6 py-4">
              <h2 className="text-lg font-bold text-primary">Verificar identidade</h2>
              <p className="text-xs text-muted-foreground">
                Seus documentos são armazenados com segurança e usados apenas para verificação.
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              <div>
                <label htmlFor="id-doc" className="mb-1.5 block text-sm font-medium text-foreground">
                  Documento com foto (CNH, RG ou Passaporte)
                </label>
                <input
                  id="id-doc"
                  ref={docRef}
                  type="file"
                  accept="image/*"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand"
                />
              </div>

              <div>
                <label htmlFor="id-selfie" className="mb-1.5 block text-sm font-medium text-foreground">
                  Selfie segurando o documento
                </label>
                <input
                  id="id-selfie"
                  ref={selfieRef}
                  type="file"
                  accept="image/*"
                  className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground file:mr-3 file:rounded file:border-0 file:bg-brand/10 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand"
                />
              </div>

              <p className="text-xs text-muted-foreground">
                🔒 Seus dados são protegidos pela LGPD e nunca compartilhados com terceiros.
                A análise é feita pela equipe ShareO em até 24 horas.
              </p>

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={loading}
                className="flex-1 rounded-lg bg-brand px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
              >
                {loading ? "Comprimindo e enviando…" : "Enviar documentos"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
