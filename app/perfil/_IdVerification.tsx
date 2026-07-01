"use client"

import { useEffect, useRef, useState } from "react"
import { BIOMETRIC_CONSENT_VERSION } from "@/lib/legal-config"
import {
  BIOMETRIC_CONSENT_TITLE,
  BIOMETRIC_CONSENT_SUBTITLE,
  BIOMETRIC_CONSENT_TEXT,
  BIOMETRIC_CONSENT_CHECKBOX,
} from "@/lib/legal/biometric-consent-text"

type Status = "UNVERIFIED" | "PENDING" | "VERIFIED" | "REJECTED"

interface Props {
  status:           Status
  rejectionReason?: string | null
  /** Exige o consentimento biométrico específico (LGPD art. 11). Default false =
   *  fluxo de KYC atual, sem passo de consentimento. Ligado só com a flag D4. */
  biometricConsentRequired?: boolean
  /** Usuário possui registro de consentimento biométrico (idSelfieConsentAt != null).
   *  Habilita o botão "Revogar consentimento biométrico" quando verificado. */
  hasBiometricConsent?: boolean
}

const STATUS_INFO: Record<Status, { label: string; color: string; icon: string }> = {
  UNVERIFIED: { label: "Não verificado",        color: "text-muted-foreground", icon: "○" },
  PENDING:    { label: "Em análise",            color: "text-booking-pending",  icon: "⏳" },
  VERIFIED:   { label: "Identidade verificada", color: "text-success",          icon: "✓" },
  REJECTED:   { label: "Recusado",              color: "text-destructive",      icon: "✗" },
}

export function IdVerification({ status: initialStatus, rejectionReason, biometricConsentRequired = false, hasBiometricConsent = false }: Props) {
  const [status,  setStatus]  = useState<Status>(initialStatus)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)
  const [open,    setOpen]    = useState(false)
  const [consent, setConsent] = useState(false)
  const [revoking, setRevoking] = useState(false)

  async function revokeBiometricConsent() {
    if (!window.confirm(
      "Isto apagará a sua selfie e revogará o consentimento biométrico. " +
      "Sua conta voltará a 'não verificada' e você precisará enviar os documentos de novo. Continuar?"
    )) return
    setRevoking(true); setError("")
    try {
      const res = await fetch("/api/users/me/biometric-consent", { method: "DELETE" })
      if (!res.ok && res.status !== 204) {
        const json = await res.json().catch(() => null)
        setError(json?.error?.message ?? "Não foi possível revogar o consentimento.")
        return
      }
      setStatus("UNVERIFIED")
    } catch {
      setError("Erro de conexão ao revogar o consentimento.")
    } finally {
      setRevoking(false)
    }
  }

  const docRef        = useRef<HTMLInputElement>(null)
  const docCamRef     = useRef<HTMLInputElement>(null)
  const selfieRef     = useRef<HTMLInputElement>(null)
  const selfieCamRef  = useRef<HTMLInputElement>(null)
  const dialogRef     = useRef<HTMLDivElement>(null)

  const [docName,    setDocName]    = useState("")
  const [selfieName, setSelfieName] = useState("")

  // A11y do modal: trava scroll do body, move o foco para o diálogo, fecha no
  // Escape e mantém o Tab preso dentro do diálogo (focus trap) enquanto aberto.
  useEffect(() => {
    if (!open) return
    const dialog = dialogRef.current
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = "hidden"
    dialog?.focus()

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") { setOpen(false); return }
      if (e.key !== "Tab" || !dialog) return
      const focusables = dialog.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      )
      if (focusables.length === 0) return
      const first = focusables[0]
      const last  = focusables[focusables.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("keydown", onKeyDown)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

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
    const doc    = docRef.current?.files?.[0] ?? docCamRef.current?.files?.[0]
    const selfie = selfieRef.current?.files?.[0] ?? selfieCamRef.current?.files?.[0]
    if (!doc || !selfie) { setError("Selecione o documento e a selfie."); return }
    if (biometricConsentRequired && !consent) {
      setError("É necessário consentir com o tratamento da selfie para prosseguir.")
      return
    }

    setLoading(true); setError("")
    try {
      const [docBlob, selfieBlob] = await Promise.all([
        compressImage(doc),
        compressImage(selfie),
      ])
      const fd = new FormData()
      fd.append("document", docBlob, "document.jpg")
      fd.append("selfie",   selfieBlob, "selfie.jpg")
      if (biometricConsentRequired) fd.append("biometricConsent", consent ? "true" : "false")

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
            className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-xs font-semibold text-foreground hover:bg-background transition-colors"
          >
            {status === "REJECTED" ? "Reenviar" : "Verificar"}
          </button>
        )}
        {status === "VERIFIED" && (
          <div className="flex flex-col items-end gap-1">
            <span className="rounded-full bg-success/10 px-2 py-0.5 text-xs font-semibold text-success">
              ✓ Verificado
            </span>
            {biometricConsentRequired && hasBiometricConsent && (
              <button
                onClick={revokeBiometricConsent}
                disabled={revoking}
                className="text-[11px] font-medium text-muted-foreground underline underline-offset-2 hover:text-destructive disabled:opacity-50 transition-colors"
              >
                {revoking ? "Revogando…" : "Revogar consentimento biométrico"}
              </button>
            )}
          </div>
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
          <div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="id-verify-title"
            tabIndex={-1}
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-surface shadow-2xl outline-none"
          >
            <div className="border-b border-border px-6 py-4">
              <h2 id="id-verify-title" className="text-lg font-bold text-primary">Verificar identidade</h2>
              <p className="text-xs text-muted-foreground">
                Seus documentos são armazenados com segurança e usados apenas para verificação.
              </p>
            </div>

            <div className="space-y-4 px-6 py-4">
              {/* Documento */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Documento com foto (CNH, RG ou Passaporte)
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => docCamRef.current?.click()}
                    className="flex-1 min-h-11 rounded-lg border border-input bg-background py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                    📷 Tirar foto
                  </button>
                  <button type="button" onClick={() => docRef.current?.click()}
                    className="flex-1 min-h-11 rounded-lg border border-input bg-background py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                    🖼️ Galeria
                  </button>
                </div>
                {docName && <p className="mt-1 text-xs text-success truncate">✓ {docName}</p>}
                <input ref={docCamRef} type="file" accept="image/*" capture="environment" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setDocName(f.name); if (docRef.current) docRef.current.value = "" } }} />
                <input ref={docRef}    type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setDocName(f.name); if (docCamRef.current) docCamRef.current.value = "" } }} />
              </div>

              {/* Selfie */}
              <div>
                <p className="mb-1.5 text-sm font-medium text-foreground">
                  Selfie segurando o documento
                </p>
                <div className="flex gap-2">
                  <button type="button" onClick={() => selfieCamRef.current?.click()}
                    className="flex-1 min-h-11 rounded-lg border border-input bg-background py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                    🤳 Tirar selfie
                  </button>
                  <button type="button" onClick={() => selfieRef.current?.click()}
                    className="flex-1 min-h-11 rounded-lg border border-input bg-background py-2.5 text-xs font-semibold text-foreground hover:bg-muted transition-colors">
                    🖼️ Galeria
                  </button>
                </div>
                {selfieName && <p className="mt-1 text-xs text-success truncate">✓ {selfieName}</p>}
                <input ref={selfieCamRef} type="file" accept="image/*" capture="user" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setSelfieName(f.name); if (selfieRef.current) selfieRef.current.value = "" } }} />
                <input ref={selfieRef}    type="file" accept="image/*" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) { setSelfieName(f.name); if (selfieCamRef.current) selfieCamRef.current.value = "" } }} />
              </div>

              <p className="text-xs text-muted-foreground">
                🔒 Seus dados são protegidos pela LGPD e nunca compartilhados com terceiros.
                A análise é feita pela equipe ShareO em até 24 horas.
              </p>

              {/* Consentimento biométrico específico (LGPD art. 11) — só aparece com a flag
                  biometricConsentRequired ligada. Separado do aceite dos Termos. */}
              {biometricConsentRequired && (
                <div className="rounded-lg border border-border bg-background p-3">
                  <p className="text-sm font-semibold text-foreground">{BIOMETRIC_CONSENT_TITLE}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{BIOMETRIC_CONSENT_SUBTITLE}</p>
                  <div className="mt-2 max-h-48 overflow-y-auto whitespace-pre-line rounded-md bg-surface p-2 text-xs leading-relaxed text-muted-foreground">
                    {BIOMETRIC_CONSENT_TEXT}
                  </div>
                  <label className="mt-3 flex items-start gap-2 text-xs text-foreground">
                    <input
                      type="checkbox"
                      checked={consent}
                      onChange={(e) => setConsent(e.target.checked)}
                      className="mt-0.5 h-4 w-4 shrink-0 rounded border-input"
                    />
                    <span>{BIOMETRIC_CONSENT_CHECKBOX}</span>
                  </label>
                  <p className="mt-2 text-right text-xs text-muted-foreground opacity-70">
                    Versão do consentimento: {BIOMETRIC_CONSENT_VERSION}
                  </p>
                </div>
              )}

              {error && <p className="text-xs text-destructive">{error}</p>}
            </div>

            <div className="flex gap-3 border-t border-border px-6 py-4">
              <button
                onClick={() => setOpen(false)}
                disabled={loading}
                className="flex-1 min-h-11 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submit}
                disabled={loading || (biometricConsentRequired && !consent)}
                className="flex-1 min-h-11 rounded-lg bg-brand px-4 py-3 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
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
