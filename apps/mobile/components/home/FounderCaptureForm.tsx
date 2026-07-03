// Fonte: components/home/FounderCaptureForm.tsx
// Transcrição literal do formulário de captação de fundadores para React Native.
// Estados, campos, textos e lógica de submit transcritos verbatim do componente do site.

import { useState } from "react"
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

// CONSENT_VERSION transcrito de lib/legal-config.ts — "v1.1" (KYB leve PJ, junho 2026)
const CONSENT_VERSION = "v1.1"

type IntentOption = "proprietario" | "locatario"
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
  const [city, setCity]               = useState(defaultCity ?? "")
  const [uf, setUf]                   = useState(defaultUf ?? "")
  const [lgpdConsent, setLgpdConsent] = useState(false)
  const [position, setPosition]       = useState(0)

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
      const res = await fetch(`${API_URL}/api/founders/leads`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:            email.trim().toLowerCase(),
          name:             name.trim() || undefined,
          intent:           resolveIntent(selected),
          marketingConsent: lgpdConsent,
          consentVersion:   CONSENT_VERSION,
          // Mobile não tem URL params de atribuição — usa VIP_LANDING como default
          source:           "VIP_LANDING" as const,
          city:             city.trim(),
          state:            uf.trim().toUpperCase(),
          utmCampaign:      campaign,
        }),
      })
      if (res.status === 409) { setState("error-duplicate"); return }
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
          Você já está na lista! Será um dos primeiros a saber quando abrirmos.
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
        style={[s.input, state === "loading" && s.inputDisabled]}
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
        style={[s.input, state === "loading" && s.inputDisabled]}
        accessibilityLabel="E-mail"
      />

      {/* Cidade + UF */}
      <View style={s.cityRow}>
        <TextInput
          value={city}
          onChangeText={setCity}
          placeholder="Sua cidade *"
          placeholderTextColor="rgba(255,255,255,0.40)"
          autoComplete="street-address"
          editable={state !== "loading"}
          style={[s.input, s.inputFlex, state === "loading" && s.inputDisabled]}
          accessibilityLabel="Cidade"
        />
        <TextInput
          value={uf}
          onChangeText={(t) => setUf(t.toUpperCase())}
          placeholder="UF *"
          placeholderTextColor="rgba(255,255,255,0.40)"
          maxLength={2}
          autoCapitalize="characters"
          editable={state !== "loading"}
          style={[s.input, s.inputUF, state === "loading" && s.inputDisabled]}
          accessibilityLabel="Estado (UF)"
        />
      </View>

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
        <Text style={s.consentText}>
          {"Concordo em receber comunicações sobre o lançamento do Shareo. Posso cancelar a qualquer momento pelo e-mail "}
          <Text
            style={s.consentLink}
            onPress={() => Linking.openURL("mailto:privacidade@shareo.com.br")}
            accessibilityRole="link"
          >
            privacidade@shareo.com.br
          </Text>
          {"."}
        </Text>
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
  cityRow: { flexDirection: "row", gap: 8 },

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
  consentLink: { textDecorationLine: "underline" },

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
