"use client"

/**
 * P2-49 — Checklist de devolução para o locatário
 * Exibido em booking.status === "ACTIVE" quando o usuário é o borrower.
 * Requer pelo menos 3 de 4 itens marcados + upload de foto para habilitar
 * o botão "Confirmar devolução" (POST action: "mark_returned").
 */

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"

interface Props {
  bookingId: string
}

const CHECKLIST_ITEMS = [
  "Item limpo e no estado recebido",
  "Todos os acessórios incluídos",
  "Caixa/embalagem original (se aplicável)",
  "Fotos do estado atual tiradas",
] as const

const MIN_CHECKED = 3

/** Índice de "Fotos do estado atual tiradas" — derivado da foto, ver abaixo. */
const IDX_FOTO = CHECKLIST_ITEMS.indexOf("Fotos do estado atual tiradas")

export function ReturnChecklist({ bookingId }: Props) {
  const router = useRouter()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [checked, setChecked] = useState<boolean[]>(Array(CHECKLIST_ITEMS.length).fill(false))
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const photoUploadedRef = useRef(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // A foto entra na condição, e não só no texto: sem ela a API responde 422
  // RETURN_PHOTO_REQUIRED. O botão habilitado sem foto prometia algo que o
  // servidor recusa.
  const temFoto = photoFile !== null

  // 🪤 "Fotos do estado atual tiradas" é DERIVADO da foto anexada, não uma
  // pergunta. Enquanto era caixinha manual, dava nos dois erros opostos:
  //
  //  - marcar SEM foto — era um dos caminhos para fechar a devolução sem prova;
  //  - anexar a foto e a caixinha continuar vazia, faltando 1 de 3 e empurrando
  //    o locatário a marcar "Caixa/embalagem original (se aplicável)" num item
  //    que não tem caixa. A tela induzia a uma declaração falsa para liberar o
  //    botão (visto ao vivo, 23/08).
  //
  // Agora ela espelha o fato. Quem anexou, cumpriu; quem não anexou, não marca.
  const checkedComFoto = checked.map((v, i) => (i === IDX_FOTO ? temFoto : v))
  const checkedCount   = checkedComFoto.filter(Boolean).length
  const canConfirm     = checkedCount >= MIN_CHECKED && temFoto

  function toggle(index: number) {
    setChecked((prev) => {
      const next = [...prev]
      next[index] = !next[index]
      return next
    })
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    // Foto nova = upload novo; sem isto, trocar a imagem depois de uma falha
    // mandaria o mark_returned com a foto ANTIGA no bucket.
    photoUploadedRef.current = false
    setPhotoFile(file)
    const url = URL.createObjectURL(file)
    setPhotoPreview(url)
  }

  async function handleConfirm() {
    setError(null)
    setLoading(true)
    try {
      // Upload de foto — obrigatório. Vai ANTES do mark_returned porque é o
      // registro dela que faz a transição passar no guard da API.
      //
      // `photoUploadedRef` evita duplicar: se o mark_returned falhar (rede,
      // 429) e o usuário clicar de novo, a foto já está no bucket — subir outra
      // só acumularia lixo no storage.
      if (photoFile && !photoUploadedRef.current) {
        const formData = new FormData()
        formData.append("file", photoFile)
        formData.append("bookingId", bookingId)
        formData.append("phase", "CHECKOUT")

        const uploadRes = await fetch(`/api/bookings/${bookingId}/photos`, {
          method:  "POST",
          body:    formData,
        })
        if (!uploadRes.ok) {
          const json = await uploadRes.json().catch(() => ({}))
          throw new Error(json?.error?.message ?? "Erro ao enviar foto.")
        }
        photoUploadedRef.current = true
      }

      // Transição de status para RETURNED
      const res = await fetch(`/api/bookings/${bookingId}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ action: "mark_returned" }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json?.error?.message ?? "Erro ao confirmar devolução.")
      }

      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro inesperado.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <section
      className="rounded-xl border border-border bg-surface p-5"
      aria-labelledby="return-checklist-heading"
    >
      <h2
        id="return-checklist-heading"
        className="mb-1 font-semibold text-foreground"
      >
        Checklist de devolução
      </h2>
      <p className="mb-4 text-xs text-muted-foreground">
        Envie uma foto do estado do item e marque pelo menos {MIN_CHECKED} de {CHECKLIST_ITEMS.length} itens
        — a foto já conta como um deles. Depois disso, o locador confirma o recebimento para
        concluir a locação.
      </p>

      {/* Itens do checklist */}
      <fieldset className="mb-5 space-y-3" aria-required="true">
        <legend className="sr-only">Itens do checklist de devolução</legend>
        {CHECKLIST_ITEMS.map((label, i) => {
          const inputId = `return-check-${i}`
          // O item da foto não é clicável: ele relata o que já está anexado.
          const derivado = i === IDX_FOTO
          const marcado  = checkedComFoto[i]
          return (
            <label
              key={label}
              htmlFor={derivado ? undefined : inputId}
              className={[
                "flex min-h-[44px] items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5 transition-colors has-[:checked]:border-brand/40 has-[:checked]:bg-brand/5",
                derivado ? "cursor-default" : "cursor-pointer hover:bg-muted/40",
              ].join(" ")}
            >
              <input
                id={inputId}
                type="checkbox"
                checked={marcado}
                onChange={() => { if (!derivado) toggle(i) }}
                disabled={derivado}
                className={[
                  "form-checkbox h-5 w-5 flex-shrink-0 rounded accent-brand focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  derivado ? "cursor-default" : "cursor-pointer",
                ].join(" ")}
                aria-label={derivado ? `${label} — marcado automaticamente ao anexar a foto` : label}
              />
              <span className={[
                "text-sm leading-snug",
                marcado ? "text-foreground font-medium" : "text-muted-foreground",
              ].join(" ")}>
                {label}
              </span>
              {marcado && (
                <svg
                  className="ml-auto h-4 w-4 flex-shrink-0 text-brand"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                  aria-hidden="true"
                >
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
            </label>
          )
        })}
      </fieldset>

      {/* Progresso */}
      <div className="mb-5" aria-live="polite" aria-atomic="true">
        <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
          <span>{checkedCount} de {CHECKLIST_ITEMS.length} itens verificados</span>
          {canConfirm && (
            <span className="font-medium text-brand">Pronto para confirmar</span>
          )}
        </div>
        <div
          className="h-1.5 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={checkedCount}
          aria-valuemin={0}
          aria-valuemax={CHECKLIST_ITEMS.length}
          aria-label={`${checkedCount} de ${CHECKLIST_ITEMS.length} itens verificados`}
        >
          <div
            className="h-full rounded-full bg-brand transition-all duration-300"
            style={{ width: `${(checkedCount / CHECKLIST_ITEMS.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Upload de foto */}
      <div className="mb-5">
        <p className="mb-2 text-xs font-semibold text-foreground">
          Foto do estado atual
          <span className="ml-1 text-destructive">*</span>
          <span className="ml-1 font-normal text-muted-foreground">(obrigatória)</span>
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          onChange={handleFileChange}
          className="sr-only"
          id="return-photo-input"
          aria-label="Adicionar foto do estado atual do item"
        />

        {photoPreview ? (
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photoPreview}
              alt="Foto do estado atual do item"
              className="h-40 w-full rounded-lg object-cover border border-border"
            />
            <button
              type="button"
              onClick={() => { setPhotoPreview(null); setPhotoFile(null); photoUploadedRef.current = false }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-destructive text-white shadow-md hover:bg-destructive-hover transition-colors"
              aria-label="Remover foto"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
                <line x1="18" y1="6" x2="6" y2="18"/>
                <line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        ) : (
          <label
            htmlFor="return-photo-input"
            className="flex min-h-[44px] cursor-pointer flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-border bg-background py-6 text-center transition-colors hover:border-brand/40 hover:bg-brand/5"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="text-xs font-medium text-muted-foreground">
              Tirar foto ou escolher da galeria
            </span>
          </label>
        )}
      </div>

      {/* Mensagem de erro */}
      {error && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {error}
        </div>
      )}

      {/* Botão de confirmação */}
      <button
        type="button"
        onClick={handleConfirm}
        disabled={!canConfirm || loading}
        aria-disabled={!canConfirm || loading}
        className={[
          "flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg px-6 text-sm font-bold uppercase tracking-wide transition-colors",
          canConfirm && !loading
            ? "bg-brand text-white hover:bg-brand-hover focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
            : "cursor-not-allowed bg-disabled-bg text-disabled-text",
        ].join(" ")}
      >
        {loading && (
          <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
        )}
        {loading ? "Enviando…" : "Devolver"}
      </button>

      {canConfirm ? (
        <p className="mt-2 text-center text-xs text-muted-foreground" role="note">
          Ao devolver, a locação fica como <strong>Devolução em andamento</strong> até o locador confirmar o recebimento.
        </p>
      ) : (
        <p className="mt-2 text-center text-xs text-muted-foreground" role="note">
          {/* Diz QUANTOS faltam, não a regra inteira. Repetir "marque 3 itens"
              com a foto já anexada (que conta como um) mandava o locatário
              procurar no lugar errado — e foi o que o empurrou a marcar
              "Caixa/embalagem original" num item sem caixa. */}
          {!temFoto
            ? "Envie uma foto do estado do item para habilitar a devolução."
            : `Marque mais ${MIN_CHECKED - checkedCount} ${MIN_CHECKED - checkedCount === 1 ? "item" : "itens"} para habilitar a devolução.`}
        </p>
      )}
    </section>
  )
}
