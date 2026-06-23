"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import Link from "next/link"
import { maskPhone, displayPhone } from "@/lib/forms/masks"

interface UserData {
  name:      string
  bio:       string | null
  phone:     string | null
  avatarUrl: string | null
}

const inputCls =
  "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"

export function ProfileForm({ user, redirectOnSave }: { user: UserData; redirectOnSave?: string }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [name,      setName]      = useState(user.name)
  const [bio,       setBio]       = useState(user.bio       ?? "")
  const [phone,     setPhone]     = useState(displayPhone(user.phone))
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "")
  const [uploading, setUploading] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

  const initials =
    name.trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "?"

  // Upload de foto de perfil: escolhe do dispositivo → /api/upload (valida tipo/
  // magic-bytes/tamanho e devolve a URL pública) → guarda em avatarUrl. A gravação
  // no banco acontece só ao "Salvar alterações", como o resto do formulário.
  async function handleAvatarFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(""); setSuccess(false); setUploading(true)
    try {
      if (!file.type.startsWith("image/")) { setError("Selecione um arquivo de imagem."); return }
      const form = new FormData()
      form.append("file", file)
      // Reusa o bucket público de imagens (não há bucket dedicado de avatares).
      form.append("bucket", "item-images")
      const res  = await fetch("/api/upload", { method: "POST", body: form })
      const json = await res.json() as { url?: string; error?: { message?: string } }
      if (!res.ok || !json.url) throw new Error(json.error?.message ?? "Falha no upload da imagem.")
      setAvatarUrl(json.url)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha no upload da imagem.")
    } finally {
      setUploading(false)
      if (fileRef.current) fileRef.current.value = "" // permite reenviar o mesmo arquivo
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setSuccess(false); setLoading(true)
    try {
      const res  = await fetch("/api/users/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:      name.trim()      || undefined,
          bio:       bio.trim()       || null,
          // Telefone digitado é local (DDD + número); a API exige E.164 com +55.
          phone:     phone.replace(/\D/g, "") ? `+55${phone.replace(/\D/g, "")}` : null,
          avatarUrl: avatarUrl.trim() || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const detail = json.error?.details
          ? Object.values(json.error.details as Record<string, string[]>)[0]?.[0]
          : undefined
        setError(detail ?? json.error?.message ?? "Erro ao salvar.")
        return
      }
      setSuccess(true)
      startTransition(() => {
        if (redirectOnSave) router.push(redirectOnSave)
        else router.refresh()
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">

        <div className="sm:col-span-2">
          <label htmlFor="profile-name" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Nome
          </label>
          <input
            id="profile-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="profile-bio" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bio <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
          </label>
          <textarea
            id="profile-bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            maxLength={500}
            placeholder="Conte um pouco sobre você…"
            className={`${inputCls} resize-none`}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="profile-phone" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Telefone <span className="font-normal normal-case">(DDD + número)</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(84) 99999-0000"
            maxLength={16}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Foto de perfil <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
          </span>
          <div className="flex items-center gap-4">
            <span className="relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full border border-border bg-background">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="Foto de perfil" width={64} height={64} className="h-full w-full object-cover" />
              ) : (
                <span className="text-lg font-semibold text-muted-foreground">{initials}</span>
              )}
            </span>
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  disabled={uploading}
                  className="inline-flex h-9 items-center rounded-lg border border-border px-3 text-sm font-semibold text-foreground hover:bg-background disabled:opacity-50 transition-colors"
                >
                  {uploading ? "Enviando…" : avatarUrl ? "Trocar foto" : "Enviar foto"}
                </button>
                {avatarUrl && !uploading && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="inline-flex h-9 items-center rounded-lg px-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Remover
                  </button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">JPG, PNG ou WEBP — escolha uma imagem do seu dispositivo.</p>
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarFile}
              className="sr-only"
              aria-hidden="true"
              tabIndex={-1}
            />
          </div>
        </div>
      </div>

      {/* Link para endereço */}
      <div className="flex items-center justify-between rounded-lg border border-border bg-background px-4 py-3">
        <div>
          <p className="text-sm font-medium text-foreground">Endereço</p>
          <p className="text-xs text-muted-foreground">Cidade, estado e bairro</p>
        </div>
        <Link
          href="/perfil/endereco"
          className="text-sm font-semibold text-brand hover:underline"
        >
          Editar →
        </Link>
      </div>

      {error   && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
      {success && <p className="rounded-lg bg-success/10 px-3 py-2 text-sm font-semibold text-success">Perfil atualizado!</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="h-11 rounded-lg bg-brand px-6 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Salvando…" : "Salvar alterações"}
        </button>
        <Link
          href="/perfil"
          className="inline-flex h-11 items-center rounded-lg border border-border px-5 text-sm font-semibold text-foreground hover:bg-background transition-colors"
        >
          Cancelar
        </Link>
      </div>
    </form>
  )
}
