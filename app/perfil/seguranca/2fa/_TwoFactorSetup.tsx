"use client"

import { useState, type FormEvent } from "react"
/* eslint-disable @next/next/no-img-element -- o QR é um data URL gerado no servidor, next/image não se aplica */
import { signOut } from "next-auth/react"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { copyToClipboard } from "@/lib/copy-to-clipboard"

export function TwoFactorSetup() {
  const [password, setPassword] = useState("")
  const [code,     setCode]     = useState("")
  const [qr,       setQr]       = useState("")
  const [secret,   setSecret]   = useState("")
  const [codes,    setCodes]    = useState<string[]>([])
  const [saved,    setSaved]    = useState(false)
  const [copied,   setCopied]   = useState(false)
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState("")

  // A etapa é derivada do que já existe: sem QR = senha; com QR = escanear; com códigos = guardar.
  const step = codes.length ? "codes" : qr ? "scan" : "password"

  async function post(url: string, body: object) {
    setError(""); setLoading(true)
    try {
      const res  = await fetch(url, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify(body),
      })
      const json = await res.json().catch(() => null)
      if (!res.ok) {
        setError(json?.error?.message ?? "Não foi possível concluir. Tente novamente.")
        return null
      }
      return json?.data ?? null
    } catch {
      setError("Erro de conexão. Tente novamente.")
      return null
    } finally {
      setLoading(false)
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault()
    const data = await post("/api/auth/2fa/setup", { password })
    if (!data) return
    setQr(data.qr); setSecret(data.secret); setPassword("")
  }

  async function handleEnable(e: FormEvent) {
    e.preventDefault()
    const data = await post("/api/auth/2fa/enable", { code })
    if (!data) return
    setCodes(data.recoveryCodes)
  }

  async function copy() {
    setCopied(await copyToClipboard(codes.join("\n")))
  }

  function download() {
    const blob = new Blob(
      [`ShareO — códigos de recuperação do 2FA\nCada código vale uma vez.\n\n${codes.join("\n")}\n`],
      { type: "text/plain" },
    )
    const a = document.createElement("a")
    a.href = URL.createObjectURL(blob)
    a.download = "shareo-codigos-de-recuperacao.txt"
    a.click()
    URL.revokeObjectURL(a.href)
  }

  if (step === "password") {
    return (
      <form onSubmit={handlePassword} className="rounded-xl border border-border bg-surface p-5 space-y-3">
        <h2 className="font-semibold text-foreground">1. Confirme a sua senha</h2>
        <p className="text-xs text-muted-foreground">
          Você vai precisar de um aplicativo autenticador no celular (Google Authenticator, Authy, 1Password, Microsoft Authenticator).
        </p>
        <Input
          label="Senha" type="password" autoComplete="current-password" required
          value={password} onChange={(e) => setPassword(e.target.value)}
          error={error || undefined} disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={!password}>Continuar</Button>
      </form>
    )
  }

  if (step === "scan") {
    return (
      <form onSubmit={handleEnable} className="rounded-xl border border-border bg-surface p-5 space-y-4">
        <h2 className="font-semibold text-foreground">2. Escaneie e confirme</h2>
        <p className="text-xs text-muted-foreground">
          No aplicativo, adicione uma conta escaneando o QR code. Depois digite o código de 6 dígitos que ele mostrar.
        </p>
        <div className="flex justify-center rounded-lg bg-white p-3">
          <img src={qr} alt="QR code para o aplicativo autenticador" width={224} height={224} />
        </div>
        <details className="text-xs text-muted-foreground">
          <summary className="cursor-pointer">Não consigo escanear</summary>
          <p className="mt-2">Digite esta chave no aplicativo (tipo: baseado em tempo):</p>
          <code className="mt-1 block break-all rounded bg-background px-2 py-1.5 font-mono text-sm text-foreground">{secret}</code>
        </details>
        <Input
          label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={7} required
          className="tracking-widest" value={code} onChange={(e) => setCode(e.target.value)}
          error={error || undefined} disabled={loading}
        />
        <Button type="submit" loading={loading} disabled={code.replace(/\s/g, "").length !== 6}>Ativar 2FA</Button>
      </form>
    )
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-5 space-y-4">
      <h2 className="font-semibold text-foreground">3. Guarde os códigos de recuperação</h2>
      <p className="text-sm text-success font-medium">2FA ativado.</p>
      <p className="text-xs text-muted-foreground">
        Se você perder o celular, cada código abaixo entra <strong>uma vez</strong> no lugar do código do aplicativo.
        Eles não aparecem de novo. Guarde num lugar seguro, fora do celular.
      </p>
      <ul className="grid grid-cols-2 gap-2 rounded-lg bg-background p-3 font-mono text-sm text-foreground">
        {codes.map((c) => <li key={c}>{c}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="secondary" onClick={copy}>{copied ? "Copiado" : "Copiar"}</Button>
        <Button type="button" variant="secondary" onClick={download}>Baixar .txt</Button>
      </div>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} className="mt-1 h-4 w-4" />
        Guardei os códigos em um lugar seguro.
      </label>
      <Button type="button" disabled={!saved} onClick={() => signOut({ callbackUrl: "/login?msg=2fa-ativado" })}>
        Entrar de novo com o código
      </Button>
    </div>
  )
}
