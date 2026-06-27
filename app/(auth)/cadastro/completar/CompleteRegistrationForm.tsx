"use client"

import { useState, useRef, type FormEvent, type ChangeEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { LoadingSpinner } from "@/components/shared/LoadingSpinner"
import { maskCPF, maskCNPJ, maskCEP, maskPhone } from "@/lib/forms/masks"
import { fetchAddressByCep } from "@/lib/forms/address"
import { DPO_EMAIL, PJ_DECLARATION_TEXT } from "@/lib/legal-config"

type UserType = "PF" | "PJ"

interface Initial {
  userType:     UserType
  phone:        string
  cep:          string
  street:       string
  neighborhood: string
  city:         string
  state:        string
}

interface FormErrors {
  cpf?:              string
  cnpj?:             string
  cpfResponsavel?:   string
  responsavelLegal?: string
  declaracaoVinculoPJ?: string
  phone?:            string
  city?:             string
  state?:            string
  form?:             string
}

function initialPhoneMask(stored: string): string {
  // stored em E.164 "+55DDNNNNNNNNN" → exibe mascarado
  const digits = stored.replace(/^\+55/, "").replace(/\D/g, "")
  return digits ? maskPhone(digits) : ""
}

export function CompleteRegistrationForm({
  callbackUrl,
  initial,
}: {
  callbackUrl: string
  initial: Initial
}) {
  const router = useRouter()

  const [userType,     setUserType]     = useState<UserType>(initial.userType)
  const [cpf,          setCpf]          = useState("")
  const [cnpj,         setCnpj]         = useState("")
  const [cpfResponsavel,   setCpfResponsavel]   = useState("")
  const [responsavelLegal, setResponsavelLegal] = useState("")
  const [declaracaoPJ,     setDeclaracaoPJ]     = useState(false)
  const [phone,        setPhone]        = useState(initialPhoneMask(initial.phone))
  const [zipCode,      setZipCode]      = useState(initial.cep ? maskCEP(initial.cep) : "")
  const [zipLoading,   setZipLoading]   = useState(false)
  const [zipError,     setZipError]     = useState("")
  const [zipFilled,    setZipFilled]    = useState(false)
  const lastFetchedCep = useRef("")
  const [street,       setStreet]       = useState(initial.street)
  const [neighborhood, setNeighborhood] = useState(initial.neighborhood)
  const [city,         setCity]         = useState(initial.city)
  const [state,        setState]        = useState(initial.state)
  const [errors,       setErrors]       = useState<FormErrors>({})
  const [loading,      setLoading]      = useState(false)

  async function handleCepBlur() {
    const digits = zipCode.replace(/\D/g, "")
    if (digits.length !== 8 || digits === lastFetchedCep.current) return
    setZipLoading(true)
    setZipError("")
    setZipFilled(false)
    try {
      const addr = await fetchAddressByCep(digits)
      if (!addr) { setZipError("CEP não encontrado."); return }
      lastFetchedCep.current = digits
      if (addr.street)       setStreet(addr.street)
      if (addr.neighborhood) setNeighborhood(addr.neighborhood)
      if (addr.city)         setCity(addr.city)
      if (addr.state)        setState(addr.state)
      setZipFilled(true)
      setErrors((p) => ({ ...p, city: undefined, state: undefined }))
    } catch {
      setZipError("Erro ao consultar o CEP. Verifique sua conexão.")
    } finally {
      setZipLoading(false)
    }
  }

  function handleCPF(e: ChangeEvent<HTMLInputElement>) {
    setCpf(maskCPF(e.target.value))
    setErrors((p) => ({ ...p, cpf: undefined }))
  }
  function handleCNPJ(e: ChangeEvent<HTMLInputElement>) {
    setCnpj(maskCNPJ(e.target.value))
    setErrors((p) => ({ ...p, cnpj: undefined }))
  }
  function handlePhone(e: ChangeEvent<HTMLInputElement>) {
    setPhone(maskPhone(e.target.value))
  }

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (userType === "PF" && !cpf)  errs.cpf   = "CPF obrigatório"
    if (userType === "PJ") {
      if (!cnpj)                            errs.cnpj             = "CNPJ obrigatório"
      if (!cpfResponsavel)                  errs.cpfResponsavel   = "CPF do responsável legal obrigatório"
      if (responsavelLegal.trim().length < 3) errs.responsavelLegal = "Informe o nome do responsável legal"
      if (!declaracaoPJ)                    errs.declaracaoVinculoPJ = "É necessário aceitar a declaração."
    }
    if (!city.trim())               errs.city  = "Cidade obrigatória"
    if (state.length !== 2)         errs.state = "UF inválida (2 letras)"
    return errs
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }
    setErrors({})
    setLoading(true)

    const phoneE164 = phone ? `+55${phone.replace(/\D/g, "")}` : undefined

    const body = {
      userType,
      cpf:          userType === "PF" ? cpf : undefined,
      cnpj:         userType === "PJ" ? cnpj : undefined,
      cpfResponsavel:      userType === "PJ" ? cpfResponsavel : undefined,
      responsavelLegal:    userType === "PJ" ? responsavelLegal.trim() : undefined,
      declaracaoVinculoPJ: userType === "PJ" ? declaracaoPJ : undefined,
      phone:        phoneE164,
      city:         city.trim(),
      state:        state.trim().toUpperCase(),
      zipCode:      zipCode.replace(/\D/g, "") || undefined,
      street:       street.trim() || undefined,
      neighborhood: neighborhood.trim() || undefined,
    }

    const res = await fetch("/api/users/me/complete-registration", {
      method:  "PATCH",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    const json = await res.json().catch(() => ({}))

    if (!res.ok) {
      setLoading(false)
      const code    = json.error?.code as string
      const details = json.error?.details as Record<string, string[]> | undefined
      if (code === "VALIDATION_ERROR" && details) {
        const fieldKeys = new Set(["cpf", "cnpj", "cpfResponsavel", "responsavelLegal", "declaracaoVinculoPJ", "phone", "city", "state"])
        const mapped: FormErrors = {}
        for (const [k, msgs] of Object.entries(details)) {
          if (fieldKeys.has(k)) (mapped as Record<string, string>)[k] = msgs[0]
          else mapped.form = msgs[0]
        }
        setErrors(mapped)
        return
      }
      const MSG: Record<string, string> = {
        CPF_ALREADY_EXISTS:  "CPF já cadastrado em outra conta.",
        CNPJ_ALREADY_EXISTS: "CNPJ já cadastrado em outra conta.",
        CNPJ_INACTIVE:       "Este CNPJ não está ativo na Receita Federal.",
        CNPJ_NOT_FOUND:      "CNPJ não encontrado na Receita Federal.",
        RATE_LIMITED:        "Muitas tentativas. Aguarde um momento e tente novamente.",
      }
      setErrors({ form: MSG[code] ?? "Erro ao concluir o cadastro. Tente novamente." })
      return
    }

    // Concluído — segue para o destino que disparou a exigência (anunciar/alugar)
    router.push(callbackUrl)
    router.refresh()
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
      <h1 className="mb-1 font-display text-center text-2xl font-bold text-primary">Completar cadastro</h1>
      <p className="mb-4 text-center text-sm text-muted-foreground">
        Falta pouco! Precisamos do seu documento e endereço para você anunciar ou alugar com segurança.
      </p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errors.form && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive-hover">
            {errors.form}
          </div>
        )}

        {/* Tipo de conta */}
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Tipo de conta</p>
          <div className="grid grid-cols-2 gap-2">
            {(["PF", "PJ"] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => { setUserType(type); setErrors({}) }}
                className={[
                  "h-11 rounded-md border text-sm font-medium transition-colors outline-none",
                  "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
                  userType === type
                    ? "border-brand bg-brand/10 text-brand"
                    : "border-border bg-surface text-muted-foreground hover:border-brand/40",
                ].join(" ")}
              >
                {type === "PF" ? "Pessoa Física" : "Empresa (PJ)"}
              </button>
            ))}
          </div>
        </div>

        {/* CPF / CNPJ */}
        {userType === "PF" ? (
          <Input
            label="CPF"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="000.000.000-00"
            value={cpf}
            onChange={handleCPF}
            error={errors.cpf}
            required
            disabled={loading}
          />
        ) : (
          <Input
            label="CNPJ"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            placeholder="00.000.000/0001-00"
            value={cnpj}
            onChange={handleCNPJ}
            error={errors.cnpj}
            helper="Validamos a situação cadastral na Receita Federal."
            required
            disabled={loading}
          />
        )}

        {/* Responsável legal — exigido para PJ (KYB leve, ADR-024) */}
        {userType === "PJ" && (
          <>
            <Input
              label="CPF do responsável legal"
              type="text"
              inputMode="numeric"
              autoComplete="off"
              placeholder="000.000.000-00"
              value={cpfResponsavel}
              onChange={(e) => { setCpfResponsavel(maskCPF(e.target.value)); setErrors((p) => ({ ...p, cpfResponsavel: undefined })) }}
              error={errors.cpfResponsavel}
              required
              disabled={loading}
            />
            <Input
              label="Nome do responsável legal"
              type="text"
              autoComplete="name"
              placeholder="Nome completo de quem representa a empresa"
              value={responsavelLegal}
              onChange={(e) => { setResponsavelLegal(e.target.value); setErrors((p) => ({ ...p, responsavelLegal: undefined })) }}
              error={errors.responsavelLegal}
              required
              disabled={loading}
            />
            <label className="flex cursor-pointer items-start gap-2.5 rounded-md border border-border bg-background px-3 py-2.5">
              <input
                type="checkbox"
                checked={declaracaoPJ}
                onChange={(e) => { setDeclaracaoPJ(e.target.checked); setErrors((p) => ({ ...p, declaracaoVinculoPJ: undefined })) }}
                disabled={loading}
                className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
              />
              <span className="text-xs leading-snug text-muted-foreground">{PJ_DECLARATION_TEXT}</span>
            </label>
            {errors.declaracaoVinculoPJ && (
              <p role="alert" className="-mt-2 text-xs text-destructive">{errors.declaracaoVinculoPJ}</p>
            )}
          </>
        )}

        <Input
          label="Telefone"
          type="tel"
          autoComplete="tel"
          placeholder="(84) 99999-0000"
          value={phone}
          onChange={handlePhone}
          helper="Opcional — se preencher, inclua o DDD"
          disabled={loading}
        />

        {/* CEP com auto-fill ViaCEP */}
        <div className="flex flex-col gap-1">
          <Input
            label="CEP"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            value={zipCode}
            onChange={(e) => { setZipCode(maskCEP(e.target.value)); setZipError(""); setZipFilled(false) }}
            onBlur={handleCepBlur}
            helper={zipFilled ? "✓ Endereço preenchido automaticamente" : "Opcional — preenche o endereço automaticamente"}
            disabled={loading || zipLoading}
            suffix={zipLoading ? <LoadingSpinner size="sm" /> : undefined}
          />
          {zipError && <p role="alert" className="text-xs text-destructive">{zipError}</p>}
        </div>

        <Input
          label="Rua"
          type="text"
          autoComplete="street-address"
          placeholder="Ex: Av. Paulista, 1000"
          value={street}
          onChange={(e) => setStreet(e.target.value)}
          helper="Opcional"
          disabled={loading}
        />

        <Input
          label="Bairro"
          type="text"
          autoComplete="address-level3"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          helper="Opcional — preenchido pelo CEP quando disponível"
          disabled={loading}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Cidade"
              type="text"
              autoComplete="address-level2"
              value={city}
              onChange={(e) => { setCity(e.target.value); setErrors((p) => ({ ...p, city: undefined })) }}
              error={errors.city}
              required
              disabled={loading}
            />
          </div>
          <div>
            <Input
              label="Estado"
              type="text"
              autoComplete="address-level1"
              placeholder="UF"
              maxLength={2}
              value={state}
              onChange={(e) => { setState(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, state: undefined })) }}
              error={errors.state}
              required
              disabled={loading}
            />
          </div>
        </div>

        <p className="rounded-md bg-muted/40 px-3 py-2 text-xs leading-snug text-muted-foreground">
          Coletamos CPF/CNPJ e endereço para identificação, segurança jurídica dos contratos e
          logística de retirada/devolução — base legal: execução de contrato (LGPD art. 7º, V).
          Detalhes na{" "}
          <Link href="/privacidade" className="text-brand hover:underline" target="_blank">Política de Privacidade</Link>.
        </p>

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Concluir cadastro
        </Button>

        <p className="text-center text-xs text-muted-foreground">
          Encarregado de Dados (DPO):{" "}
          <a href={`mailto:${DPO_EMAIL}`} className="text-brand hover:underline">{DPO_EMAIL}</a>
        </p>
      </form>
    </div>
  )
}

