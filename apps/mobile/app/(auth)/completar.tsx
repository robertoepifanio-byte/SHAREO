// Fonte: app/(auth)/cadastro/completar/page.tsx + CompleteRegistrationForm.tsx
//
// Etapa do cadastro progressivo — o usuário se cadastra com o mínimo e completa
// os dados (documento + endereço) ao tentar anunciar ou alugar. Transcrição
// literal de CompleteRegistrationForm.tsx em 375px.
//
// Endpoint: PATCH /api/users/me/complete-registration
// Handler usa resolveUserId — Bearer token do app funciona sem cookie.

import { useState, useRef } from "react"
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Linking,
  StyleSheet,
  ActivityIndicator,
  type TextInputProps,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { router, useLocalSearchParams } from "expo-router"
import { useTheme, type Tokens } from "@/lib/theme"
import { apiFetch, API_URL } from "@/lib/api"
import { DPO_EMAIL, PJ_DECLARATION_TEXT } from "@/lib/legalConfig"
import {
  maskCPF,
  maskCNPJ,
  maskCEP,
  maskPhone,
  phoneToE164,
  fetchAddressByCep,
} from "@/lib/forms"

// ── Tipos ──────────────────────────────────────────────────────────────────────

type UserType = "PF" | "PJ"

interface FormErrors {
  cpf?:                 string
  cnpj?:                string
  cpfResponsavel?:      string
  responsavelLegal?:    string
  declaracaoVinculoPJ?: string
  phone?:               string
  city?:                string
  state?:               string
  form?:                string
}

// ── Helpers ────────────────────────────────────────────────────────────────────

// ── Sub-componente: campo de texto ─────────────────────────────────────────────
// Segue a convenção visual de register.tsx (label uppercase pequena).

function FieldInput({
  label,
  error,
  helper,
  required,
  tokens,
  mode,
  ...props
}: {
  label: string
  error?: string
  helper?: string
  required?: boolean
  tokens: Tokens
  mode: "light" | "dark"
} & TextInputProps) {
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: tokens.muted }]}>
        {label}
        {required && <Text style={{ color: tokens.error }}> *</Text>}
      </Text>
      <TextInput
        placeholderTextColor={tokens.muted}
        accessibilityLabel={label}
        style={[
          s.input,
          {
            borderColor: error ? tokens.error : tokens.border,
            backgroundColor: error
              ? mode === "dark" ? "#2C1515" : "#FFF5F5"
              : tokens.bg,
            color: tokens.text,
          },
        ]}
        {...props}
      />
      {helper && !error && (
        <Text style={[s.helper, { color: tokens.muted }]}>{helper}</Text>
      )}
      {error && (
        <Text style={[s.fieldError, { color: tokens.error }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  )
}

// ── Sub-componente: seletor de tipo de conta ────────────────────────────────────
// Verbatim de CompleteRegistrationForm.tsx — dois botões "Pessoa Física" / "Empresa (PJ)".

function UserTypePicker({
  value,
  onChange,
  disabled,
  tokens,
}: {
  value: UserType
  onChange: (t: UserType) => void
  disabled: boolean
  tokens: Tokens
}) {
  return (
    <View style={s.field}>
      <Text style={[s.label, { color: tokens.muted }]}>Tipo de conta</Text>
      <View style={s.typeRow}>
        {(["PF", "PJ"] as const).map((type) => {
          const active = value === type
          return (
            <TouchableOpacity
              key={type}
              onPress={() => onChange(type)}
              disabled={disabled}
              activeOpacity={0.8}
              style={[
                s.typeBtn,
                {
                  borderColor: active ? tokens.green : tokens.border,
                  backgroundColor: active ? `${tokens.green}1A` : tokens.surface,
                },
              ]}
              accessibilityRole="button"
              accessibilityState={{ selected: active }}
              accessibilityLabel={type === "PF" ? "Pessoa Física" : "Empresa (PJ)"}
            >
              <Text
                style={[
                  s.typeBtnText,
                  { color: active ? tokens.green : tokens.muted },
                ]}
              >
                {type === "PF" ? "Pessoa Física" : "Empresa (PJ)"}
              </Text>
            </TouchableOpacity>
          )
        })}
      </View>
    </View>
  )
}

// ── Sub-componente: checkbox card (declaração PJ) ───────────────────────────────
// Mesmo padrão de register.tsx (ConsentCard).

function CheckboxCard({
  checked,
  error,
  tokens,
  onPress,
  children,
  accessibilityLabel,
}: {
  checked: boolean
  error?: string
  tokens: Tokens
  onPress: () => void
  children: React.ReactNode
  accessibilityLabel: string
}) {
  const borderColor = error ? tokens.error : checked ? tokens.green : tokens.border
  const bgColor = checked ? `${tokens.green}0D` : tokens.surface
  return (
    <View style={s.field}>
      <TouchableOpacity
        onPress={onPress}
        style={[s.consentCard, { borderColor, backgroundColor: bgColor }]}
        accessibilityRole="checkbox"
        accessibilityState={{ checked }}
        accessibilityLabel={accessibilityLabel}
        activeOpacity={0.8}
      >
        <View
          style={[
            s.checkbox,
            {
              borderColor: checked ? tokens.green : tokens.border,
              backgroundColor: checked ? tokens.green : tokens.bg,
            },
          ]}
        >
          {checked && <Text style={s.checkboxMark}>✓</Text>}
        </View>
        <Text style={[s.consentText, { color: tokens.text }]}>{children}</Text>
      </TouchableOpacity>
      {error && (
        <Text style={[s.fieldError, { color: tokens.error }]} accessibilityRole="alert">
          {error}
        </Text>
      )}
    </View>
  )
}

// ── Tela principal ─────────────────────────────────────────────────────────────

export default function CompletarCadastroScreen() {
  const { tokens, mode } = useTheme()
  // callback: rota para navegar após o cadastro ser concluído com sucesso.
  // Espelha ?callbackUrl= do site (app/dashboard/page.tsx linha 197 e _PriceCalc.tsx linha 475).
  // Quando ausente, router.back() replica o comportamento anterior.
  const { callback } = useLocalSearchParams<{ callback?: string }>()

  // Estado — espelha o useState de CompleteRegistrationForm.tsx
  const [userType,          setUserType]          = useState<UserType>("PF")
  const [cpf,               setCpf]               = useState("")
  const [cnpj,              setCnpj]              = useState("")
  const [cpfResponsavel,    setCpfResponsavel]    = useState("")
  const [responsavelLegal,  setResponsavelLegal]  = useState("")
  const [declaracaoPJ,      setDeclaracaoPJ]      = useState(false)
  const [phone,             setPhone]             = useState("")
  const [zipCode,           setZipCode]           = useState("")
  const [zipLoading,        setZipLoading]        = useState(false)
  const [zipError,          setZipError]          = useState("")
  const [zipFilled,         setZipFilled]         = useState(false)
  const lastFetchedCep = useRef("")
  const cepSeq         = useRef(0)
  const [street,            setStreet]            = useState("")
  const [neighborhood,      setNeighborhood]      = useState("")
  const [city,              setCity]              = useState("")
  const [stateUF,           setStateUF]           = useState("")
  const [errors,            setErrors]            = useState<FormErrors>({})
  const [loading,           setLoading]           = useState(false)

  // ── CEP com auto-fill ViaCEP — verbatim de CompleteRegistrationForm ────────

  async function handleCepBlur() {
    const digits = zipCode.replace(/\D/g, "")
    if (digits.length !== 8 || digits === lastFetchedCep.current) return

    // Descarta respostas obsoletas: dois blurs com CEPs diferentes em voo podem
    // voltar fora de ordem, e a resposta antiga sobrescreveria o endereço certo.
    // Mesmo guard de components/home/FounderCaptureForm.tsx.
    const seq = ++cepSeq.current
    setZipLoading(true)
    setZipError("")
    setZipFilled(false)
    try {
      const addr = await fetchAddressByCep(digits)
      if (seq !== cepSeq.current) return // chegou atrasada — ignora
      if (!addr) {
        setZipError("CEP não encontrado.")
        return
      }
      lastFetchedCep.current = digits
      if (addr.street)       setStreet(addr.street)
      if (addr.neighborhood) setNeighborhood(addr.neighborhood)
      if (addr.city)         setCity(addr.city)
      if (addr.state)        setStateUF(addr.state)
      setZipFilled(true)
      setErrors((p) => ({ ...p, city: undefined, state: undefined }))
    } catch {
      if (seq !== cepSeq.current) return
      setZipError("Erro ao consultar o CEP. Verifique sua conexão.")
    } finally {
      if (seq === cepSeq.current) setZipLoading(false)
    }
  }

  // ── Validação client-side — verbatim de CompleteRegistrationForm ───────────

  function validate(): FormErrors {
    const errs: FormErrors = {}
    if (userType === "PF" && !cpf)  errs.cpf = "CPF obrigatório"
    if (userType === "PJ") {
      if (!cnpj)                               errs.cnpj             = "CNPJ obrigatório"
      if (!cpfResponsavel)                     errs.cpfResponsavel   = "CPF do responsável legal obrigatório"
      if (responsavelLegal.trim().length < 3)  errs.responsavelLegal = "Informe o nome do responsável legal"
      if (!declaracaoPJ)                       errs.declaracaoVinculoPJ = "É necessário aceitar a declaração."
    }
    if (!city.trim())        errs.city  = "Cidade obrigatória"
    if (stateUF.length !== 2) errs.state = "UF inválida (2 letras)"
    return errs
  }

  // ── Submit — verbatim de CompleteRegistrationForm ──────────────────────────

  async function handleSubmit() {
    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      return
    }
    setErrors({})
    setLoading(true)

    const phoneE164 = phoneToE164(phone)

    const body = {
      userType,
      cpf:                 userType === "PF" ? cpf.replace(/\D/g, "") : undefined,
      cnpj:                userType === "PJ" ? cnpj.replace(/\D/g, "") : undefined,
      cpfResponsavel:      userType === "PJ" ? cpfResponsavel.replace(/\D/g, "") : undefined,
      responsavelLegal:    userType === "PJ" ? responsavelLegal.trim() : undefined,
      declaracaoVinculoPJ: userType === "PJ" ? declaracaoPJ : undefined,
      phone:               phoneE164,
      city:                city.trim(),
      state:               stateUF.trim().toUpperCase(),
      zipCode:             zipCode.replace(/\D/g, "") || undefined,
      street:              street.trim() || undefined,
      neighborhood:        neighborhood.trim() || undefined,
    }

    try {
      await apiFetch("/api/users/me/complete-registration", {
        method: "PATCH",
        body:   JSON.stringify(body),
      })
      // Cadastro concluído.
      // Com callback (ex.: /itens/[id] que precisava de cadastro completo), navega
      // diretamente para o destino — espelha ?callbackUrl= do site.
      // Sem callback, volta para a tela anterior (dashboard ou outra).
      if (callback) {
        router.replace(callback as never)
      } else {
        router.back()
      }
    } catch (e: unknown) {
      setLoading(false)
      const err = e as { code?: string; status?: number; message?: string; details?: Record<string, string[]> }

      if (err.code === "VALIDATION_ERROR" && err.details) {
        const fieldKeys = new Set([
          "cpf", "cnpj", "cpfResponsavel", "responsavelLegal",
          "declaracaoVinculoPJ", "phone", "city", "state",
        ])
        const mapped: FormErrors = {}
        for (const [k, msgs] of Object.entries(err.details)) {
          if (fieldKeys.has(k)) (mapped as Record<string, string>)[k] = msgs[0]
          else mapped.form = msgs[0]
        }
        setErrors(mapped)
        return
      }

      // Mensagens de erro verbatim de CompleteRegistrationForm.tsx
      const MSG: Record<string, string> = {
        CPF_ALREADY_EXISTS:  "CPF já cadastrado em outra conta.",
        CNPJ_ALREADY_EXISTS: "CNPJ já cadastrado em outra conta.",
        CNPJ_INACTIVE:       "Este CNPJ não está ativo na Receita Federal.",
        CNPJ_NOT_FOUND:      "CNPJ não encontrado na Receita Federal.",
        RATE_LIMITED:        "Muitas tentativas. Aguarde um momento e tente novamente.",
        NOT_FOUND:           "Sua sessão expirou. Saia da conta e entre novamente para concluir o cadastro.",
        UNAUTHORIZED:        "Sua sessão expirou. Saia da conta e entre novamente para concluir o cadastro.",
      }
      const code = err.code ?? ""
      setErrors({
        form: MSG[code] ?? "Erro ao concluir o cadastro. Tente novamente.",
      })
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <SafeAreaView style={[s.safeArea, { backgroundColor: tokens.bg }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView
        style={s.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={s.flex}
          contentContainerStyle={s.content}
          keyboardShouldPersistTaps="handled"
        >
          {/* Botão voltar — verbatim de register.tsx */}
          <TouchableOpacity
            style={s.backLink}
            onPress={() => router.back()}
            accessibilityRole="link"
            accessibilityLabel="Voltar para o início"
          >
            <Text style={[s.backLinkText, { color: tokens.muted }]}>← Voltar para o início</Text>
          </TouchableOpacity>

          <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>

            {/* Título — verbatim de CompleteRegistrationForm.tsx */}
            <Text style={[s.cardTitle, { color: tokens.navy }]}>Completar cadastro</Text>
            <Text style={[s.cardSubtitle, { color: tokens.muted }]}>
              Falta pouco! Precisamos do seu documento e endereço para você anunciar ou alugar com segurança.
            </Text>

            {/* Erro de formulário — verbatim de CompleteRegistrationForm.tsx */}
            {errors.form && (
              <View
                style={[
                  s.errorBox,
                  {
                    backgroundColor: mode === "dark" ? "#2C1515" : "#FEE2E2",
                    borderColor:     mode === "dark" ? "#5B2020" : "#FECACA",
                  },
                ]}
                accessibilityRole="alert"
              >
                <Text style={[s.errorText, { color: tokens.error }]}>{errors.form}</Text>
              </View>
            )}

            {/* Tipo de conta */}
            <UserTypePicker
              value={userType}
              onChange={(t) => { setUserType(t); setErrors({}) }}
              disabled={loading}
              tokens={tokens}
            />

            {/* CPF (PF) ou CNPJ (PJ) — verbatim de CompleteRegistrationForm.tsx */}
            {userType === "PF" ? (
              <FieldInput
                label="CPF"
                placeholder="000.000.000-00"
                keyboardType="numeric"
                autoComplete="off"
                required
                tokens={tokens}
                mode={mode}
                value={cpf}
                onChangeText={(v) => { setCpf(maskCPF(v)); setErrors((p) => ({ ...p, cpf: undefined })) }}
                error={errors.cpf}
                editable={!loading}
              />
            ) : (
              <FieldInput
                label="CNPJ"
                placeholder="00.000.000/0001-00"
                keyboardType="numeric"
                autoComplete="off"
                helper="Validamos a situação cadastral na Receita Federal."
                required
                tokens={tokens}
                mode={mode}
                value={cnpj}
                onChangeText={(v) => { setCnpj(maskCNPJ(v)); setErrors((p) => ({ ...p, cnpj: undefined })) }}
                error={errors.cnpj}
                editable={!loading}
              />
            )}

            {/* Responsável legal — exigido para PJ (KYB leve, ADR-024) — verbatim */}
            {userType === "PJ" && (
              <>
                <FieldInput
                  label="CPF do responsável legal"
                  placeholder="000.000.000-00"
                  keyboardType="numeric"
                  autoComplete="off"
                  required
                  tokens={tokens}
                  mode={mode}
                  value={cpfResponsavel}
                  onChangeText={(v) => {
                    setCpfResponsavel(maskCPF(v))
                    setErrors((p) => ({ ...p, cpfResponsavel: undefined }))
                  }}
                  error={errors.cpfResponsavel}
                  editable={!loading}
                />
                <FieldInput
                  label="Nome do responsável legal"
                  placeholder="Nome completo de quem representa a empresa"
                  autoComplete="name"
                  required
                  tokens={tokens}
                  mode={mode}
                  value={responsavelLegal}
                  onChangeText={(v) => {
                    setResponsavelLegal(v)
                    setErrors((p) => ({ ...p, responsavelLegal: undefined }))
                  }}
                  error={errors.responsavelLegal}
                  editable={!loading}
                />
                <CheckboxCard
                  checked={declaracaoPJ}
                  error={errors.declaracaoVinculoPJ}
                  tokens={tokens}
                  accessibilityLabel="Declaração de vínculo com a empresa"
                  onPress={() => {
                    setDeclaracaoPJ((v) => !v)
                    setErrors((p) => ({ ...p, declaracaoVinculoPJ: undefined }))
                  }}
                >
                  {PJ_DECLARATION_TEXT}
                </CheckboxCard>
              </>
            )}

            {/* Telefone — verbatim de CompleteRegistrationForm.tsx */}
            <FieldInput
              label="Telefone"
              placeholder="(84) 99999-0000"
              keyboardType="phone-pad"
              autoComplete="tel"
              helper="Opcional — se preencher, inclua o DDD"
              tokens={tokens}
              mode={mode}
              value={phone}
              onChangeText={(v) => setPhone(maskPhone(v))}
              editable={!loading}
            />

            {/* CEP com auto-fill ViaCEP — verbatim de CompleteRegistrationForm.tsx */}
            <View style={s.field}>
              <Text style={[s.label, { color: tokens.muted }]}>CEP</Text>
              <View style={s.inputRow}>
                <TextInput
                  placeholder="00000-000"
                  keyboardType="numeric"
                  placeholderTextColor={tokens.muted}
                  accessibilityLabel="CEP"
                  style={[
                    s.input,
                    s.inputFlex,
                    {
                      borderColor: tokens.border,
                      backgroundColor: tokens.bg,
                      color: tokens.text,
                    },
                  ]}
                  value={zipCode}
                  onChangeText={(v) => {
                    setZipCode(maskCEP(v))
                    setZipError("")
                    setZipFilled(false)
                  }}
                  onBlur={handleCepBlur}
                  editable={!loading && !zipLoading}
                />
                {zipLoading && (
                  <ActivityIndicator
                    size="small"
                    color={tokens.green}
                    style={s.zipSpinner}
                  />
                )}
              </View>
              {zipFilled && !zipError && (
                <Text style={[s.helper, { color: tokens.success }]}>
                  ✓ Endereço preenchido automaticamente
                </Text>
              )}
              {!zipFilled && !zipError && (
                <Text style={[s.helper, { color: tokens.muted }]}>
                  Opcional — preenche o endereço automaticamente
                </Text>
              )}
              {zipError !== "" && (
                <Text style={[s.fieldError, { color: tokens.error }]} accessibilityRole="alert">
                  {zipError}
                </Text>
              )}
            </View>

            {/* Rua — verbatim de CompleteRegistrationForm.tsx */}
            <FieldInput
              label="Rua"
              placeholder="Ex: Av. Paulista, 1000"
              autoComplete="street-address"
              helper="Opcional"
              tokens={tokens}
              mode={mode}
              value={street}
              onChangeText={setStreet}
              editable={!loading}
            />

            {/* Bairro — verbatim de CompleteRegistrationForm.tsx */}
            <FieldInput
              label="Bairro"
              placeholder=""
              helper="Opcional — preenchido pelo CEP quando disponível"
              tokens={tokens}
              mode={mode}
              value={neighborhood}
              onChangeText={setNeighborhood}
              editable={!loading}
            />

            {/* Cidade / Estado — verbatim de CompleteRegistrationForm.tsx (grid 2/1) */}
            <View style={s.cityRow}>
              <View style={s.cityField}>
                <FieldInput
                  label="Cidade"
                  placeholder=""
                  autoComplete="address-line1"
                  required
                  tokens={tokens}
                  mode={mode}
                  value={city}
                  onChangeText={(v) => {
                    setCity(v)
                    setErrors((p) => ({ ...p, city: undefined }))
                  }}
                  error={errors.city}
                  editable={!loading}
                />
              </View>
              <View style={s.stateField}>
                <FieldInput
                  label="Estado"
                  placeholder="UF"
                  maxLength={2}
                  autoCapitalize="characters"
                  required
                  tokens={tokens}
                  mode={mode}
                  value={stateUF}
                  onChangeText={(v) => {
                    setStateUF(v.toUpperCase())
                    setErrors((p) => ({ ...p, state: undefined }))
                  }}
                  error={errors.state}
                  editable={!loading}
                />
              </View>
            </View>

            {/* LGPD — verbatim de CompleteRegistrationForm.tsx */}
            <Text
              style={[
                s.lgpdText,
                {
                  color: tokens.muted,
                  backgroundColor: mode === "dark" ? tokens.disabledBg : "#F1F5F9",
                },
              ]}
            >
              Coletamos CPF/CNPJ e endereço para identificação, segurança jurídica dos contratos e
              logística de retirada/devolução — base legal: execução de contrato (LGPD art. 7º, V).
              Detalhes na{" "}
              <Text
                style={{ color: tokens.green, fontWeight: "600" }}
                onPress={() => Linking.openURL(`${API_URL}/privacidade`)}
              >
                Política de Privacidade
              </Text>
              .
            </Text>

            {/* Botão Concluir cadastro — verbatim de CompleteRegistrationForm.tsx */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.85}
              style={[
                s.btnPrimary,
                { backgroundColor: tokens.green },
                loading && s.btnDisabled,
              ]}
              accessibilityRole="button"
              accessibilityLabel="Concluir cadastro"
              accessibilityState={{ disabled: loading }}
            >
              <Text style={s.btnText}>
                {loading ? "Concluindo…" : "Concluir cadastro"}
              </Text>
            </TouchableOpacity>

            {/* DPO — verbatim de CompleteRegistrationForm.tsx */}
            <Text style={[s.dpoText, { color: tokens.muted }]}>
              Encarregado de Dados (DPO):{" "}
              <Text
                style={{ color: tokens.green }}
                onPress={() => Linking.openURL(`mailto:${DPO_EMAIL}`)}
              >
                {DPO_EMAIL}
              </Text>
            </Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  safeArea:      { flex: 1 },
  flex:          { flex: 1 },
  content:       { flexGrow: 1, paddingHorizontal: 24, paddingVertical: 24 },
  backLink:      { alignSelf: "flex-start", minHeight: 32, marginBottom: 12, justifyContent: "center" },
  backLinkText:  { fontSize: 13 },
  card:          { borderRadius: 16, borderWidth: 1, padding: 24 },
  cardTitle:     { fontSize: 22, fontFamily: "Montserrat_700Bold", textAlign: "center", marginBottom: 4 },
  cardSubtitle:  { fontSize: 13, textAlign: "center", marginBottom: 16, lineHeight: 18, color: "#64748B" },
  errorBox:      { borderWidth: 1, borderRadius: 8, padding: 12, marginBottom: 16 },
  errorText:     { fontSize: 13 },
  field:         { marginBottom: 16 },
  label:         { fontSize: 11, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5, marginBottom: 6 },
  input:         { borderWidth: 1, borderRadius: 10, paddingHorizontal: 16, minHeight: 48, fontSize: 14 },
  inputFlex:     { flex: 1 },
  inputRow:      { flexDirection: "row", alignItems: "center" },
  zipSpinner:    { marginLeft: 8 },
  helper:        { fontSize: 11, marginTop: 4 },
  fieldError:    { fontSize: 11, marginTop: 4 },
  typeRow:       { flexDirection: "row", gap: 8 },
  typeBtn:       { flex: 1, minHeight: 44, borderWidth: 1, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  typeBtnText:   { fontSize: 13, fontWeight: "600" },
  consentCard:   { flexDirection: "row", alignItems: "flex-start", gap: 12, borderWidth: 1, borderRadius: 10, padding: 12 },
  checkbox:      { width: 20, height: 20, borderRadius: 5, borderWidth: 1.5, marginTop: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  checkboxMark:  { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  consentText:   { flex: 1, fontSize: 12, lineHeight: 17 },
  cityRow:       { flexDirection: "row", gap: 12 },
  cityField:     { flex: 2 },
  stateField:    { flex: 1 },
  lgpdText:      { fontSize: 11, lineHeight: 16, borderRadius: 8, padding: 10, marginBottom: 16 },
  btnPrimary:    { borderRadius: 10, minHeight: 52, alignItems: "center", justifyContent: "center", marginTop: 4 },
  btnDisabled:   { opacity: 0.55 },
  btnText:       { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  dpoText:       { fontSize: 11, textAlign: "center", marginTop: 12 },
})
