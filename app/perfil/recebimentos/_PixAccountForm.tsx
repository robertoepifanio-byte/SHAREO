"use client"

import { useState } from "react"
import { pixKeyLabel, pixKeyPlaceholder } from "@/lib/validations/payment-account"

type PixKeyType = "CPF" | "CNPJ" | "EMAIL" | "PHONE" | "RANDOM"
type PixAccountStatus = "PENDING_VERIFICATION" | "VERIFIED" | "REJECTED"

interface ExistingAccount {
  id: string
  pixKeyType: PixKeyType
  pixKey: string
  holderName: string
  bankName: string | null
  status: PixAccountStatus
}

interface Props {
  existing: ExistingAccount | null
}

const KEY_TYPES: { value: PixKeyType; label: string }[] = [
  { value: "CPF",    label: "CPF" },
  { value: "CNPJ",   label: "CNPJ" },
  { value: "EMAIL",  label: "E-mail" },
  { value: "PHONE",  label: "Telefone (+55...)" },
  { value: "RANDOM", label: "Chave aleatória" },
]

const STATUS_INFO: Record<PixAccountStatus, { label: string; color: string }> = {
  PENDING_VERIFICATION: { label: "Aguardando verificação", color: "text-yellow-600 bg-yellow-50 border-yellow-200" },
  VERIFIED:             { label: "Verificada",             color: "text-green-700 bg-green-50 border-green-200" },
  REJECTED:             { label: "Rejeitada — edite e reenvie", color: "text-red-600 bg-red-50 border-red-200" },
}

export function PixAccountForm({ existing }: Props) {
  const [keyType,    setKeyType]    = useState<PixKeyType>(existing?.pixKeyType ?? "CPF")
  const [pixKey,     setPixKey]     = useState(existing?.pixKey ?? "")
  const [holderName, setHolderName] = useState(existing?.holderName ?? "")
  const [bankName,   setBankName]   = useState(existing?.bankName ?? "")
  const [saving,     setSaving]     = useState(false)
  const [error,      setError]      = useState<string | null>(null)
  const [success,    setSuccess]    = useState(false)
  const [status,     setStatus]     = useState<PixAccountStatus | null>(existing?.status ?? null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const res = await fetch("/api/user/payment-account", {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ pixKeyType: keyType, pixKey: pixKey.trim(), holderName: holderName.trim(), bankName: bankName.trim() || undefined }),
      })

      const data = await res.json() as { error?: string; account?: { status: PixAccountStatus } }

      if (!res.ok) {
        setError(data.error ?? "Erro ao salvar. Tente novamente.")
        return
      }

      setStatus(data.account?.status ?? "PENDING_VERIFICATION")
      setSuccess(true)
    } catch {
      setError("Erro de conexão. Tente novamente.")
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      {/* Status atual */}
      {status && (
        <div className={`rounded-lg border px-4 py-3 text-sm font-medium ${STATUS_INFO[status].color}`}>
          {STATUS_INFO[status].label}
        </div>
      )}

      {/* Aviso MVP */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-700">
        No MVP, a verificação é feita manualmente pela equipe ShareO em até 1 dia útil.
        Você só receberá repasses após a chave ser verificada.
      </div>

      {/* Tipo de chave */}
      <fieldset className="space-y-1.5">
        <legend className="block text-sm font-semibold text-foreground">
          Tipo de chave PIX
        </legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {KEY_TYPES.map((kt) => (
            <button
              key={kt.value}
              type="button"
              onClick={() => { setKeyType(kt.value); setPixKey("") }}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                keyType === kt.value
                  ? "border-brand bg-brand/10 text-brand"
                  : "border-border bg-surface text-foreground hover:bg-background"
              }`}
            >
              {kt.label}
            </button>
          ))}
        </div>
      </fieldset>

      {/* Chave PIX */}
      <div className="space-y-1.5">
        <label htmlFor="pixKey" className="block text-sm font-semibold text-foreground">
          {pixKeyLabel(keyType)}
        </label>
        <input
          id="pixKey"
          type="text"
          value={pixKey}
          onChange={(e) => setPixKey(e.target.value)}
          placeholder={pixKeyPlaceholder(keyType)}
          required
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Nome do titular */}
      <div className="space-y-1.5">
        <label htmlFor="holderName" className="block text-sm font-semibold text-foreground">
          Nome do titular da conta
        </label>
        <input
          id="holderName"
          type="text"
          value={holderName}
          onChange={(e) => setHolderName(e.target.value)}
          placeholder="Nome exatamente como na conta bancária"
          required
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Banco (opcional) */}
      <div className="space-y-1.5">
        <label htmlFor="bankName" className="block text-sm font-semibold text-foreground">
          Banco <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <input
          id="bankName"
          type="text"
          value={bankName}
          onChange={(e) => setBankName(e.target.value)}
          placeholder="Ex: Nubank, Itaú, Bradesco..."
          className="w-full rounded-lg border border-border bg-surface px-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
        />
      </div>

      {/* Erro */}
      {error && (
        <p className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {/* Sucesso */}
      {success && (
        <p className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
          Chave salva! Aguardando verificação pela equipe ShareO.
        </p>
      )}

      <button
        type="submit"
        disabled={saving}
        className="h-11 w-full rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {saving ? "Salvando..." : existing ? "Atualizar chave PIX" : "Cadastrar chave PIX"}
      </button>
    </form>
  )
}
