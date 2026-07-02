/**
 * KycScreen — apps/mobile/app/kyc.tsx
 *
 * Tela de verificação de identidade (KYC) no app Android.
 * Espelha o fluxo web de /api/users/me/id-verification.
 *
 * Fluxo:
 *  1. Usuário seleciona foto do documento (frente) via expo-image-picker
 *  2. Usuário seleciona selfie segurando o documento
 *  3. Se biometricConsentRequired=ON (flag OFF por padrão), exibe texto de
 *     consentimento biométrico e requer aceite antes do envio
 *  4. POST /api/users/me/id-verification com FormData (multipart)
 *  5. Status PENDING → aguarda análise da equipe
 *
 * LGPD: texto canônico de consentimento replicado de
 * lib/legal/biometric-consent-text.ts. Manter IDÊNTICO.
 * A flag biometricConsentRequired vem do servidor (GET /api/users/me devolve
 * idVerificationStatus, mas não a flag). Para simplificar no MVP mobile,
 * sempre enviamos biometricConsent=false no FormData — o servidor ignora
 * quando a flag está OFF; quando ON, retorna 412 e exibimos o consentimento.
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from "react-native"
import { useState } from "react"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import * as ImagePicker from "expo-image-picker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL, getTokens } from "@/lib/api"
import { useAuth } from "@/lib/auth"

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
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)

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
  // Selfie sempre pela câmera ao vivo (não pela galeria) — permitir galeria aqui
  // possibilitaria enviar a foto de outra pessoa, comprometendo a verificação.
  async function pickImage(target: "document" | "selfie") {
    if (target === "selfie") {
      const { status } = await ImagePicker.requestCameraPermissionsAsync()
      if (status !== "granted") {
        Alert.alert("Permissão negada", "Precisamos de acesso à câmera para tirar sua selfie.")
        return
      }
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ["images"],
        cameraType: ImagePicker.CameraType.front,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.85,
      })
      if (!result.canceled && result.assets[0]) {
        setSelfieAsset(result.assets[0])
        setError(null)
      }
      return
    }

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permissão negada", "Precisamos de acesso à galeria para enviar seus documentos.")
      return
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      quality: 0.85,
    })
    if (!result.canceled && result.assets[0]) {
      setDocAsset(result.assets[0])
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
      const tokens = await getTokens()

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
          ...(tokens ? { Authorization: `Bearer ${tokens.accessToken}` } : {}),
          // NÃO definir Content-Type — boundary é gerado automaticamente
        },
        body: formData,
      })

      const json = await res.json().catch(() => ({}))

      if (res.status === 412 && json?.error?.code === "BIOMETRIC_CONSENT_REQUIRED") {
        // Servidor exige consentimento biométrico (flag ON) — exibe painel de consentimento
        setNeedsConsent(true)
        setUploadState("idle")
        return
      }

      if (res.status === 409) {
        const code = json?.error?.code
        if (code === "ALREADY_VERIFIED") {
          setUploadState("success")
        } else if (code === "ALREADY_PENDING") {
          setUploadState("success") // trata pending como "enviado"
          setError("Documentos já enviados. Aguarde a análise da equipe.")
        }
        return
      }

      if (!res.ok) {
        throw new Error(json?.error?.message ?? `Erro ${res.status}`)
      }

      setUploadState("success")
    } catch (e) {
      setUploadState("error")
      setError(e instanceof Error ? e.message : "Falha ao enviar documentos. Tente novamente.")
    }
  }

  // ── Guards ──────────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background px-6" style={{ paddingTop: insets.top }}>
        <Text className="text-5xl">🪪</Text>
        <Text className="mt-3 text-base font-semibold text-primary">Faça login para verificar sua identidade</Text>
        <TouchableOpacity
          className="mt-6 rounded-xl bg-brand px-8 py-3"
          onPress={() => router.push("/(auth)/login")}
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (meLoading) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  const verificationStatus = meData?.idVerificationStatus

  return (
    <View className="flex-1 bg-background">
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          className="min-h-[44px] min-w-[44px] items-center justify-center"
        >
          <Text className="text-2xl text-muted">‹</Text>
        </TouchableOpacity>
        <Text className="flex-1 text-lg font-bold text-primary">Verificação de identidade</Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* ── Status atual ── */}
        {verificationStatus === "VERIFIED" && (
          <View className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4" accessible accessibilityLiveRegion="polite">
            <Text className="text-base font-bold text-green-800">✓ Identidade verificada</Text>
            <Text className="mt-1 text-sm text-green-700">
              Sua identidade foi verificada pela equipe ShareO.
            </Text>
          </View>
        )}
        {verificationStatus === "PENDING" && (
          <View className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4" accessible accessibilityLiveRegion="polite">
            <Text className="text-base font-bold text-amber-800">Em análise</Text>
            <Text className="mt-1 text-sm text-amber-700">
              Documentos enviados. Nossa equipe está analisando — você receberá um e-mail em até 2 dias úteis.
            </Text>
          </View>
        )}
        {verificationStatus === "REJECTED" && (
          <View className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-4" accessibilityRole="alert">
            <Text className="text-base font-bold text-red-800">Documentos rejeitados</Text>
            <Text className="mt-1 text-sm text-red-700">
              Por favor envie novos documentos mais legíveis.
            </Text>
          </View>
        )}

        {/* ── Sucesso pós-envio ── */}
        {uploadState === "success" && verificationStatus !== "VERIFIED" && (
          <View className="mb-4 rounded-xl border border-green-200 bg-green-50 px-4 py-4" accessible accessibilityLiveRegion="polite">
            <Text className="text-base font-bold text-green-800">Documentos enviados!</Text>
            <Text className="mt-1 text-sm text-green-700">
              Nossa equipe analisará em até 2 dias úteis. Você receberá uma notificação por e-mail.
            </Text>
          </View>
        )}

        {/* ── Explicação ── */}
        {verificationStatus !== "VERIFIED" && verificationStatus !== "PENDING" && uploadState !== "success" && (
          <>
            <View className="mb-5 rounded-xl border border-brand/20 bg-emerald-50 p-4">
              <Text className="mb-2 text-sm font-bold text-primary">Por que verificar sua identidade?</Text>
              <Text className="text-sm leading-relaxed text-muted">
                A verificação aumenta a confiança entre locatários e proprietários, tornando o ShareO mais seguro para todos. Itens de proprietários verificados têm maior taxa de reserva.
              </Text>
            </View>

            {/* ── Consentimento biométrico (exibido apenas quando flag ON no servidor) ── */}
            {needsConsent && (
              <View className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4">
                <Text className="mb-2 text-sm font-bold text-amber-900">{BIOMETRIC_CONSENT_TITLE}</Text>
                <ScrollView className="max-h-48 mb-3" nestedScrollEnabled>
                  <Text className="text-xs leading-relaxed text-amber-800">
                    {BIOMETRIC_CONSENT_TEXT}
                  </Text>
                </ScrollView>
                <TouchableOpacity
                  onPress={() => setConsentGiven((v) => !v)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consentGiven }}
                  accessibilityLabel={BIOMETRIC_CONSENT_CHECKBOX}
                  className="flex-row items-start gap-3"
                >
                  <View
                    className={[
                      "mt-0.5 h-5 w-5 items-center justify-center rounded border",
                      consentGiven ? "border-brand bg-brand" : "border-amber-400 bg-white",
                    ].join(" ")}
                  >
                    {consentGiven && <Text className="text-xs font-bold text-white">✓</Text>}
                  </View>
                  <Text className="flex-1 text-xs leading-relaxed text-amber-900">
                    {BIOMETRIC_CONSENT_CHECKBOX}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* ── Upload documento ── */}
            <View className="mb-4">
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                1. Foto do documento (RG ou CNH) <Text className="text-red-500">*</Text>
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("document")}
                accessibilityRole="button"
                accessibilityLabel="Selecionar foto do documento"
                className="min-h-[44px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface"
                style={{ height: docAsset ? "auto" : 100 }}
              >
                {docAsset ? (
                  <View className="w-full">
                    <Image
                      source={{ uri: docAsset.uri }}
                      className="h-48 w-full rounded-xl"
                      resizeMode="cover"
                    />
                    <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1">
                      <Text className="text-xs text-white">Alterar</Text>
                    </View>
                  </View>
                ) : (
                  <View className="items-center py-6">
                    <Text className="text-3xl">🪪</Text>
                    <Text className="mt-1 text-sm font-semibold text-brand">Selecionar documento</Text>
                    <Text className="mt-0.5 text-xs text-muted">RG, CNH ou Passaporte</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Upload selfie ── */}
            <View className="mb-5">
              <Text className="mb-1.5 text-xs font-semibold uppercase tracking-wider text-slate-600">
                2. Selfie segurando o documento <Text className="text-red-500">*</Text>
              </Text>
              <Text className="mb-2 text-xs text-muted">
                Tire uma selfie segurando o mesmo documento ao lado do seu rosto. Boa iluminação, sem óculos escuros.
              </Text>
              <TouchableOpacity
                onPress={() => pickImage("selfie")}
                accessibilityRole="button"
                accessibilityLabel="Selecionar selfie"
                className="min-h-[44px] items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border bg-surface"
                style={{ height: selfieAsset ? "auto" : 100 }}
              >
                {selfieAsset ? (
                  <View className="w-full">
                    <Image
                      source={{ uri: selfieAsset.uri }}
                      className="h-48 w-full rounded-xl"
                      resizeMode="cover"
                    />
                    <View className="absolute bottom-2 right-2 rounded-full bg-black/60 px-3 py-1">
                      <Text className="text-xs text-white">Alterar</Text>
                    </View>
                  </View>
                ) : (
                  <View className="items-center py-6">
                    <Text className="text-3xl">🤳</Text>
                    <Text className="mt-1 text-sm font-semibold text-brand">Tirar selfie</Text>
                    <Text className="mt-0.5 text-xs text-muted">Com o documento ao lado do rosto</Text>
                  </View>
                )}
              </TouchableOpacity>
            </View>

            {/* ── Aviso LGPD ── */}
            <View className="mb-5 rounded-xl border border-border bg-surface p-3">
              <Text className="text-[11px] leading-relaxed text-muted">
                🔒 Seus documentos são armazenados de forma segura e criptografada. Acesso restrito à equipe de verificação da ShareO. Você pode solicitar a exclusão a qualquer momento em Perfil.
              </Text>
            </View>

            {/* ── Erro ── */}
            {error && (
              <View
                className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
                accessibilityRole="alert"
              >
                <Text className="text-sm text-red-700">{error}</Text>
              </View>
            )}
          </>
        )}

      </ScrollView>

      {/* ── CTA fixo ── */}
      {verificationStatus !== "VERIFIED" && verificationStatus !== "PENDING" && uploadState !== "success" && (
        <View
          className="border-t border-border bg-surface px-4 py-3"
          style={{ paddingBottom: insets.bottom + 12 }}
        >
          <TouchableOpacity
            onPress={() => handleSubmit(consentGiven)}
            disabled={
              uploadState === "uploading" ||
              !docAsset || !selfieAsset ||
              (needsConsent && !consentGiven)
            }
            accessibilityRole="button"
            accessibilityLabel="Enviar documentos para verificação"
            accessibilityState={{
              disabled: uploadState === "uploading" || !docAsset || !selfieAsset || (needsConsent && !consentGiven),
            }}
            className={[
              "min-h-[52px] items-center justify-center rounded-xl",
              uploadState === "uploading" || !docAsset || !selfieAsset || (needsConsent && !consentGiven)
                ? "bg-brand/50"
                : "bg-brand",
            ].join(" ")}
          >
            {uploadState === "uploading" ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color="#FFFFFF" />
                <Text className="text-base font-bold text-white">Enviando...</Text>
              </View>
            ) : (
              <Text className="text-base font-bold text-white">
                {uploadState === "error" ? "Tentar enviar novamente" : "Enviar para verificação"}
              </Text>
            )}
          </TouchableOpacity>
          <Text className="mt-2 text-center text-xs text-muted">
            Análise em até 2 dias úteis · privacidade@shareo.com.br
          </Text>
        </View>
      )}
    </View>
  )
}
