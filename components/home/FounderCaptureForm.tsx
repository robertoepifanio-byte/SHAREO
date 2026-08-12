"use client"

import { useEffect, useRef, useState, type FormEvent } from "react"
import { MARKETING_CONSENT_VERSION, MARKETING_CONSENT_TEXT } from "@/lib/legal-config"
import { maskCEP, maskPhone } from "@/lib/forms/masks"
import { fetchAddressByCep } from "@/lib/forms/address"
import { trackEvent } from "@/components/analytics/GoogleAnalytics"
import { readAttribution, type Attribution } from "@/lib/founders-attribution"

type IntentOption = "proprietario" | "locatario"
type State  = "collapsed" | "expanded" | "loading" | "success" | "error-network" | "error-duplicate"

/**
 * `idle`     — nada digitado ainda
 * `loading`  — consultando o ViaCEP
 * `ok`       — endereço resolvido (o readout mostra o que foi encontrado)
 * `notfound` — CEP bem formado mas inexistente → revela preenchimento manual
 * `error`    — ViaCEP fora do ar / sem rede → revela preenchimento manual
 */
type CepState = "idle" | "loading" | "ok" | "notfound" | "error"

function resolveIntent(selected: Set<IntentOption>): "proprietario" | "locatario" | "ambos" {
  if (selected.has("proprietario") && selected.has("locatario")) return "ambos"
  if (selected.has("locatario")) return "locatario"
  return "proprietario"
}

type Props = {
  /** Pré-preenche a cidade (ex.: landing /pilotos/[cidade]). */
  defaultCity?: string
  /** Pré-preenche a UF. */
  defaultUf?: string
  /** Campanha-padrão (ex.: "piloto-recife") — usada se a URL não trouxer utm_campaign. */
  campaign?: string
  /** Começa expandido (landings de cidade abrem o form direto). */
  startExpanded?: boolean
}

export function FounderCaptureForm({ defaultCity, defaultUf, campaign, startExpanded }: Props = {}) {
  const [state, setState]         = useState<State>(startExpanded ? "expanded" : "collapsed")
  const [selected, setSelected]   = useState<Set<IntentOption>>(new Set(["proprietario"]))
  const [name, setName]           = useState("")
  const [email, setEmail]         = useState("")
  const [phone, setPhone]         = useState("")

  // Localização. `city`/`uf` continuam sendo a fonte da verdade do envio — o CEP
  // é só o caminho rápido para preenchê-los.
  const [cepVal, setCepVal]       = useState("")
  const [cepState, setCepState]   = useState<CepState>("idle")
  const [neighborhood, setNeighborhood] = useState("")
  const [city, setCity]           = useState(defaultCity ?? "")
  const [uf, setUf]               = useState(defaultUf ?? "")
  const [showManual, setShowManual] = useState(false)

  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [position, setPosition]   = useState(0)
  const [referralCode, setReferralCode] = useState<string | null>(null)
  const [attribution, setAttribution] = useState<Attribution>({ source: "VIP_LANDING" })

  // Descarta respostas obsoletas do ViaCEP: digitar rápido "50030230" → "50030231"
  // pode resolver fora de ordem e sobrescrever o endereço certo pelo antigo.
  // (fetchAddressByCep é compartilhado com outras 2 telas e não aceita AbortSignal —
  // não vale alterar a assinatura só por isto.)
  const cepSeq = useRef(0)
  const manualRef = useRef<HTMLInputElement>(null)

  // Captura atribuição (UTM/ref) uma vez, no cliente — define o canal de origem do lead.
  useEffect(() => { setAttribution(readAttribution()) }, [])

  function toggleIntent(opt: IntentOption) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(opt)) {
        if (next.size === 1) return prev // pelo menos uma opção sempre selecionada
        next.delete(opt)
      } else {
        next.add(opt)
      }
      return next
    })
  }

  /** Revela cidade/UF/bairro manuais e leva o foco para lá. */
  function revealManual() {
    setShowManual(true)
    // rAF: o input só existe depois do próximo render.
    requestAnimationFrame(() => manualRef.current?.focus())
  }

  async function lookupCep(digits: string) {
    const seq = ++cepSeq.current
    setCepState("loading")
    try {
      const addr = await fetchAddressByCep(digits)
      if (seq !== cepSeq.current) return // chegou atrasada — ignora

      // fetchAddressByCep devolve null para CEP inexistente e LANÇA em falha de
      // rede. São dois caminhos de UX distintos, por isso o null-check e o catch.
      if (!addr) {
        setCepState("notfound")
        revealManual()
        return
      }

      if (addr.city)  setCity(addr.city)
      if (addr.state) setUf(addr.state.toUpperCase())
      setNeighborhood(addr.neighborhood ?? "")
      setCepState("ok")

      // Municípios de CEP único (ex.: 78890-000) voltam com bairro vazio no
      // ViaCEP. Nesse caso pedimos o bairro à parte — mas ele NUNCA bloqueia o
      // envio (a coluna é nullable).
      if (!addr.neighborhood) revealManual()
      else setShowManual(false)
    } catch {
      if (seq !== cepSeq.current) return
      setCepState("error")
      revealManual()
    }
  }

  // Dispara ao completar 8 dígitos, com debounce curto. O onBlur do input serve
  // de rede de segurança para quem cola o CEP e sai do campo antes do timer.
  useEffect(() => {
    const digits = cepVal.replace(/\D/g, "")
    if (digits.length !== 8) {
      if (cepState !== "idle" && digits.length < 8) setCepState("idle")
      return
    }
    const t = setTimeout(() => { void lookupCep(digits) }, 300)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cepVal])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setState("loading")
    try {
      const cepDigits = cepVal.replace(/\D/g, "")
      // O usuário digita "(84) 99999-0000"; o banco guarda E.164 ("+5584999990000"),
      // mesmo formato de User.phone. Menos de 10 dígitos = incompleto → não envia.
      const phoneDigits = phone.replace(/\D/g, "")
      const phoneE164 = phoneDigits.length >= 10 ? `+55${phoneDigits}` : undefined

      const res = await fetch("/api/founders/leads", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:            email.trim().toLowerCase(),
          name:             name.trim() || undefined,
          phone:            phoneE164,
          intent:           resolveIntent(selected),
          marketingConsent: lgpdConsent,
          consentVersion:   MARKETING_CONSENT_VERSION,
          source:           attribution.source,
          city:             city.trim(),
          state:            uf.trim().toUpperCase(),
          cep:              cepDigits.length === 8 ? cepDigits : undefined,
          neighborhood:     neighborhood.trim() || undefined,
          // Permite medir a taxa de fallback do ViaCEP em produção sem
          // instrumentação extra.
          addressSource:    cepState === "ok" ? "CEP" : "MANUAL",
          utmSource:        attribution.utmSource,
          utmMedium:        attribution.utmMedium,
          utmCampaign:      attribution.utmCampaign ?? campaign,
          utmContent:       attribution.utmContent,
          utmTerm:          attribution.utmTerm,
          referrerUrl:      attribution.referrerUrl,
          referredByCode:   attribution.ref,
        }),
      })

      // 409 = e-mail já cadastrado. A API devolve a posição na fila dentro do
      // erro; aproveitamos para dizer QUAL é, em vez de um "você já está na
      // lista" genérico que o usuário confunde com confirmação de novo cadastro.
      if (res.status === 409) {
        const dup = await res.json().catch(() => null) as
          { error?: { data?: { queuePosition?: number } } } | null
        // 0 = posição desconhecida (corpo inesperado); a UI omite o número.
        setPosition(dup?.error?.data?.queuePosition ?? 0)
        setState("error-duplicate")
        return
      }
      if (!res.ok)            { setState("error-network");   return }

      const json = await res.json() as { data: { queuePosition: number; referralCode: string | null } }
      setPosition(json.data.queuePosition)
      setReferralCode(json.data.referralCode)
      setState("success")

      // Conversão da campanha. Fica DEPOIS do sucesso confirmado: disparar no
      // clique contaria tentativa como conversão e inflaria a taxa que decide
      // onde o orçamento de mídia vai.
      //
      // Nenhum parâmetro carrega PII — nem e-mail, nem telefone, nem o CEP.
      trackEvent({
        name: "founder_lead_submit",
        params: {
          uf:           uf.trim().toUpperCase(),
          lead_source:  attribution.source,
          utm_campaign: attribution.utmCampaign ?? campaign ?? "(nenhuma)",
          has_phone:    !!phoneE164,
          cep_used:     cepState === "ok",
        },
      })
    } catch {
      setState("error-network")
    }
  }

  if (state === "success") {
    /*
      Link de convite. Antes era a string fixa "https://shareo.com.br", que hoje
      serve o placeholder Netlify — TODO convite orgânico caía numa página que não
      capta nada, justamente o canal que não custa nada.

      NEXT_PUBLIC_APP_URL é a variável canônica do repo (app/layout.tsx,
      sitemap.ts, robots.ts). O fallback é window.location.origin: se a variável
      faltar no build, o convite ainda aponta para o site de onde a pessoa veio,
      em vez de para um domínio errado.

      Leva `ref` (quem indicou) e UTM próprio, para o painel separar boca a boca
      de mídia paga. `ref` só entra se o lead tem código — os criados antes da
      migração de indicação não têm.
    */
    const base = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const inviteParams = new URLSearchParams({
      utm_source:   "whatsapp",
      utm_medium:   "referral",
      utm_campaign: attribution.utmCampaign ?? campaign ?? "indicacao",
    })
    if (referralCode) inviteParams.set("ref", referralCode)
    const inviteUrl = `${base}/?${inviteParams}`

    return (
      <div className="mx-auto flex max-w-[400px] flex-col items-center gap-4 py-4">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent/20">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-accent" aria-hidden="true">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
          </svg>
        </div>
        <div className="text-center">
          <p className="font-display text-xl font-bold text-white">
            Você é o #{position}° na lista!
          </p>
          <p className="mt-1 text-sm text-white/70">
            Avisaremos <strong className="text-white">{email}</strong> quando o Shareo abrir.
          </p>
        </div>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`Entrei na lista de fundadores do Shareo — plataforma de aluguel de itens entre pessoas. Entre também: ${inviteUrl}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => trackEvent({ name: "founder_invite_click", params: { queue_position: position } })}
          className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-white/20 bg-white/10 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Convidar amigos no WhatsApp
        </a>
      </div>
    )
  }

  if (state === "error-duplicate") {
    /*
      Este bloco é AVISO, não confirmação — e a diferença precisa ser visível.

      Antes ele usava as mesmas cores de sucesso (borda accent, texto success) e
      dizia só "Você já está na lista!". Quem reenviava o formulário lia como
      "cadastrado com sucesso" e concluía que tinha criado um segundo registro
      (relatado pelo fundador em 12/08). Nada é criado: o e-mail é UNIQUE e a API
      recusa com 409 antes de escrever.

      Agora: tom neutro (não verde de sucesso), o verbo no passado deixando claro
      que o cadastro é o ANTERIOR, e a posição na fila — que a API já devolvia no
      corpo do 409 e a tela descartava.
    */
    return (
      <div className="mx-auto max-w-[400px]">
        <div
          role="alert"
          className="rounded-lg border border-border bg-white/10 px-4 py-3 text-center text-sm text-white"
        >
          <strong className="font-semibold">Este e-mail já estava na lista.</strong>
          <br />
          {position > 0
            ? `Você é o Nº ${position} da fila — não criamos um cadastro novo.`
            : "Não criamos um cadastro novo. Você será avisado quando abrirmos."}
        </div>
      </div>
    )
  }

  if (state === "collapsed") {
    return (
      <button
        type="button"
        onClick={() => setState("expanded")}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-10 py-4 text-base font-semibold uppercase tracking-[0.5px] text-white transition-colors hover:bg-brand-hover xl:w-auto xl:min-w-[260px]"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
        </svg>
        Quero ser avisado no lançamento
      </button>
    )
  }

  const isLoading = state === "loading"
  const inputCls =
    "h-11 w-full rounded-lg border border-white/20 bg-white/[0.08] px-4 text-sm text-white placeholder:text-white/40 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"

  // O portão de envio continua sendo CIDADE + UF, exatamente como antes do CEP.
  // O CEP é atalho, nunca requisito: ViaCEP fora do ar não pode zerar a captação
  // de uma campanha paga.
  const canSubmit =
    !isLoading && !!email.trim() && !!city.trim() && uf.trim().length === 2 && lgpdConsent

  return (
    <form
      onSubmit={handleSubmit}
      aria-label="Formulário de entrada na lista do ShareO"
      className="mx-auto flex max-w-[400px] flex-col gap-3"
    >
      <div role="group" aria-label="Tipo de uso" className="grid grid-cols-2 gap-2">
        {(["proprietario", "locatario"] as const).map((opt) => {
          const isChecked = selected.has(opt)
          return (
            <button
              key={opt}
              type="button"
              role="checkbox"
              aria-checked={isChecked}
              onClick={() => toggleIntent(opt)}
              disabled={isLoading}
              className={[
                "min-h-[44px] rounded-lg border px-3 text-sm font-semibold transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary",
                isChecked
                  ? "border-accent bg-accent/20 text-white"
                  : "border-white/20 text-white/70 hover:border-white/40 hover:text-white",
                isLoading ? "opacity-60" : "",
              ].join(" ")}
            >
              <span className="flex items-center justify-center gap-1.5">
                <span aria-hidden="true" className={isChecked ? "opacity-100" : "opacity-0"}>✓</span>
                {opt === "proprietario" ? "Quero anunciar" : "Quero alugar"}
              </span>
            </button>
          )
        })}
      </div>

      <div>
        <label htmlFor="founder-name" className="sr-only">Nome</label>
        <input
          id="founder-name"
          type="text"
          autoComplete="name"
          placeholder="Seu nome (opcional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          disabled={isLoading}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="founder-email" className="sr-only">E-mail</label>
        <input
          id="founder-email"
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="Seu melhor e-mail *"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          disabled={isLoading}
          className={inputCls}
        />
      </div>

      <div>
        <label htmlFor="founder-phone" className="sr-only">
          WhatsApp (opcional)
        </label>
        <input
          id="founder-phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="WhatsApp (opcional)"
          maxLength={15}
          value={phone}
          onChange={(e) => setPhone(maskPhone(e.target.value))}
          disabled={isLoading}
          aria-describedby="founder-phone-hint"
          className={inputCls}
        />
        <p id="founder-phone-hint" className="mt-1 text-left text-xs leading-snug text-white/45">
          Se quiser, avisamos você por aqui também quando abrirmos na sua cidade.
        </p>
      </div>

      {/* ── CEP ───────────────────────────────────────────────────────────────
          Rótulo VISÍVEL (não sr-only): o campo carrega peso semântico — é o que
          determina o bairro usado no ranking de cidades-piloto — e placeholder
          sozinho some ao começar a digitar. */}
      <div>
        <label htmlFor="founder-cep" className="mb-1 block text-left text-xs font-semibold uppercase tracking-wider text-white/70">
          CEP
        </label>
        <div className="relative">
          <input
            id="founder-cep"
            type="text"
            inputMode="numeric"
            autoComplete="postal-code"
            placeholder="00000-000"
            maxLength={9}
            value={cepVal}
            onChange={(e) => setCepVal(maskCEP(e.target.value))}
            onBlur={() => {
              const d = cepVal.replace(/\D/g, "")
              if (d.length === 8 && cepState === "idle") void lookupCep(d)
            }}
            disabled={isLoading}
            aria-describedby="founder-cep-hint founder-cep-status"
            aria-invalid={cepState === "notfound" || undefined}
            aria-busy={cepState === "loading" || undefined}
            className={inputCls}
          />
          {cepState === "loading" && (
            <svg
              className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-white/60"
              width="16" height="16" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" aria-hidden="true"
            >
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
          )}
        </div>

        <p id="founder-cep-hint" className="mt-1 text-left text-xs leading-snug text-white/45">
          Usamos só para saber seu bairro e escolher as primeiras cidades.
          Não pedimos número nem complemento.
        </p>

        {/* Leitura do endereço vigente / mensagens de estado.
            Mostra sempre que houver cidade — venha ela do ViaCEP OU do
            defaultCity de /pilotos/[cidade]. Sem isto, quem chega pela landing
            de cidade não veria (nem poderia corrigir) onde está se cadastrando.
            aria-live para o leitor de tela anunciar o preenchimento automático. */}
        <div id="founder-cep-status" role="status" aria-live="polite" className="mt-1.5 text-left">
          {cepState !== "notfound" && cepState !== "error" && city && !showManual && (
            <p className="text-xs text-white/80">
              <span aria-hidden="true">📍 </span>
              {neighborhood ? <>Bairro <strong className="font-semibold">{neighborhood}</strong> · </> : null}
              <strong className="font-semibold">{city}</strong>{uf ? `/${uf}` : ""}{" "}
              <button
                type="button"
                onClick={revealManual}
                className="ml-1 underline decoration-white/40 hover:decoration-white"
              >
                Não é aqui? Corrigir
              </button>
            </p>
          )}
          {cepState === "notfound" && (
            <p className="text-xs text-amber-200">
              CEP não encontrado. Confira os campos abaixo.
            </p>
          )}
          {cepState === "error" && (
            <p className="text-xs text-amber-200">
              Não conseguimos consultar o CEP agora. Preencha os campos abaixo.
            </p>
          )}
        </div>
      </div>

      {/* ── Preenchimento manual ────────────────────────────────────────────────
          Sempre disponível como saída: CEP inexistente, ViaCEP fora do ar, ou
          município de CEP único (que devolve bairro vazio). Nunca é um beco sem
          saída — é o caminho que mantém a conversão de pé. */}
      {showManual && (
        <div className="flex flex-col gap-2 rounded-lg border border-white/15 bg-white/[0.04] p-3">
          <div>
            <label htmlFor="founder-neighborhood" className="mb-1 block text-left text-xs font-semibold uppercase tracking-wider text-white/70">
              Bairro <span className="font-normal normal-case text-white/45">(opcional)</span>
            </label>
            <input
              ref={manualRef}
              id="founder-neighborhood"
              type="text"
              autoComplete="address-level3"
              placeholder="Seu bairro"
              value={neighborhood}
              onChange={(e) => setNeighborhood(e.target.value)}
              disabled={isLoading}
              className={inputCls}
            />
          </div>
          <div className="grid grid-cols-[1fr_auto] gap-2">
            <div>
              <label htmlFor="founder-city" className="mb-1 block text-left text-xs font-semibold uppercase tracking-wider text-white/70">
                Cidade *
              </label>
              <input
                id="founder-city"
                type="text"
                autoComplete="address-level2"
                placeholder="Sua cidade"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                required
                disabled={isLoading}
                className={inputCls}
              />
            </div>
            <div>
              <label htmlFor="founder-uf" className="mb-1 block text-left text-xs font-semibold uppercase tracking-wider text-white/70">
                UF *
              </label>
              <input
                id="founder-uf"
                type="text"
                autoComplete="address-level1"
                placeholder="UF"
                maxLength={2}
                value={uf}
                onChange={(e) => setUf(e.target.value.toUpperCase())}
                required
                disabled={isLoading}
                className="h-11 w-16 rounded-lg border border-white/20 bg-white/[0.08] px-3 text-center text-sm uppercase text-white placeholder:text-white/40 transition-colors focus:border-transparent focus:outline-none focus:ring-2 focus:ring-accent disabled:opacity-60"
              />
            </div>
          </div>
        </div>
      )}

      {/* Escape hatch para quem não quer digitar CEP nenhum. Só aparece quando
          ainda não há cidade resolvida — com cidade definida o link de correção
          já vive no readout acima. */}
      {!showManual && !city && (
        <button
          type="button"
          onClick={revealManual}
          className="self-center text-xs text-white/50 underline decoration-white/25 hover:text-white/80 hover:decoration-white/60"
        >
          Prefiro informar cidade e estado
        </button>
      )}

      {state === "error-network" && (
        <div role="alert" className="rounded-lg border border-red-400/30 bg-red-400/10 px-4 py-2.5 text-center text-sm text-white">
          Erro de conexão.{" "}
          <button type="submit" className="font-semibold underline">
            Tentar novamente
          </button>
        </div>
      )}

      <label className="flex cursor-pointer items-start gap-2.5">
        <input
          type="checkbox"
          checked={lgpdConsent}
          onChange={(e) => setLgpdConsent(e.target.checked)}
          disabled={isLoading}
          className="form-checkbox mt-0.5 h-4 w-4 shrink-0 cursor-pointer rounded border-white/30 bg-white/10 accent-accent"
        />
        {/*
          Texto vem de lib/legal-config.ts: é a MESMA string que
          MARKETING_CONSENT_VERSION versiona e que fica gravada no lead, então o
          que a pessoa aceitou é reconstituível a partir do registro.
        */}
        <span className="text-xs leading-snug text-white/60">
          {MARKETING_CONSENT_TEXT}
        </span>
      </label>

      <button
        type="submit"
        disabled={!canSubmit}
        aria-busy={isLoading}
        className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-brand px-6 py-3 text-sm font-semibold uppercase tracking-[0.4px] text-white transition-colors hover:bg-brand-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <>
            <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
            </svg>
            Enviando…
          </>
        ) : (
          <>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
            Garantir minha vaga
          </>
        )}
      </button>

      <p className="text-center text-xs text-white/40">
        Ao continuar você aceita as{" "}
        <a href="/politicas" className="underline decoration-white/30 hover:decoration-white/60">
          políticas do Shareo
        </a>.
      </p>
    </form>
  )
}
