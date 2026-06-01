"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const

interface UserData {
  name:         string
  bio:          string | null
  phone:        string | null
  city:         string | null
  state:        string | null
  neighborhood: string | null
  avatarUrl:    string | null
}

export function ProfileForm({ user }: { user: UserData }) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [editing,  setEditing]  = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")
  const [success,  setSuccess]  = useState(false)

  const [name,         setName]         = useState(user.name)
  const [bio,          setBio]          = useState(user.bio          ?? "")
  const [phone,        setPhone]        = useState(user.phone        ?? "")
  const [city,         setCity]         = useState(user.city         ?? "")
  const [state,        setState]        = useState(user.state        ?? "")
  const [neighborhood, setNeighborhood] = useState(user.neighborhood ?? "")
  const [avatarUrl,    setAvatarUrl]    = useState(user.avatarUrl    ?? "")

  function cancel() {
    setName(user.name); setBio(user.bio ?? ""); setPhone(user.phone ?? "")
    setCity(user.city ?? ""); setState(user.state ?? "")
    setNeighborhood(user.neighborhood ?? ""); setAvatarUrl(user.avatarUrl ?? "")
    setEditing(false); setError("")
  }

  async function save(e: React.FormEvent) {
    e.preventDefault()
    setError(""); setLoading(true)
    try {
      const res  = await fetch("/api/users/me", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({
          name:         name.trim()         || undefined,
          bio:          bio.trim()          || null,
          phone:        phone.trim()        || null,
          city:         city.trim()         || undefined,
          state:        state               || null,
          neighborhood: neighborhood.trim() || null,
          avatarUrl:    avatarUrl.trim()    || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) {
        const firstDetail = json.error?.details
          ? Object.values(json.error.details as Record<string, string[]>)[0]?.[0]
          : undefined
        setError(firstDetail ?? json.error?.message ?? "Erro ao salvar.")
        return
      }
      setSuccess(true)
      setEditing(false)
      startTransition(() => router.refresh())
    } finally {
      setLoading(false)
    }
  }

  const inputCls =
    "w-full rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-brand transition-colors placeholder:text-muted-foreground"

  if (!editing) {
    return (
      <div className="flex flex-col gap-2">
        {success && (
          <p className="rounded-lg bg-success/10 px-4 py-2 text-sm font-semibold text-success">
            Perfil atualizado com sucesso!
          </p>
        )}
        <button
          onClick={() => { setSuccess(false); setEditing(true) }}
          className="self-start rounded-lg border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
        >
          Editar perfil
        </button>
      </div>
    )
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

        <div>
          <label htmlFor="profile-phone" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Telefone <span className="font-normal normal-case">(ex: +5584999999999)</span>
          </label>
          <input
            id="profile-phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+5584999999999"
            maxLength={14}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="profile-city" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Cidade
          </label>
          <input
            id="profile-city"
            type="text"
            value={city}
            onChange={(e) => setCity(e.target.value)}
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div>
          <label htmlFor="profile-state" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Estado
          </label>
          <select
            id="profile-state"
            value={state}
            onChange={(e) => setState(e.target.value)}
            className={inputCls}
          >
            <option value="">Selecione</option>
            {BR_STATES.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="profile-neighborhood" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Bairro
          </label>
          <input
            id="profile-neighborhood"
            type="text"
            placeholder="Ex: Ponta Negra"
            value={neighborhood}
            onChange={(e) => setNeighborhood(e.target.value)}
            maxLength={100}
            className={inputCls}
          />
        </div>

        <div className="sm:col-span-2">
          <label htmlFor="profile-avatar" className="mb-1 block text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            URL do avatar <span className="font-normal normal-case">(opcional)</span>
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

      {error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="rounded-lg bg-brand px-5 py-2 text-sm font-semibold text-white hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Salvando…" : "Salvar alterações"}
        </button>
        <button
          type="button"
          onClick={cancel}
          className="rounded-lg border border-border px-5 py-2 text-sm font-semibold text-foreground hover:bg-background transition-colors"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
