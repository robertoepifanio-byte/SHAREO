"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

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
  const [phone,     setPhone]     = useState(user.phone     ?? "")
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl ?? "")

  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState("")
  const [success, setSuccess] = useState(false)

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
          // Normaliza para o formato da API (+55DDDNÚMERO): aceita espaços e omissão do +
          phone:     phone.replace(/\D/g, "") ? `+${phone.replace(/\D/g, "")}` : null,
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
            Telefone <span className="font-normal normal-case">(ex: 55 99 999999999)</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="55 99 999999999"
            maxLength={18}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="profile-avatar" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            URL do avatar <span className="font-normal normal-case text-muted-foreground">(opcional)</span>
          </label>
          <input
            id="profile-avatar"
            type="url"
            value={avatarUrl}
            onChange={(e) => setAvatarUrl(e.target.value)}
            placeholder="https://…"
            maxLength={500}
            className={inputCls}
          />
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
