// Fonte: app/perfil/dados/page.tsx
/**
 * DadosScreen — apps/mobile/app/perfil/dados.tsx
 *
 * Tela nativa de Privacidade e Dados (direitos LGPD, art. 20).
 * Transcrição literal de app/perfil/dados/page.tsx.
 *
 * Adaptações de plataforma (inevitáveis — não quebram a regra de transcrição):
 *   - Botão "Exportar dados (JSON)": no site é <a href download>. No RN, usa
 *     apiFetch (Bearer) → FileSystem.writeAsStringAsync → Sharing.shareAsync.
 *   - Link "Ir para Documentos": site aponta /perfil/documentos; no app a rota
 *     nativa equivalente é /kyc (router.push) — mesma lógica de perfil.tsx.
 *   - Link "Ir para Segurança": site aponta /perfil/seguranca; app usa
 *     router.push("/perfil/seguranca") — tela nativa criada em PR #198.
 *
 * Padrão de estilo: StyleSheet + useTheme() tokens (consistente com perfil.tsx
 * da versão CONFIG_LINKS desta sessão).
 *
 * ATENÇÃO: expo-file-system (v19) e expo-sharing são módulos nativos — um rebuild
 * do dev-client é necessário para ativar a funcionalidade de exportação em device.
 * Versões instaladas: expo-file-system@~19.0.23, expo-sharing@~14.0.8 (SDK 54).
 * Usamos expo-file-system/legacy para manter a API funcional sem breaking changes.
 */
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
import { useState } from "react"
import { router } from "expo-router"
import { useSafeAreaInsets } from "react-native-safe-area-context"
// expo-file-system v19 (SDK 54) quebrou a API funcional no export padrão.
// Usamos o subpath "/legacy" que preserva a API anterior sem quebra.
import * as FileSystem from "expo-file-system/legacy"
import * as Sharing from "expo-sharing"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Itens do card "Sobre seus dados" — verbatim de dados/page.tsx ─────────────
const DATA_ITEMS = [
  {
    icon:  "🔒",
    title: "CPF/CNPJ",
    desc:  "Armazenado com criptografia AES-256-GCM. Nunca exposto em texto claro.",
  },
  {
    icon:  "📋",
    title: "Histórico de locações",
    desc:  "Mantido por obrigação fiscal (art. 37 Código Comercial) mesmo após exclusão da conta.",
  },
  {
    icon:  "💬",
    title: "Mensagens",
    desc:  "Armazenadas enquanto a conta estiver ativa. Removidas ao excluir a conta.",
  },
  {
    icon:  "🗺️",
    title: "Localização",
    desc:  "Usada apenas para centralizar o mapa e nunca compartilhada com terceiros.",
  },
] as const

export default function DadosScreen() {
  const { tokens } = useTheme()
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const [exporting, setExporting] = useState(false)

  // ── Guard: não autenticado ────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg, paddingTop: insets.top }]}>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para acessar seus dados
        </Text>
        <TouchableOpacity
          style={[s.loginBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Exportar: apiFetch → FileSystem → Sharing ─────────────────────────────
  // Equivalente nativo do link <a href="/api/users/me/export" download> do site.
  // A autenticação é feita via Bearer token injetado automaticamente pelo apiFetch.
  async function handleExport() {
    setExporting(true)
    try {
      const payload  = await apiFetch<unknown>("/api/users/me/export")
      const json     = JSON.stringify(payload, null, 2)
      const date     = new Date().toISOString().split("T")[0]
      const filename = `shareo-meus-dados-${date}.json`
      const fileUri  = `${FileSystem.documentDirectory}${filename}`

      await FileSystem.writeAsStringAsync(fileUri, json, {
        encoding: FileSystem.EncodingType.UTF8,
      })
      await Sharing.shareAsync(fileUri, {
        mimeType:    "application/json",
        dialogTitle: "Salvar meus dados ShareO",
        UTI:         "public.json",   // iOS UTI para JSON
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Erro desconhecido."
      Alert.alert("Erro ao exportar", msg)
    } finally {
      setExporting(false)
    }
  }

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* ── Header — verbatim do padrão kyc.tsx / favoritos.tsx ── */}
      <View
        style={[
          s.header,
          {
            paddingTop:      insets.top + 8,
            backgroundColor: tokens.surface,
            borderColor:     tokens.border,
          },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.back()}
          accessibilityLabel="Voltar"
          accessibilityRole="button"
          style={s.backBtn}
        >
          <Text style={[s.backArrow, { color: tokens.muted }]}>‹</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: tokens.navy }]}>Privacidade e Dados</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Intro (verbatim de dados/page.tsx linhas 29-31) ── */}
        <Text style={[s.intro, { color: tokens.muted }]}>
          Você tem o direito de acessar e exportar todos os dados que o ShareO armazena sobre você, conforme a LGPD (Lei 13.709/2018).
        </Text>

        {/* ── Card: Exportar meus dados (verbatim de dados/page.tsx linhas 33-50) ── */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.cardTitle, { color: tokens.text }]}>Exportar meus dados</Text>
          <Text style={[s.cardDesc, { color: tokens.muted }]}>
            Baixe um arquivo JSON com todos os seus dados pessoais: perfil, reservas, avaliações e mensagens (LGPD art. 20).
          </Text>
          <TouchableOpacity
            testID="btn-exportar"
            style={[s.outlineBtn, { borderColor: tokens.border }, exporting && { opacity: 0.6 }]}
            onPress={handleExport}
            disabled={exporting}
            accessibilityRole="button"
            accessibilityLabel="Exportar dados em formato JSON"
            accessibilityState={{ disabled: exporting }}
          >
            {exporting ? (
              <ActivityIndicator
                testID="export-loading"
                size="small"
                color={tokens.text}
              />
            ) : (
              <Text style={[s.outlineBtnText, { color: tokens.text }]}>
                ⬇ Exportar dados (JSON)
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {/* ── Card: Sobre seus dados (verbatim de dados/page.tsx linhas 53-69) ── */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.cardTitle, { color: tokens.text }]}>Sobre seus dados</Text>
          {DATA_ITEMS.map((item, i) => (
            <View
              key={item.title}
              style={[
                s.dataRow,
                i > 0 && {
                  borderTopWidth: 1,
                  borderTopColor: tokens.border,
                  paddingTop:     12,
                  marginTop:      12,
                },
              ]}
            >
              <Text
                style={s.dataIcon}
                accessibilityElementsHidden
                importantForAccessibility="no"
              >
                {item.icon}
              </Text>
              <View style={s.dataTexts}>
                <Text style={[s.dataTitle, { color: tokens.text }]}>{item.title}</Text>
                <Text style={[s.dataDesc,  { color: tokens.muted }]}>{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* ── Card: Verificação de identidade (verbatim de dados/page.tsx linhas 71-88) ── */}
        {/* Link nativo: /kyc (equivalente de /perfil/documentos — ver perfil.tsx linha 59) */}
        <View style={[s.card, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.cardTitle, { color: tokens.text }]}>Verificação de identidade</Text>
          <Text style={[s.cardDesc, { color: tokens.muted }]}>
            Para enviar ou atualizar seus documentos de verificação (CPF, CNPJ, selfie), acesse a área de Documentos.
          </Text>
          <TouchableOpacity
            style={[s.outlineBtn, { borderColor: tokens.border }]}
            onPress={() => router.push("/kyc" as never)}
            accessibilityRole="button"
            accessibilityLabel="Ir para Documentos"
          >
            <Text style={[s.outlineBtnText, { color: tokens.text }]}>Ir para Documentos →</Text>
          </TouchableOpacity>
        </View>

        {/* ── Card: Excluir conta (verbatim de dados/page.tsx linhas 90-102) ── */}
        {/* Link nativo: /perfil/seguranca (tela criada em PR #198 desta sessão) */}
        <View
          style={[
            s.card,
            { backgroundColor: tokens.surface, borderColor: tokens.error + "33" },
          ]}
        >
          <Text style={[s.cardTitle, { color: tokens.text }]}>Excluir conta</Text>
          <Text style={[s.cardDesc, { color: tokens.muted }]}>
            Para excluir sua conta e todos os dados pessoais, acesse as configurações de segurança.
          </Text>
          <TouchableOpacity
            style={[s.dangerBtn, { borderColor: tokens.error + "4D" }]}
            onPress={() => router.push("/perfil/seguranca" as never)}
            accessibilityRole="button"
            accessibilityLabel="Ir para Segurança"
          >
            <Text style={[s.dangerBtnText, { color: tokens.error }]}>Ir para Segurança →</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

const s = StyleSheet.create({
  root:   { flex: 1 },

  // Guard
  center: {
    flex:              1,
    alignItems:        "center",
    justifyContent:    "center",
    paddingHorizontal: 32,
    gap:               16,
  },
  gateTitle: {
    fontSize:   16,
    fontWeight: "600",
    textAlign:  "center",
  },
  loginBtn: {
    borderRadius:      10,
    minHeight:         48,
    paddingHorizontal: 32,
    alignItems:        "center",
    justifyContent:    "center",
    width:             "100%",
  },
  loginBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },

  // Header
  header: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             12,
    borderBottomWidth: 1,
    paddingHorizontal: 16,
    paddingBottom:   12,
  },
  backBtn: {
    minHeight: 44,
    minWidth:  44,
    alignItems:      "center",
    justifyContent:  "center",
  },
  backArrow:   { fontSize: 28, lineHeight: 32 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: "700" },

  // Scroll / content
  scroll:   { flex: 1 },
  content:  { padding: 16, paddingBottom: 40, gap: 12 },

  // Intro
  intro: { fontSize: 13, lineHeight: 20 },

  // Cards
  card: {
    borderRadius: 16,
    borderWidth:  1,
    padding:      18,
    gap:          10,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3 },
      android: { elevation: 1 },
    }),
  },
  cardTitle: { fontSize: 15, fontWeight: "600" },
  cardDesc:  { fontSize: 13, lineHeight: 18 },

  // Botão outline neutro (exportar / documentos)
  outlineBtn: {
    borderWidth:       1,
    borderRadius:      10,
    minHeight:         44,
    paddingHorizontal: 16,
    alignItems:        "center",
    justifyContent:    "center",
    alignSelf:         "flex-start",
  },
  outlineBtnText: { fontSize: 13, fontWeight: "600" },

  // Itens de dados
  dataRow: {
    flexDirection: "row",
    gap:           12,
    alignItems:    "flex-start",
  },
  dataIcon:  { fontSize: 18, lineHeight: 22 },
  dataTexts: { flex: 1 },
  dataTitle: { fontSize: 13, fontWeight: "600" },
  dataDesc:  { fontSize: 12, lineHeight: 16, marginTop: 2 },

  // Botão de perigo (excluir conta)
  dangerBtn: {
    borderWidth:       1,
    borderRadius:      10,
    minHeight:         44,
    paddingHorizontal: 16,
    alignItems:        "center",
    justifyContent:    "center",
    alignSelf:         "flex-start",
  },
  dangerBtnText: { fontSize: 13, fontWeight: "600" },
})
