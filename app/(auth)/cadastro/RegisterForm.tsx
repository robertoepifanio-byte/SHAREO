"use client"

import { useState, type FormEvent, type ChangeEvent } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"

type UserType = "PF" | "PJ"

interface FormErrors {
  name?:         string
  email?:        string
  password?:     string
  cpf?:          string
  cnpj?:         string
  phone?:        string
  city?:         string
  state?:        string
  consent?:      string
  form?:         string
}

const CONSENT_VERSION = "v1.0"

// ─── Máscaras ────────────────────────────────────────────────────────────────

function maskCPF(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  return d
    .replace(/^(\d{3})(\d)/, "$1.$2")
    .replace(/^(\d{3})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{3})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3-$4")
}

function maskCNPJ(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, "$1.$2")
    .replace(/^(\d{2})\.(\d{3})(\d)/, "$1.$2.$3")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})(\d)/, "$1.$2.$3/$4")
    .replace(/^(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})(\d)/, "$1.$2.$3/$4-$5")
}

function maskPhone(value: string): string {
  const d = value.replace(/\D/g, "").slice(0, 11)
  if (d.length <= 2)  return d
  if (d.length <= 7)  return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

// ─── Indicador de força de senha ─────────────────────────────────────────────

function PasswordHints({ password }: { password: string }) {
  const checks = [
    { label: "8 caracteres",     ok: password.length >= 8 },
    { label: "Letra maiúscula",  ok: /[A-Z]/.test(password) },
    { label: "Número",           ok: /[0-9]/.test(password) },
  ]
  if (!password) return null
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1 pt-1">
      {checks.map(({ label, ok }) => (
        <span key={label} className={`flex items-center gap-1 text-xs ${ok ? "text-success" : "text-muted-foreground"}`}>
          {ok ? (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
          ) : (
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true"><circle cx="12" cy="12" r="10"/></svg>
          )}
          {label}
        </span>
      ))}
    </div>
  )
}

// ─── Componente principal ─────────────────────────────────────────────────────

export function RegisterForm() {
  const router = useRouter()

  const [userType,     setUserType]     = useState<UserType>("PF")
  const [name,         setName]         = useState("")
  const [email,        setEmail]        = useState("")
  const [password,     setPassword]     = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [cpf,          setCpf]          = useState("")
  const [cnpj,         setCnpj]         = useState("")
  const [phone,        setPhone]        = useState("")
  const [city,         setCity]         = useState(process.env.NEXT_PUBLIC_DEFAULT_CITY ?? "")
  const [state,        setState]        = useState(process.env.NEXT_PUBLIC_DEFAULT_STATE ?? "")
  const [neighborhood, setNeighborhood] = useState("")
  const [consent,      setConsent]      = useState(false)
  const [errors,       setErrors]       = useState<FormErrors>({})
  const [loading,      setLoading]      = useState(false)
  const [success,      setSuccess]      = useState(false)

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
    if (!name.trim())                        errs.name     = "Nome obrigatório"
    if (!email.includes("@"))                errs.email    = "E-mail inválido"
    if (password.length < 8)                 errs.password = "Senha muito curta"
    if (!/[A-Z]/.test(password))             errs.password = "Precisa de letra maiúscula"
    if (!/[0-9]/.test(password))             errs.password = "Precisa de número"
    if (userType === "PF" && !cpf)           errs.cpf      = "CPF obrigatório"
    if (userType === "PJ" && !cnpj)          errs.cnpj     = "CNPJ obrigatório"
    if (!city.trim())                        errs.city     = "Cidade obrigatória"
    if (state.length !== 2)                  errs.state    = "UF inválida (ex: RN)"
    if (!consent)                            errs.consent  = "Aceite os termos para continuar"
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
      name:           name.trim(),
      email:          email.trim().toLowerCase(),
      password,
      phone:          phoneE164,
      userType,
      cpf:            userType === "PF" ? cpf : undefined,
      cnpj:           userType === "PJ" ? cnpj : undefined,
      city:           city.trim(),
      state:          state.trim().toUpperCase(),
      neighborhood:   neighborhood.trim() || undefined,
      consentVersion: CONSENT_VERSION,
    }

    const res = await fetch("/api/auth/register", {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body),
    })

    const json = await res.json()

    if (!res.ok) {
      setLoading(false)
      const code    = json.error?.code as string
      const details = json.error?.details as Record<string, string[]> | undefined

      if (code === "VALIDATION_ERROR" && details) {
        const mapped: FormErrors = {}
        for (const [k, msgs] of Object.entries(details)) {
          if (k in ({} as FormErrors)) {
            (mapped as Record<string, string>)[k] = msgs[0]
          } else {
            mapped.form = msgs[0]
          }
        }
        setErrors(mapped)
        return
      }

      const MSG: Record<string, string> = {
        EMAIL_ALREADY_EXISTS: "E-mail já cadastrado. Tente fazer login.",
        CPF_ALREADY_EXISTS:   "CPF já cadastrado.",
        CNPJ_ALREADY_EXISTS:  "CNPJ já cadastrado.",
      }
      setErrors({ form: MSG[code] ?? "Erro ao criar conta. Tente novamente." })
      return
    }

    // Conta criada — auto-login
    const loginResult = await signIn("credentials", {
      email: body.email,
      password,
      redirect: false,
    })

    setLoading(false)

    if (loginResult?.error) {
      // Conta criada mas login falhou — redireciona para login manual
      setSuccess(true)
      setTimeout(() => router.push("/login"), 2500)
      return
    }

    router.push("/dashboard")
    router.refresh()
  }

  if (success) {
    return (
      <div className="rounded-lg border border-border bg-surface p-8 shadow-card text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/10">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#007B3C" strokeWidth="2.5" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
        </div>
        <h2 className="text-xl font-bold text-primary">Conta criada!</h2>
        <p className="mt-2 text-sm text-muted-foreground">Redirecionando para o login…</p>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-border bg-surface p-8 shadow-card">
      <h1 className="mb-1 text-center text-2xl font-bold text-primary">Criar conta</h1>
      <p className="mb-6 text-center text-sm text-muted-foreground">É grátis e leva menos de 2 minutos</p>

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {errors.form && (
          <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
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

        <Input
          label="Nome completo"
          type="text"
          autoComplete="name"
          placeholder={userType === "PF" ? "Ana Souza" : "Ferramentas Nordeste Ltda"}
          value={name}
          onChange={(e) => { setName(e.target.value); setErrors((p) => ({ ...p, name: undefined })) }}
          error={errors.name}
          required
          disabled={loading}
        />

        <Input
          label="E-mail"
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => { setEmail(e.target.value); setErrors((p) => ({ ...p, email: undefined })) }}
          error={errors.email}
          required
          disabled={loading}
        />

        {/* Senha com indicador */}
        <div className="flex flex-col gap-1.5">
          <div className="relative">
            <Input
              label="Senha"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Mín. 8 caracteres"
              value={password}
              onChange={(e) => { setPassword(e.target.value); setErrors((p) => ({ ...p, password: undefined })) }}
              error={errors.password}
              required
              disabled={loading}
              suffix={
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
                  className="outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
                >
                  {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                </button>
              }
            />
          </div>
          <PasswordHints password={password} />
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
            required
            disabled={loading}
          />
        )}

        <Input
          label="Telefone"
          type="tel"
          autoComplete="tel"
          placeholder="(84) 99999-0000"
          value={phone}
          onChange={handlePhone}
          helper="Opcional — incluir DDD"
          disabled={loading}
        />

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Cidade"
              type="text"
              autoComplete="address-level2"
              placeholder="Natal"
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
              placeholder="RN"
              maxLength={2}
              value={state}
              onChange={(e) => { setState(e.target.value.toUpperCase()); setErrors((p) => ({ ...p, state: undefined })) }}
              error={errors.state}
              required
              disabled={loading}
            />
          </div>
        </div>

        <Input
          label="Bairro"
          type="text"
          autoComplete="address-level3"
          placeholder="Ponta Negra"
          value={neighborhood}
          onChange={(e) => setNeighborhood(e.target.value)}
          helper="Opcional"
          disabled={loading}
        />

        {/* Consentimento LGPD */}
        <div>
          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => { setConsent(e.target.checked); setErrors((p) => ({ ...p, consent: undefined })) }}
              disabled={loading}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-border accent-brand"
              aria-describedby={errors.consent ? "consent-error" : undefined}
            />
            <span className="text-sm text-muted-foreground">
              Li e aceito os{" "}
              <Link href="/termos" className="text-brand hover:underline" target="_blank">Termos de Uso</Link>
              {" "}e a{" "}
              <Link href="/privacidade" className="text-brand hover:underline" target="_blank">Política de Privacidade</Link>
              {" "}({CONSENT_VERSION})
            </span>
          </label>
          {errors.consent && (
            <p id="consent-error" role="alert" className="mt-1 text-xs text-destructive">
              {errors.consent}
            </p>
          )}
        </div>

        <Button type="submit" size="lg" loading={loading} className="mt-1 w-full">
          Criar conta
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Já tem conta?{" "}
        <Link
          href="/login"
          className="font-medium text-brand hover:underline outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
        >
          Entrar
        </Link>
      </p>
    </div>
  )
}

function EyeIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  )
}

function EyeOffIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  )
}
