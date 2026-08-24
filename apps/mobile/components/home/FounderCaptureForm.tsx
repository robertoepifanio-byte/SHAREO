// Fonte: components/home/FounderCaptureForm.tsx
// Transcrição literal do formulário de captação de fundadores para React Native.
// Estados, campos, textos e lógica de submit transcritos verbatim do componente do site.

import { useEffect, useRef, useState } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Linking,
  ActivityIndicator,
  StyleSheet,
} from "react-native"
import Svg, { Path, Line, Polygon, Polyline } from "react-native-svg"
import { API_URL } from "@/lib/api"
import { MARKETING_CONSENT_VERSION, MARKETING_CONSENT_TEXT } from "@/lib/legalConfig"
import { maskCEP, maskPhone, phoneToE164, fetchAddressByCep } from "@/lib/forms"

type IntentOption = "proprietario" | "locatario"

/**
 * Estado da consulta de CEP — transcrito do site.
 *
 * `idle`     — nada digitado ainda
 * `loading`  — consultando o ViaCEP
 * `ok`       — endereço resolvido (o readout mostra o que foi encontrado)
 * `notfound` — CEP bem formado mas inexistente → revela preenchimento manual
 * `error`    — ViaCEP fora do ar / sem rede → revela preenchimento manual
 */
type CepState = "idle" | "loading" | "ok" | "notfound" | "error"
type State =
  | "collapsed"
  | "expanded"
  | "loading"
  | "success"
  | "error-network"
  | "error-duplicate"

function resolveIntent(
  selected: Set<IntentOption>,
): "proprietario" | "locatario" | "ambos" {
  if (selected.has("proprietario") && selected.has("locatario")) return "ambos"
  if (selected.has("locatario")) return "locatario"
  return "proprietario"
}

// ── Ícones — transcritos verbatim de FounderCaptureForm.tsx do site ───────────

// Estrela — collapsed button + success state
function StarIcon({ stroke = "#FFFFFF", size = 18 }: { stroke?: string; size?: number }) {
  return (
    <Svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
    </Svg>
  )
}

// Enviar — botão submit no estado normal
function SendIcon() {
  return (
    <Svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#FFFFFF"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Line x1="22" y1="2" x2="11" y2="13" />
      <Polygon points="22 2 15 22 11 13 2 9 22 2" />
    </Svg>
  )
}

// WhatsApp — botão de compartilhamento no estado de sucesso (fill, não stroke)
function WhatsAppIcon() {
  return (
    <Svg width={16} height={16} viewBox="0 0 24 24" fill="#FFFFFF">
      <Path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </Svg>
  )
}

// Checkmark — checkbox marcado
function CheckmarkIcon() {
  return (
    <Svg
      width={10}
      height={10}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#003366"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Polyline points="20 6 9 17 4 12" />
    </Svg>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
type Props = {
  /** Pré-preenche a cidade — mesma prop do componente do site. */
  defaultCity?: string
  /** Pré-preenche a UF — mesma prop do componente do site. */
  defaultUf?: string
  /** Campanha-padrão — mesma prop do componente do site. */
  campaign?: string
  /** Começa expandido — mesma prop do componente do site. */
  startExpanded?: boolean
}

export function FounderCaptureForm({
  defaultCity,
  defaultUf,
  campaign,
  startExpanded,
}: Props = {}) {
  const [state, setState] = useState<State>(
    startExpanded ? "expanded" : "collapsed",
  )
  const [selected, setSelected] = useState<Set<IntentOption>>(
    new Set(["proprietario"]),
  )
  const [name, setName]               = useState("")
  const [email, setEmail]             = useState("")
  const [phone, setPhone]             = useState("")

  // Localização. `city`/`uf` continuam sendo a fonte da verdade do envio — o CEP
  // é só o caminho rápido para preenchê-los.
  const [cepVal, setCepVal]             = useState("")
  const [cepState, setCepState]         = useState<CepState>("idle")
  const [neighborhood, setNeighborhood] = useState("")
  const [city, setCity]                 = useState(defaultCity ?? "")
  const [uf, setUf]                     = useState(defaultUf ?? "")
  const [showManual, setShowManual]     = useState(false)

  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [position, setPosition]       = useState(0)

  // Descarta respostas obsoletas do ViaCEP: digitar rápido "50030230" → "50030231"
  // pode resolver fora de ordem e sobrescrever o endereço certo pelo antigo.
  const cepSeq = useRef(0)

  /** Revela cidade/UF/bairro manuais. */
  function revealManual() {
    setShowManual(true)
  }

  /** Estilo dos campos — o desabilitado durante o envio vale para todos. */
  const inputStyle = (extra?: object) => [s.input, extra, state === "loading" && s.inputDisabled]

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

  async function handleSubmit() {
    setState("loading")
    try {
      const cepDigits = cepVal.replace(/\D/g, "")

      const res = await fetch(`${API_URL}/api/founders/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:            email.trim().toLowerCase(),
          name:             name.trim() || undefined,
          phone:            phoneToE164(phone),
          intent:           resolveIntent(selected),
          marketingConsent: lgpdConsent,
          consentVersion:   MARKETING_CONSENT_VERSION,
          // Mobile não tem URL params de atribuição — usa VIP_LANDING como default
          source:           "VIP_LANDING" as const,
          city:             city.trim(),
          state:            uf.trim().toUpperCase(),
          cep:              cepDigits.length === 8 ? cepDigits : undefined,
          neighborhood:     neighborhood.trim() || undefined,
          // Permite medir a taxa de fallback do ViaCEP sem instrumentação extra.
          addressSource:    cepState === "ok" ? "CEP" : "MANUAL",
          utmCampaign:      campaign,
        }),
      })
      // 409 = e-mail já cadastrado. A API devolve a posição na fila DENTRO do
      // erro; aproveitamos para dizer QUAL é, em vez de um "você já está na
      // lista" genérico que o usuário confunde com confirmação de novo cadastro.
      if (res.status === 409) {
        const dup = (await res.json().catch(() => null)) as
          { error?: { data?: { queuePosition?: number } } } | null
        // 0 = posição desconhecida (corpo inesperado); a UI omite o número.
        setPosition(dup?.error?.data?.queuePosition ?? 0)
        setState("error-duplicate")
        return
      }
      if (!res.ok)            { setState("error-network");   return }
      const json = (await res.json()) as { data: { queuePosition: number } }
      setPosition(json.data.queuePosition)
      setState("success")
    } catch {
      setState("error-network")
    }
  }

  const isSubmitDisabled =
    state === "loading" ||
    !email.trim() ||
    !city.trim() ||
    uf.trim().length !== 2 ||
    !lgpdConsent

  // ── success ────────────────────────────────────────────────────────────────
  if (state === "success") {
    const waMsg = encodeURIComponent(
      "Entrei na lista de fundadores do Shareo — plataforma de aluguel de itens entre pessoas. Entre também: https://shareo.com.br",
    )
    return (
      <View style={s.successContainer}>
        <View style={s.successOrb}>
          <StarIcon stroke="#59C686" size={28} />
        </View>
        <View style={s.successTextBlock}>
          <Text style={s.successTitle}>Você é o #{position}° na lista!</Text>
          <Text style={s.successSubtitle}>
            {"Avisaremos "}
            <Text style={s.successEmail}>{email}</Text>
            {" quando o Shareo abrir."}
          </Text>
        </View>
        <TouchableOpacity
          onPress={() => Linking.openURL(`https://wa.me/?text=${waMsg}`)}
          style={s.waButton}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Convidar amigos no WhatsApp"
        >
          <WhatsAppIcon />
          <Text style={s.waText}>Convidar amigos no WhatsApp</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── error-duplicate ────────────────────────────────────────────────────────
  if (state === "error-duplicate") {
    return (
      <View style={s.alertSuccess} accessibilityRole="alert">
        <Text style={s.alertSuccessText}>
          <Text style={s.alertStrong}>Este e-mail já estava na lista.</Text>
          {"\n"}
          {position > 0
            ? `Você é o Nº ${position} da fila — não criamos um cadastro novo.`
            : "Não criamos um cadastro novo. Você será avisado quando abrirmos."}
        </Text>
      </View>
    )
  }

  // ── collapsed ──────────────────────────────────────────────────────────────
  if (state === "collapsed") {
    return (
      <TouchableOpacity
        onPress={() => setState("expanded")}
        style={s.collapsedBtn}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Quero ser avisado no lançamento"
      >
        <StarIcon stroke="#FFFFFF" size={18} />
        <Text style={s.collapsedText}>Quero ser avisado no lançamento</Text>
      </TouchableOpacity>
    )
  }

  // ── expanded | loading | error-network ────────────────────────────────────
  return (
    <View style={s.form} accessibilityLabel="Formulário de entrada na lista do ShareO">
      {/* Tipo de uso — 2 toggles checkbox */}
      <View style={s.intentRow} accessibilityLabel="Tipo de uso">
        {(["proprietario", "locatario"] as const).map((opt) => {
          const isChecked = selected.has(opt)
          return (
            <TouchableOpacity
              key={opt}
              onPress={() => toggleIntent(opt)}
              disabled={state === "loading"}
              style={[s.intentBtn, isChecked && s.intentBtnChecked]}
              activeOpacity={0.80}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isChecked }}
              accessibilityLabel={opt === "proprietario" ? "Quero anunciar" : "Quero alugar"}
            >
              <Text style={[s.intentBtnText, isChecked && s.intentBtnTextChecked]}>
                {isChecked ? "✓ " : "  "}
                {opt === "proprietario" ? "Quero anunciar" : "Quero alugar"}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>

      {/* Nome (opcional) */}
      <TextInput
        value={name}
        onChangeText={setName}
        placeholder="Seu nome (opcional)"
        placeholderTextColor="rgba(255,255,255,0.40)"
        autoComplete="name"
        editable={state !== "loading"}
        style={inputStyle()}
        accessibilityLabel="Nome"
      />

      {/* E-mail */}
      <TextInput
        value={email}
        onChangeText={setEmail}
        placeholder="Seu melhor e-mail *"
        placeholderTextColor="rgba(255,255,255,0.40)"
        keyboardType="email-address"
        autoComplete="email"
        autoCapitalize="none"
        editable={state !== "loading"}
        style={inputStyle()}
        accessibilityLabel="E-mail"
      />

      {/* WhatsApp (opcional) */}
      <View>
        <TextInput
          value={phone}
          onChangeText={(v) => setPhone(maskPhone(v))}
          placeholder="WhatsApp (opcional)"
          placeholderTextColor="rgba(255,255,255,0.40)"
          keyboardType="number-pad"
          maxLength={15}
          editable={state !== "loading"}
          style={inputStyle()}
          accessibilityLabel="WhatsApp (opcional)"
        />
        <Text style={s.fieldHint}>
          Se quiser, avisamos você por aqui também quando abrirmos na sua cidade.
        </Text>
      </View>

      {/* ── CEP ───────────────────────────────────────────────────────────────
          Rótulo VISÍVEL (não só placeholder), como no site: o campo determina o
          bairro usado no ranking de cidades-piloto, e placeholder sozinho some
          ao começar a digitar. */}
      <View>
        <Text style={s.fieldLabel}>CEP</Text>
        <View>
          <TextInput
            value={cepVal}
            onChangeText={(v) => setCepVal(maskCEP(v))}
            onBlur={() => {
              const d = cepVal.replace(/\D/g, "")
              if (d.length === 8 && cepState === "idle") void lookupCep(d)
            }}
            placeholder="00000-000"
            placeholderTextColor="rgba(255,255,255,0.40)"
            keyboardType="number-pad"
            maxLength={9}
            editable={state !== "loading"}
            style={inputStyle()}
            accessibilityLabel="CEP"
          />
          {cepState === "loading" && (
            <ActivityIndicator size="small" color="rgba(255,255,255,0.60)" style={s.cepSpinner} />
          )}
        </View>

        <Text style={s.fieldHint}>
          Usamos só para saber seu bairro e escolher as primeiras cidades.
          Não pedimos número nem complemento.
        </Text>

        {/* Leitura do endereço vigente / mensagens de estado. Aparece sempre que
            houver cidade — venha ela do ViaCEP OU do defaultCity. */}
        <View style={s.cepStatus} accessibilityRole="text" accessibilityLiveRegion="polite">
          {cepState !== "notfound" && cepState !== "error" && !!city && !showManual && (
            <Text style={s.cepReadout}>
              {"📍 "}
              {neighborhood ? <>{"Bairro "}<Text style={s.cepStrong}>{neighborhood}</Text>{" · "}</> : null}
              <Text style={s.cepStrong}>{city}</Text>{uf ? `/${uf}` : ""}{" "}
              <Text style={s.cepCorrigir} onPress={revealManual} accessibilityRole="link">
                Não é aqui? Corrigir
              </Text>
            </Text>
          )}
          {cepState === "notfound" && (
            <Text style={s.cepAviso}>CEP não encontrado. Confira os campos abaixo.</Text>
          )}
          {cepState === "error" && (
            <Text style={s.cepAviso}>Não conseguimos consultar o CEP agora. Preencha os campos abaixo.</Text>
          )}
        </View>
      </View>

      {/* ── Preenchimento manual ────────────────────────────────────────────────
          Sempre disponível como saída: CEP inexistente, ViaCEP fora do ar, ou
          município de CEP único (que devolve bairro vazio). Nunca é beco sem
          saída — é o caminho que mantém a conversão de pé. */}
      {showManual && (
        <View style={s.manualBox}>
          <View>
            <Text style={s.fieldLabel}>
              {"Bairro "}<Text style={s.fieldLabelOpcional}>(opcional)</Text>
            </Text>
            <TextInput
              value={neighborhood}
              onChangeText={setNeighborhood}
              placeholder="Seu bairro"
              placeholderTextColor="rgba(255,255,255,0.40)"
              editable={state !== "loading"}
              style={inputStyle()}
              accessibilityLabel="Bairro (opcional)"
            />
          </View>
          <View style={s.cityRow}>
            <View style={s.inputFlex}>
              <Text style={s.fieldLabel}>Cidade *</Text>
              <TextInput
                value={city}
                onChangeText={setCity}
                placeholder="Sua cidade"
                placeholderTextColor="rgba(255,255,255,0.40)"
                editable={state !== "loading"}
                style={inputStyle()}
                accessibilityLabel="Cidade"
              />
            </View>
            <View>
              <Text style={s.fieldLabel}>UF *</Text>
              <TextInput
                value={uf}
                onChangeText={(t) => setUf(t.toUpperCase())}
                placeholder="UF"
                placeholderTextColor="rgba(255,255,255,0.40)"
                maxLength={2}
                autoCapitalize="characters"
                editable={state !== "loading"}
                style={inputStyle(s.inputUF)}
                accessibilityLabel="Estado (UF)"
              />
            </View>
          </View>
        </View>
      )}

      {/* Saída para quem não quer digitar CEP nenhum. Só aparece sem cidade
          resolvida — com cidade, o link de correção já vive no readout acima. */}
      {!showManual && !city && (
        <Text style={s.preferirManual} onPress={revealManual} accessibilityRole="link">
          Prefiro informar cidade e estado
        </Text>
      )}

      {/* Erro de rede */}
      {state === "error-network" && (
        <View style={s.alertError} accessibilityRole="alert">
          <Text style={s.alertErrorText}>
            {"Erro de conexão. "}
            <Text style={s.retryLink} onPress={handleSubmit} accessibilityRole="link">
              Tentar novamente
            </Text>
          </Text>
        </View>
      )}

      {/* Consentimento LGPD */}
      <TouchableOpacity
        onPress={() => setLgpdConsent((v) => !v)}
        disabled={state === "loading"}
        style={s.consentRow}
        activeOpacity={0.80}
        accessibilityRole="checkbox"
        accessibilityState={{ checked: lgpdConsent }}
        accessibilityLabel="Concordo em receber comunicações sobre o lançamento"
      >
        <View style={[s.checkbox, lgpdConsent && s.checkboxChecked]}>
          {lgpdConsent && <CheckmarkIcon />}
        </View>
        {/*
          Mesma string que MARKETING_CONSENT_VERSION versiona e que fica gravada
          no lead — o que a pessoa aceitou é reconstituível a partir do registro.
          Fonte: components/home/FounderCaptureForm.tsx (site).
        */}
        <Text style={s.consentText}>{MARKETING_CONSENT_TEXT}</Text>
      </TouchableOpacity>

      {/* Botão submit */}
      <TouchableOpacity
        onPress={handleSubmit}
        disabled={isSubmitDisabled}
        style={[s.submitBtn, isSubmitDisabled && s.submitBtnDisabled]}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Garantir minha vaga"
        accessibilityState={{ busy: state === "loading", disabled: isSubmitDisabled }}
      >
        {state === "loading" ? (
          <>
            <ActivityIndicator color="#FFFFFF" size="small" />
            <Text style={s.submitText}>Enviando…</Text>
          </>
        ) : (
          <>
            <SendIcon />
            <Text style={s.submitText}>Garantir minha vaga</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={s.footerNote}>
        {"Ao continuar você aceita as "}
        <Text
          style={s.footerLink}
          onPress={() => Linking.openURL(`${API_URL}/politicas`)}
          accessibilityRole="link"
        >
          políticas do Shareo
        </Text>
        {"."}
      </Text>
    </View>
  )
}

// ── Styles ─────────────────────────────────────────────────────────────────────
// Cores e dimensões transcritas das classes CSS de FounderCaptureForm.tsx do site.
const s = StyleSheet.create({
  // Success
  successContainer: { alignItems: "center", gap: 16, paddingVertical: 16 },
  successOrb: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(89,198,134,0.20)",
    alignItems: "center", justifyContent: "center",
  },
  successTextBlock: { alignItems: "center" },
  successTitle: {
    fontSize: 20, fontWeight: "800", color: "#FFFFFF", textAlign: "center",
  },
  successSubtitle: {
    fontSize: 14, color: "rgba(255,255,255,0.70)", textAlign: "center", marginTop: 4,
  },
  successEmail: { fontWeight: "700", color: "#FFFFFF" },
  waButton: {
    flexDirection: "row", alignItems: "center", gap: 8,
    minHeight: 44, borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.10)",
    paddingHorizontal: 20, paddingVertical: 10,
  },
  waText: { fontSize: 14, fontWeight: "600", color: "#FFFFFF" },

  // Alertas
  alertSuccess: {
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(89,198,134,0.30)",
    backgroundColor: "rgba(89,198,134,0.10)",
    paddingHorizontal: 16, paddingVertical: 12,
  },
  alertSuccessText: { fontSize: 14, color: "#59C686", textAlign: "center" },
  // <strong> do site — o aviso tem duas frases e a primeira é a que importa.
  alertStrong: { fontWeight: "600" },
  alertError: {
    borderRadius: 8, borderWidth: 1, borderColor: "rgba(248,113,113,0.30)",
    backgroundColor: "rgba(248,113,113,0.10)",
    paddingHorizontal: 16, paddingVertical: 10,
  },
  alertErrorText: { fontSize: 14, color: "#FFFFFF", textAlign: "center" },
  retryLink: { fontWeight: "700", textDecorationLine: "underline" },

  // Collapsed
  collapsedBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#007B3C", borderRadius: 8,
    minHeight: 44, paddingHorizontal: 40, paddingVertical: 12,
    width: "100%",
  },
  collapsedText: {
    fontSize: 14, fontWeight: "600", color: "#FFFFFF",
    letterSpacing: 0.5, textTransform: "uppercase",
  },

  // Formulário
  form: { gap: 12, width: "100%" },
  intentRow: { flexDirection: "row", gap: 8 },
  intentBtn: {
    flex: 1, minHeight: 44, borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.20)",
    alignItems: "center", justifyContent: "center",
    paddingHorizontal: 8,
  },
  intentBtnChecked: {
    borderColor: "#59C686",
    backgroundColor: "rgba(89,198,134,0.20)",
  },
  intentBtnText: { fontSize: 13, fontWeight: "600", color: "rgba(255,255,255,0.70)" },
  intentBtnTextChecked: { color: "#FFFFFF" },

  input: {
    minHeight: 44, borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.20)",
    backgroundColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: 16,
    fontSize: 14, color: "#FFFFFF",
  },
  inputFlex: { flex: 1 },
  inputUF: { width: 64, textAlign: "center", textTransform: "uppercase" },
  inputDisabled: { opacity: 0.60 },
  cityRow: { flexDirection: "row", gap: 8, alignItems: "flex-end" },

  // Campos com rótulo/dica visíveis (CEP e bloco manual) — text-xs do site.
  fieldLabel: {
    marginBottom: 4, fontSize: 12, fontWeight: "600",
    letterSpacing: 0.8, textTransform: "uppercase",
    color: "rgba(255,255,255,0.70)",
  },
  fieldLabelOpcional: {
    fontWeight: "400", textTransform: "none", letterSpacing: 0,
    color: "rgba(255,255,255,0.45)",
  },
  fieldHint: {
    marginTop: 4, fontSize: 12, lineHeight: 17,
    color: "rgba(255,255,255,0.45)",
  },

  // CEP
  cepSpinner: { position: "absolute", right: 12, top: 0, bottom: 0 },
  cepStatus:  { marginTop: 6 },
  cepReadout: { fontSize: 12, lineHeight: 17, color: "rgba(255,255,255,0.80)" },
  cepStrong:  { fontWeight: "600" },
  cepCorrigir: { textDecorationLine: "underline" },
  // amber-200 do site — aviso, não erro: o envio continua possível pelo manual.
  cepAviso: { fontSize: 12, lineHeight: 17, color: "#FDE68A" },

  manualBox: {
    gap: 8, padding: 12, borderRadius: 8,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.15)",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  preferirManual: {
    alignSelf: "center", fontSize: 12,
    color: "rgba(255,255,255,0.50)", textDecorationLine: "underline",
  },

  // Consentimento
  consentRow: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
  },
  checkbox: {
    width: 16, height: 16, borderRadius: 3, marginTop: 2,
    borderWidth: 1, borderColor: "rgba(255,255,255,0.30)",
    backgroundColor: "rgba(255,255,255,0.10)",
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  checkboxChecked: { backgroundColor: "#59C686", borderColor: "#59C686" },
  consentText: {
    flex: 1, fontSize: 12, lineHeight: 17,
    color: "rgba(255,255,255,0.60)",
  },

  // Submit
  submitBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    backgroundColor: "#007B3C", borderRadius: 8,
    minHeight: 44, paddingHorizontal: 24, paddingVertical: 12,
  },
  submitBtnDisabled: { opacity: 0.70 },
  submitText: {
    fontSize: 14, fontWeight: "600", color: "#FFFFFF",
    letterSpacing: 0.4, textTransform: "uppercase",
  },

  footerNote: {
    fontSize: 12, color: "rgba(255,255,255,0.40)", textAlign: "center",
  },
  footerLink: { textDecorationLine: "underline" },
})
