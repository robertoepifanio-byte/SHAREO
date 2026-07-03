// Fonte: app/kyc/page.tsx + lib/legal/biometric-consent-text.ts + app/api/users/me/id-verification
// Tela de verificação de identidade (KYC) — StyleSheet + tokens, funcionalidade preservada.
// LGPD: texto canônico de consentimento replicado de lib/legal/biometric-consent-text.ts. Manter IDÊNTICO.
//
// Fluxo:
//  1. Usuário seleciona foto do documento (frente) via expo-image-picker
//  2. Usuário seleciona selfie segurando o documento
//  3. Se biometricConsentRequired=ON (flag OFF por padrão), exibe texto de
//     consentimento biométrico e requer aceite antes do envio
//  4. POST /api/users/me/id-verification com FormData (multipart)
//  5. Status PENDING → aguarda análise da equipe

import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  StyleSheet,
  Platform,
} from "react-native"
import { Image } from "expo-image"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ─── Texto canônico de consentimento biométrico ────────────────────────────
// Replicado de lib/legal/biometric-consent-text.ts — manter IDÊNTICO ao web.
const BIOMETRIC_CONSENT_TITLE = "Autorização para uso da sua selfie (dado biométrico)"

const BIOMETRIC_CONSENT_TEXT = [
  "1. O que vamos coletar. Uma fotografia do seu rosto (selfie), capturada por você neste fluxo, segurando o documento de identidade que já foi enviado na etapa anterior.",
  "2. Por que essa imagem é tratada como dado sensível. A LGPD classifica imagens faciais usadas para confirmar a identidade de uma pessoa como dado pessoal sensível de natureza biométrica (art. 5º, II e art. 11). Por isso, ela recebe uma proteção reforçada e não pode ser tratada com base em \"interesse legítimo\": a própria lei exige que você consinta especificamente para esta finalidade.",
  "3. Finalidade. A sua selfie será utilizada exclusivamente para: confirmar que você é a pessoa do documento enviado na etapa anterior; e prevenir fraudes e o uso indevido de identidades de terceiros na plataforma. Sem uso secundário: sua selfie não será usada para reconhecimento facial em outras situações, para marketing, para treinar modelos de inteligência artificial, para enriquecer seu perfil público, nem será compartilhada com terceiros que não a própria equipe de verificação da ShareO.",
  "4. Base legal. Tratamento realizado com base no art. 11, inciso II, alínea \"a\" da LGPD (consentimento específico e destacado do titular para finalidades específicas).",
  "5. Quem vai ter acesso. Você, pelo seu painel \"Minha Conta\"; e apenas analistas autorizados da equipe ShareO (perfil SuperAdmin ou Operacional), exclusivamente para conduzir a verificação de identidade. Todo acesso de um analista à sua selfie é registrado em log de auditoria interno. Em hipótese alguma a selfie será publicada no seu perfil, em anúncios ou em qualquer área visível a outros usuários.",
  "10. Consequências de não consentir. Você pode recusar sem qualquer penalidade na sua conta. Porém, a verificação de identidade exige a selfie. Sem ela, sua conta permanece não verificada, o que pode limitar funcionalidades específicas. Você continua podendo usar a ShareO nos limites de uma conta não verificada.",
].join("\n\n")

const BIOMETRIC_CONSENT_CHECKBOX =
  "Eu li e consinto especificamente com o tratamento da minha selfie como dado pessoal sensível de natureza biométrica, exclusivamente para a finalidade de verificação da minha identidade na ShareO, conforme o texto acima e nos termos do art. 11, II, \"a\" da LGPD."

// ─── Tipos ────────────────────────────────────────────────────────────────────
interface MeResponse {
  data: {
    idVerificationStatus: string | null
    isVerified: boolean
  }
}

type UploadState = "idle" | "uploading" | "success" | "error"

// ─── Componente ───────────────────────────────────────────────────────────────
export default function KycScreen() {
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const { tokens } = useTheme()

  const [docAsset,     setDocAsset]     = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [selfieAsset,  setSelfieAsset]  = useState<ImagePicker.ImagePickerAsset | null>(null)
  const [uploadState,  setUploadState]  = useState<UploadState>("idle")
  const [error,        setError]        = useState<string | null>(null)
  // Consentimento biométrico — exibido apenas quando o servidor retorna 412
  const [needsConsent, setNeedsConsent] = useState(false)
  const [consentGiven, setConsentGiven] = useState(false)

  // Busca status atual de verificação
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me-kyc"],
    queryFn:  () => apiFetch<MeResponse>("/api/users/me"),
    enabled:  !!user,
    select:   (d) => d.data,
  })

  // ── Selecionar imagem ──────────────────────────────────────────────────────
  async function pickImage(target: "document" | "selfie") {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para enviar seus documentos.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: target === "selfie", // crop square para selfie
      aspect: target === "selfie" ? [1, 1] : undefined,
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]) {
      if (target === "document") setDocAsset(result.assets[0])
      else setSelfieAsset(result.assets[0])
      setError(null)
    }
  }

  // ── Envio ──────────────────────────────────────────────────────────────────
  async function handleSubmit(includeConsent = false) {
    if (!docAsset || !selfieAsset) {
      setError("Selecione o documento e a selfie antes de enviar.")
      return
    }

    setUploadState("uploading")
    setError(null)

    try {
      const storedTokens = await getTokens()

      const formData = new FormData()
      formData.append("document", {
        uri:  docAsset.uri,
        name: `document-${Date.now()}.jpg`,
        type: docAsset.mimeType ?? "image/jpeg",
      } as unknown as Blob)
      formData.append("selfie", {
        uri:  selfieAsset.uri,
        name: `selfie-${Date.now()}.jpg`,
        type: selfieAsset.mimeType ?? "image/jpeg",
      } as unknown as Blob)

      // biometricConsent enviado como string booleana no FormData
      formData.append("biometricConsent", includeConsent ? "true" : "false")

      const res = await fetch(`${API_URL}/api/users/me/id-verification`, {
        method: "POST",
        headers: {
          ...(storedTokens ? { Authorization: `Bearer ${storedTokens.accessToken}` } : {}),
          // NÃO definir Content-Type — boundary é gerado automaticamente
        },
        body: formData,
      })

      const json = await res.json().catch(() => ({}))

      if (res.status === 412 && (json as { error?: { code?: string } })?.error?.code === "BIOMETRIC_CONSENT_REQUIRED") {
        // Servidor exige consentimento biométrico (flag ON) — exibe painel de consentimento
        setNeedsConsent(true)
        setUploadState("idle")
        return
      }

      if (res.status === 409) {
        const code = (json as { error?: { code?: string } })?.error?.code
        if (code === "ALREADY_VERIFIED") {
          setUploadState("success")
        } else if (code === "ALREADY_PENDING") {
          setUploadState("success") // trata pending como "enviado"
          setError("Documentos já enviados. Aguarde a análise da equipe.")
        }
        return
      }

      if (!res.ok) {
        throw new Error((json as { error?: { message?: string } })?.error?.message ?? `Erro ${res.status}`)
      }

      setUploadState("success")
    } catch (e) {
      setUploadState("error")
      setError(e instanceof Error ? e.message : "Falha ao enviar documentos. Tente novamente.")
    }
  }

  // ── Guard: não autenticado ──────────────────────────────────────────────────
  if (!user) {
    return (
      <View
        style={[
          s.center,
          { backgroundColor: tokens.bg, paddingTop: insets.top, paddingHorizontal: 24 },
        ]}
      >
        <Text style={{ fontSize: 48 }}>🪪</Text>
        <Text style={[s.guardTitle, { color: tokens.navy }]}>
          Faça login para verificar sua identidade
        </Text>
        <TouchableOpacity
          style={[s.ctaBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.ctaBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (meLoading) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color={tokens.green} />
      </View>
    )
  }

  const verificationStatus = meData?.idVerificationStatus

  const isSubmitDisabled =
    uploadState === "uploading" ||
    !docAsset || !selfieAsset ||
    (needsConsent && !consentGiven)

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:        insets.top + 8,
            backgroundColor:   tokens.surface,
            borderBottomColor: tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Text style={[s.backBtnText, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Verificação de identidade</Text>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* ── Status atual ── */}
        {verificationStatus === "VERIFIED" && (
          <View
            style={[s.statusBox, { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" }]}
            accessible
            accessibilityLiveRegion="polite"
          >
            <Text style={[s.statusTitle, { color: "#065F46" }]}>Identidade verificada</Text>
            <Text style={[s.statusText, { color: "#047857" }]}>
              Sua identidade foi verificada pela equipe ShareO.
            </Text>
          </View>
        )}
        {verificationStatus === "PENDING" && (
          <View
            style={[s.statusBox, { borderColor: "#FDE68A", backgroundColor: "#FFFBEB" }]}
            accessible
            accessibilityLiveRegion="polite"
          >
            <Text style={[s.statusTitle, { color: "#92400E" }]}>Em análise</Text>
            <Text style={[s.statusText, { color: "#B45309" }]}>
              Documentos enviados. Nossa equipe está analisando — você receberá um e-mail em até 2 dias úteis.
            </Text>
          </View>
        )}
        {verificationStatus === "REJECTED" && (
          <View
            style={[s.statusBox, { borderColor: "#FECACA", backgroundColor: "#FEF2F2" }]}
            accessibilityRole="alert"
          >
            <Text style={[s.statusTitle, { color: "#991B1B" }]}>Documentos rejeitados</Text>
            <Text style={[s.statusText, { color: "#B91C1C" }]}>
              Por favor envie novos documentos mais legíveis.
            </Text>
          </View>
        )}

        {/* ── Sucesso pós-envio ── */}
        {uploadState === "success" && verificationStatus !== "VERIFIED" && (
          <View
            style={[s.statusBox, { borderColor: "#A7F3D0", backgroundColor: "#ECFDF5" }]}
            accessible
            accessibilityLiveRegion="polite"
          >
            <Text style={[s.statusTitle, { color: "#065F46" }]}>Documentos enviados!</Text>
            <Text style={[s.statusText, { color: "#047857" }]}>
              Nossa equipe analisará em até 2 dias úteis. Você receberá uma notificação por e-mail.
            </Text>
          </View>
        )}

        {/* ── Explicação + formulário ── */}
        {verificationStatus !== "VERIFIED" && verificationStatus !== "PENDING" && uploadState !== "success" && (
          <>
            <View style={[s.infoBox, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
              <Text style={[s.infoTitle, { color: tokens.navy }]}>Por que verificar sua identidade?</Text>
              <Text style={[s.infoText, { color: tokens.muted }]}>
                A verificação aumenta a confiança entre locatários e proprietários, tornando o ShareO mais seguro para todos. Itens de proprietários verificados têm maior taxa de reserva.
              </Text>
            </View>

            {/* ── Consentimento biométrico (exibido apenas quando flag ON no servidor) ── */}
            {needsConsent && (
              <View style={s.consentBox}>
                <Text style={s.consentTitle}>{BIOMETRIC_CONSENT_TITLE}</Text>
                <ScrollView style={s.consentScroll} nestedScrollEnabled>
                  <Text style={s.consentText}>{BIOMETRIC_CONSENT_TEXT}</Text>
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setConsentGiven((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentGiven }}
                  accessibilityLabel={BIOMETRIC_CONSENT_CHECKBOX}
                  style={s.checkboxRow}
                >
                  <View
                    style={[
                      s.checkbox,
                      consentGiven
                        ? { borderColor: tokens.green, backgroundColor: tokens.green }
                        : { borderColor: "#D97706", backgroundColor: "#FFFFFF" },
                    ]}
                  >
                    {consentGiven && (
                      <Text style={{ fontSize: 11, fontWeight: "700", color: "#FFFFFF" }}>✓</Text>
                    )}
                  </View>
                  <Text style={s.checkboxLabel}>{BIOMETRIC_CONSENT_CHECKBOX}</Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Upload documento ── */}
            <View style={s.uploadGroup}>
              <Text style={[s.uploadLabel, { color: tokens.muted }]}>
                1. Foto do documento (RG ou CNH){" "}
                <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("document")}
                accessibilityRole="button"
                accessibilityLabel="Selecionar foto do documento"
                style={[
                  s.uploadBtn,
                  {
                    backgroundColor: tokens.surface,
                    borderColor:     tokens.border,
                    height:          docAsset ? undefined : 100,
                  },
                ]}
              >
                {docAsset ? (
                  <View style={s.imagePreviewWrap}>
                    <Image
                      source={{ uri: docAsset.uri }}
                      style={s.imagePreview}
                      contentFit="cover"
                      accessibilityLabel="Foto do documento selecionada"
                    />
                    <View style={s.changeOverlay}>
                      <Text style={s.changeText}>Alterar</Text>
                    </View>
                  </View>
                ) : (
                  <View style={s.uploadPlaceholder}>
                    <Text style={{ fontSize: 32 }}>🪪</Text>
                    <Text style={[s.uploadPlaceholderPrimary, { color: tokens.green }]}>
                      Selecionar documento
                    </Text>
                    <Text style={[s.uploadPlaceholderSub, { color: tokens.muted }]}>
                      RG, CNH ou Passaporte
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Upload selfie ── */}
            <View style={s.uploadGroup}>
              <Text style={[s.uploadLabel, { color: tokens.muted }]}>
                2. Selfie segurando o documento{" "}
                <Text style={{ color: "#EF4444" }}>*</Text>
              </Text>
              <Text style={[s.uploadHint, { color: tokens.muted }]}>
                Tire uma selfie segurando o mesmo documento ao lado do seu rosto. Boa iluminação, sem óculos escuros.
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("selfie")}
                accessibilityRole="button"
                accessibilityLabel="Selecionar selfie"
                style={[
                  s.uploadBtn,
                  {
                    backgroundColor: tokens.surface,
                    borderColor:     tokens.border,
                    height:          selfieAsset ? undefined : 100,
                  },
                ]}
              >
                {selfieAsset ? (
                  <View style={s.imagePreviewWrap}>
                    <Image
                      source={{ uri: selfieAsset.uri }}
                      style={s.imagePreview}
                      contentFit="cover"
                      accessibilityLabel="Selfie selecionada"
                    />
                    <View style={s.changeOverlay}>
                      <Text style={s.changeText}>Alterar</Text>
                    </View>
                  </View>
                ) : (
                  <View style={s.uploadPlaceholder}>
                    <Text style={{ fontSize: 32 }}>🤳</Text>
                    <Text style={[s.uploadPlaceholderPrimary, { color: tokens.green }]}>
                      Tirar selfie
                    </Text>
                    <Text style={[s.uploadPlaceholderSub, { color: tokens.muted }]}>
                      Com o documento ao lado do rosto
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Aviso LGPD ── */}
            <View
              style={[
                s.lgpdBox,
                { backgroundColor: tokens.surface, borderColor: tokens.border },
              ]}
            >
              <Text style={[s.lgpdText, { color: tokens.muted }]}>
                Seus documentos são armazenados de forma segura e criptografada. Acesso restrito à equipe de verificação da ShareO. Você pode solicitar a exclusão a qualquer momento em Perfil.
              </Text>
            </View>

            {/* ── Erro ── */}
            {error && (
              <View style={s.errorBox} accessibilityRole="alert">
                <Text style={s.errorText}>{error}</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>

      {/* ── CTA fixo ── */}
      {verificationStatus !== "VERIFIED" && verificationStatus !== "PENDING" && uploadState !== "success" && (
        <View
          style={[
            s.ctaBar,
            {
              borderTopColor: tokens.border,
              backgroundColor: tokens.surface,
              paddingBottom: insets.bottom + 12,
            },
          ]}
        >
          <TouchableOpacity
            onPress={() => handleSubmit(consentGiven)}
            disabled={isSubmitDisabled}
            accessibilityRole="button"
            accessibilityLabel="Enviar documentos para verificação"
            accessibilityState={{ disabled: isSubmitDisabled }}
            style={[
              s.submitBtn,
              { backgroundColor: isSubmitDisabled ? `${tokens.green}80` : tokens.green },
            ]}
          >
            {uploadState === "uploading" ? (
              <View style={s.submitLoading}>
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text style={s.submitBtnText}>Enviando...</Text>
              </View>
            ) : (
              <Text style={s.submitBtnText}>Enviar para verificação</Text>
            )}
          </TouchableOpacity>
          <Text style={[s.ctaFooter, { color: tokens.muted }]}>
            Análise em até 2 dias úteis · privacidade@shareo.com.br
          </Text>
        </View>
      )}
    </View>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:      { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText:  { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: "700" },

  // Guard
  guardTitle: { fontSize: 16, fontWeight: "600", marginTop: 12, marginBottom: 24, textAlign: "center" },

  // CTA guard
  ctaBtn:     { borderRadius: 12, paddingHorizontal: 32, paddingVertical: 12, marginTop: 20, minHeight: 44 },
  ctaBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },

  // Status banners
  statusBox:   { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 16 },
  statusTitle: { fontSize: 14, fontWeight: "700" },
  statusText:  { fontSize: 13, marginTop: 4, lineHeight: 20 },

  // Explicação
  infoBox:   { borderRadius: 12, borderWidth: 1, padding: 16, marginBottom: 20 },
  infoTitle: { fontSize: 13, fontWeight: "700", marginBottom: 8 },
  infoText:  { fontSize: 13, lineHeight: 20 },

  // Consentimento biométrico
  consentBox:   {
    borderRadius: 12, borderWidth: 1,
    borderColor: "#FDE68A", backgroundColor: "#FFFBEB",
    padding: 16, marginBottom: 20,
  },
  consentTitle: { fontSize: 13, fontWeight: "700", color: "#92400E", marginBottom: 8 },
  consentScroll:{ maxHeight: 192, marginBottom: 12 },
  consentText:  { fontSize: 11, lineHeight: 18, color: "#B45309" },
  checkboxRow:  { flexDirection: "row", alignItems: "flex-start", gap: 12 },
  checkbox:     { width: 20, height: 20, borderRadius: 4, borderWidth: 1.5, marginTop: 2, alignItems: "center", justifyContent: "center" },
  checkboxLabel:{ flex: 1, fontSize: 11, lineHeight: 16, color: "#92400E" },

  // Upload
  uploadGroup: { marginBottom: 16 },
  uploadLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.5, textTransform: "uppercase", marginBottom: 6 },
  uploadHint:  { fontSize: 12, lineHeight: 18, marginBottom: 8 },
  uploadBtn: {
    borderRadius: 12, borderWidth: 2, borderStyle: "dashed",
    alignItems: "center", justifyContent: "center", overflow: "hidden", minHeight: 44,
  },
  uploadPlaceholder:       { alignItems: "center", paddingVertical: 24 },
  uploadPlaceholderPrimary:{ fontSize: 14, fontWeight: "600", marginTop: 6 },
  uploadPlaceholderSub:    { fontSize: 11, marginTop: 2 },
  imagePreviewWrap:        { width: "100%" as unknown as number },
  imagePreview:            { width: "100%" as unknown as number, height: 192, borderRadius: 12 },
  changeOverlay:           { position: "absolute", bottom: 8, right: 8, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 20, paddingHorizontal: 12, paddingVertical: 4 },
  changeText:              { fontSize: 11, color: "#FFFFFF" },

  // LGPD
  lgpdBox:  { borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 20 },
  lgpdText: { fontSize: 11, lineHeight: 17 },

  // Erro
  errorBox:  { borderRadius: 12, borderWidth: 1, borderColor: "#FECACA", backgroundColor: "#FEF2F2", padding: 12, marginBottom: 16 },
  errorText: { fontSize: 13, color: "#B91C1C" },

  // CTA bar
  ctaBar:    { borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12 },
  submitBtn: { borderRadius: 12, minHeight: 52, alignItems: "center", justifyContent: "center" },
  submitLoading: { flexDirection: "row", alignItems: "center", gap: 8 },
  submitBtnText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  ctaFooter: { fontSize: 11, textAlign: "center", marginTop: 8 },
})
