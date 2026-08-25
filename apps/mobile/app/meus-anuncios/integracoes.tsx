// Fonte: app/meus-anuncios/integracoes/page.tsx + app/meus-anuncios/integracoes/_WebhooksPanel.tsx
//
// Transcrição literal da tela "Integrações (Webhooks PJ)" do site ShareO para React Native.
//
// Decisões de transcrição documentadas:
//   1. Abas: rótulos e ordem verbatim (Anúncios / Desempenho / Importar só PJ /
//      Integrações). "Integrações" = ativa (esta tela). "Anúncios" → router.back().
//      Demais → Linking.openURL(API_URL + path), padrão de meus-anuncios.tsx.
//   2. confirm() não existe no RN — usa Alert.alert() com texto verbatim do site
//      ("Remover este webhook?") e dois botões: Cancelar / Remover.
//   3. copyToClipboard() → Share.share({ message: secret }), padrão de
//      apps/mobile/app/perfil/embaixador.tsx (Clipboard nativo).
//   4. WEBHOOK_EVENTS e EVENT_LABELS inlineados — o módulo @/lib/outboundWebhooks
//      é web-only (importa 'crypto' do Node); o mobile não pode consumi-lo.
//   5. PjGate: a API retorna 403 para não-PJ. Adicionalmente, verifica userType
//      via ["me-profile"] (cache compartilhado com meus-anuncios.tsx) para exibir
//      mensagem gate antes mesmo de disparar a query de webhooks.
//   6. TanStack Query v5: onSuccess foi removido. Lista vem diretamente de
//      useQuery({ queryKey: ["pj-webhooks"] }); mutações chamam invalidateQueries.
//      newSecret é local state (exibido só na resposta POST, nunca cacheável).
//   7. Bloco de código da seção "Como validar a assinatura" → ScrollView horizontal
//      + Text com fontFamily monospace (equivalente ao <pre> do site).
//   8. Botão "Novo anúncio" verbatim de page.tsx linhas 53-62.
//   9. Subtitle PJ-only verbatim de page.tsx:
//      "Conecte o ShareO com seus sistemas externos via webhooks".

import React, { useState } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  StyleSheet,
  Platform,
  Alert,
  Share,
  Linking,
} from "react-native"
import Svg, { Line, Path } from "react-native-svg"
import { router } from "expo-router"
import { SafeAreaView } from "react-native-safe-area-context"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { apiFetch, API_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Constantes inlineadas de lib/outboundWebhooks.ts (web-only) ──────────────

const WEBHOOK_EVENTS = [
  "booking.created",
  "booking.confirmed",
  "booking.cancelled",
  "booking.paid",
  "booking.active",
  "booking.returned",
  "booking.completed",
] as const

type WebhookEvent = (typeof WEBHOOK_EVENTS)[number]

const EVENT_LABELS: Record<WebhookEvent, string> = {
  "booking.created":   "Reserva solicitada",
  "booking.confirmed": "Reserva confirmada pelo locador",
  "booking.cancelled": "Reserva cancelada",
  "booking.paid":      "Pagamento recebido",
  "booking.active":    "Item entregue (aluguel ativo)",
  "booking.returned":  "Item devolvido",
  "booking.completed": "Aluguel concluído",
}

// ── Tipos ─────────────────────────────────────────────────────────────────────

type Webhook = {
  id:             string
  url:            string
  events:         string[]
  isActive:       boolean
  failureCount:   number
  lastFiredAt:    string | null
  lastStatusCode: number | null
  createdAt:      string
}

interface MeData {
  id:       string
  userType: "PF" | "PJ"
}

// ── Ícones SVG verbatim do site ───────────────────────────────────────────────

function PlusIcon({ color }: { color: string }) {
  return (
    <Svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Line x1="12" y1="5" x2="12" y2="19" />
      <Line x1="5" y1="12" x2="19" y2="12" />
    </Svg>
  )
}

function ChevronLeftIcon({ color }: { color: string }) {
  return (
    <Svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <Path d="M15 18l-6-6 6-6" />
    </Svg>
  )
}

// ── Formatação de data — verbatim de _WebhooksPanel.tsx linha 249 ─────────────

function fmtDate(iso: string) {
  return new Intl.DateTimeFormat("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(iso))
}

// ── Tela principal ─────────────────────────────────────────────────────────────

export default function IntegracoesScreen() {
  const { tokens } = useTheme()
  const user       = useAuth((s) => s.user)
  const qc         = useQueryClient()

  // ── Estado local — espelha _WebhooksPanel.tsx ────────────────────────────
  const [creating,    setCreating]    = useState(false)
  const [newUrl,      setNewUrl]      = useState("")
  const [newEvents,   setNewEvents]   = useState<WebhookEvent[]>([])
  const [submitting,  setSubmitting]  = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newSecret,   setNewSecret]   = useState<string | null>(null)
  const [deletingId,  setDeletingId]  = useState<string | null>(null)
  const [togglingId,  setTogglingId]  = useState<string | null>(null)

  // ── Query de userType — cache compartilhado com meus-anuncios.tsx ─────────
  const { data: meData, isLoading: meLoading } = useQuery({
    queryKey: ["me-profile"],
    queryFn:  () => apiFetch<{ data: MeData }>("/api/users/me"),
    enabled:  !!user,
    select:   (r: { data: MeData }) => r.data,
  })

  const isPJ = meData?.userType === "PJ"

  // ── Query de webhooks — só para PJ, v5: sem onSuccess ────────────────────
  const {
    data:      webhooksData,
    isLoading: whLoading,
    isError:   whError,
  } = useQuery({
    queryKey: ["pj-webhooks", user?.id],
    queryFn:  () => apiFetch<{ data: Webhook[] }>("/api/pj/webhooks"),
    enabled:  !!user && isPJ === true,
    select:   (r: { data: Webhook[] }) => r.data ?? [],
  })

  const webhooks = webhooksData ?? []

  // ── Mutations — verbatim de _WebhooksPanel.tsx ────────────────────────────

  const toggleMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      apiFetch(`/api/pj/webhooks/${id}`, {
        method:  "PATCH",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ isActive }),
      }),
    onMutate: ({ id }: { id: string }) => setTogglingId(id),
    onSettled: () => {
      setTogglingId(null)
      void qc.invalidateQueries({ queryKey: ["pj-webhooks", user?.id] })
    },
  })

  const deleteMutation = useMutation({
    mutationFn: (id: string) =>
      apiFetch(`/api/pj/webhooks/${id}`, { method: "DELETE" }),
    onMutate: (id: string) => setDeletingId(id),
    onSettled: () => {
      setDeletingId(null)
      void qc.invalidateQueries({ queryKey: ["pj-webhooks", user?.id] })
    },
  })

  // ── Handlers — verbatim de _WebhooksPanel.tsx ────────────────────────────

  function toggleEvent(ev: WebhookEvent) {
    setNewEvents((prev) =>
      prev.includes(ev) ? prev.filter((e) => e !== ev) : [...prev, ev],
    )
  }

  async function handleCreate() {
    if (submitting || newEvents.length === 0) return
    setSubmitting(true)
    setCreateError(null)
    setNewSecret(null)
    try {
      const json = await apiFetch<{ data: Webhook & { secret: string } }>("/api/pj/webhooks", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ url: newUrl, events: newEvents }),
      })
      setNewSecret(json.data.secret)
      setNewUrl("")
      setNewEvents([])
      setCreating(false)
      void qc.invalidateQueries({ queryKey: ["pj-webhooks", user?.id] })
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : null) ?? "Erro de conexão."
      setCreateError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  function handleToggle(wh: Webhook) {
    toggleMutation.mutate({ id: wh.id, isActive: !wh.isActive })
  }

  function handleDelete(wh: Webhook) {
    // confirm() não existe no RN — Alert.alert() com texto verbatim do site
    Alert.alert(
      "Remover este webhook?",
      "",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text:    "Remover",
          style:   "destructive",
          onPress: () => deleteMutation.mutate(wh.id),
        },
      ],
    )
  }

  async function handleCopySecret(secret: string) {
    // copyToClipboard() → Share.share(), padrão de apps/mobile/app/perfil/embaixador.tsx
    try {
      await Share.share({ message: secret })
    } catch {
      // silent
    }
  }

  // ── Render ────────────────────────────────────────────────────────────────

  const isLoading = meLoading || (isPJ === true && whLoading && !webhooksData)

  return (
    <SafeAreaView style={[s.root, { backgroundColor: tokens.bg }]} edges={["top"]}>

      {/* ── Header — verbatim de page.tsx linhas 44-67 ── */}
      <View
        style={[s.header, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
      >
        {/* Botão voltar próprio */}
        <TouchableOpacity
          style={s.backBtn}
          onPress={() => router.back()}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <ChevronLeftIcon color={tokens.navy} />
        </TouchableOpacity>

        <View style={s.headerTitleCol}>
          <Text style={[s.headerTitle, { color: tokens.navy }]}>Meus Anúncios</Text>
          {isPJ && (
            <Text style={[s.headerSubtitle, { color: tokens.muted }]}>
              Conecte o ShareO com seus sistemas externos via webhooks
            </Text>
          )}
        </View>

        {/* Botão "Novo anúncio" — verbatim de page.tsx linhas 53-62 */}
        <TouchableOpacity
          style={[s.newBtn, { backgroundColor: tokens.green }]}
          onPress={() => router.push("/itens/novo")}
          accessibilityRole="button"
          accessibilityLabel="Novo anúncio"
        >
          <PlusIcon color="#FFFFFF" />
          <Text style={s.newBtnText}>Novo anúncio</Text>
        </TouchableOpacity>
      </View>

      {/* ── Barra de abas — verbatim de page.tsx linhas 19-42 ── */}
      {/* Rótulos e ordem: Anúncios / Desempenho / Importar (só PJ) / Integrações */}
      <View
        style={[s.tabBar, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
        accessibilityRole="tablist"
      >
        <TouchableOpacity
          style={s.tabInactive}
          onPress={() => router.back()}
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel="Anúncios"
        >
          <Text style={[s.tabInactiveText, { color: tokens.muted }]}>Anúncios</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={s.tabInactive}
          onPress={() => router.push("/meus-anuncios/desempenho")}
          accessibilityRole="tab"
          accessibilityState={{ selected: false }}
          accessibilityLabel="Desempenho"
        >
          <Text style={[s.tabInactiveText, { color: tokens.muted }]}>Desempenho</Text>
        </TouchableOpacity>

        {isPJ && (
          <TouchableOpacity
            style={s.tabInactive}
            onPress={() => Linking.openURL(`${API_URL}/meus-anuncios/importar`)}
            accessibilityRole="tab"
            accessibilityState={{ selected: false }}
            accessibilityLabel="Importar"
          >
            <Text style={[s.tabInactiveText, { color: tokens.muted }]}>Importar</Text>
          </TouchableOpacity>
        )}

        {/* "Integrações" — aba ativa */}
        <View
          style={[s.tabActive, { backgroundColor: tokens.green }]}
          accessibilityRole="tab"
          accessibilityState={{ selected: true }}
          accessibilityLabel="Integrações"
        >
          <Text style={s.tabActiveText}>Integrações</Text>
        </View>
      </View>

      {/* ── Conteúdo ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : !isPJ ? (
        // ── PjGate — verbatim de components/premium/PjGate.tsx feature="generic" ──
        <View style={[s.gateCard, { backgroundColor: tokens.surface, borderColor: tokens.border }]}>
          <Text style={[s.gateTitle, { color: tokens.navy }]}>
            Recurso exclusivo para contas PJ
          </Text>
          <Text style={[s.gateDesc, { color: tokens.muted }]}>
            Este recurso está disponível apenas para contas de Pessoa Jurídica verificadas.
          </Text>
        </View>
      ) : (
        <ScrollView
          style={s.scroll}
          contentContainerStyle={s.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Header do painel — verbatim de _WebhooksPanel.tsx linhas 110-129 ── */}
          <View style={s.panelHeader}>
            <View style={s.panelHeaderText}>
              <Text style={[s.panelTitle, { color: tokens.text }]}>Webhooks de saída</Text>
              <Text style={[s.panelDesc, { color: tokens.muted }]}>
                Receba notificações HTTP quando eventos de reserva acontecerem.
              </Text>
            </View>
            {!creating && webhooks.length < 5 && (
              <TouchableOpacity
                style={[s.newEndpointBtn, { backgroundColor: tokens.green }]}
                onPress={() => setCreating(true)}
                accessibilityRole="button"
                accessibilityLabel="Novo endpoint"
              >
                <PlusIcon color="#FFFFFF" />
                <Text style={s.newEndpointBtnText}>Novo endpoint</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* ── Secret recém-criado — verbatim linhas 132-158 ── */}
          {newSecret && (
            <View style={[s.secretBox, { borderColor: tokens.success + "4D", backgroundColor: tokens.success + "1A" }]}>
              <Text style={[s.secretTitle, { color: tokens.success }]}>Webhook criado com sucesso!</Text>
              <Text style={[s.secretDesc, { color: tokens.muted }]}>
                Guarde o secret abaixo — ele{" "}
                <Text style={{ fontWeight: "700" }}>não será exibido novamente</Text>.
                {"\n"}Use-o para validar a assinatura{" "}
                <Text style={[s.code, { backgroundColor: tokens.border, color: tokens.text }]}>X-ShareO-Signature</Text>.
              </Text>
              <View style={s.secretRow}>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.secretScroll}>
                  <Text
                    style={[s.secretValue, { backgroundColor: tokens.bg, color: tokens.text }]}
                    selectable
                  >
                    {newSecret}
                  </Text>
                </ScrollView>
                <TouchableOpacity
                  style={[s.copyBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
                  onPress={() => handleCopySecret(newSecret)}
                  accessibilityRole="button"
                  accessibilityLabel="Copiar secret"
                >
                  <Text style={[s.copyBtnText, { color: tokens.text }]}>Copiar</Text>
                </TouchableOpacity>
              </View>
              <TouchableOpacity
                onPress={() => setNewSecret(null)}
                accessibilityRole="button"
                accessibilityLabel="Fechar"
              >
                <Text style={[s.closeSecret, { color: tokens.muted }]}>Fechar ×</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* ── Formulário de criação — verbatim linhas 161-218 ── */}
          {creating && (
            <View style={[s.form, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
              <Text style={[s.formTitle, { color: tokens.text }]}>Novo endpoint</Text>

              <View>
                <Text style={[s.formLabel, { color: tokens.text }]}>
                  URL do endpoint (HTTPS obrigatório)
                </Text>
                <TextInput
                  style={[s.input, { borderColor: tokens.border, backgroundColor: tokens.bg, color: tokens.text }]}
                  value={newUrl}
                  onChangeText={setNewUrl}
                  placeholder="https://meu-erp.com/shareo/events"
                  placeholderTextColor={tokens.muted}
                  autoCapitalize="none"
                  keyboardType="url"
                  autoCorrect={false}
                  accessibilityLabel="URL do endpoint"
                />
              </View>

              <View>
                <Text style={[s.formLabel, { color: tokens.text }]}>Eventos</Text>
                <View style={s.eventsGrid}>
                  {WEBHOOK_EVENTS.map((ev) => {
                    const checked = newEvents.includes(ev)
                    return (
                      <TouchableOpacity
                        key={ev}
                        style={s.eventRow}
                        onPress={() => toggleEvent(ev)}
                        accessibilityRole="checkbox"
                        accessibilityState={{ checked }}
                        accessibilityLabel={EVENT_LABELS[ev]}
                      >
                        <View
                          style={[
                            s.checkbox,
                            { borderColor: tokens.border },
                            checked && { backgroundColor: tokens.green, borderColor: tokens.green },
                          ]}
                        >
                          {checked && (
                            <Svg width={10} height={10} viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth={3}>
                              <Path d="M20 6L9 17l-5-5" />
                            </Svg>
                          )}
                        </View>
                        <Text style={[s.eventLabel, { color: tokens.text }]}>
                          {EVENT_LABELS[ev]}
                        </Text>
                      </TouchableOpacity>
                    )
                  })}
                </View>
              </View>

              {createError && (
                <Text style={[s.createError, { backgroundColor: tokens.error + "1A", color: tokens.error }]}>
                  {createError}
                </Text>
              )}

              <View style={s.formBtns}>
                <TouchableOpacity
                  style={[
                    s.submitBtn,
                    { backgroundColor: tokens.green },
                    (submitting || newEvents.length === 0) && s.submitBtnDisabled,
                  ]}
                  onPress={handleCreate}
                  disabled={submitting || newEvents.length === 0}
                  accessibilityRole="button"
                  accessibilityLabel={submitting ? "Criando…" : "Criar webhook"}
                >
                  <Text style={s.submitBtnText}>
                    {submitting ? "Criando…" : "Criar webhook"}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.cancelBtn, { borderColor: tokens.border }]}
                  onPress={() => {
                    setCreating(false)
                    setCreateError(null)
                    setNewUrl("")
                    setNewEvents([])
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Cancelar"
                >
                  <Text style={[s.cancelBtnText, { color: tokens.text }]}>Cancelar</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* ── Erro de rede ── */}
          {whError && (
            <Text style={[s.createError, { backgroundColor: tokens.error + "1A", color: tokens.error }]}>
              Erro de conexão.
            </Text>
          )}

          {/* ── Lista de webhooks / empty state — verbatim linhas 221-283 ── */}
          {!whError && webhooks.length === 0 && !creating ? (
            <View style={[s.emptyState, { borderColor: tokens.border }]}>
              <Svg
                width={28}
                height={28}
                viewBox="0 0 24 24"
                fill="none"
                stroke={tokens.muted}
                strokeWidth={1.5}
              >
                <Path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
              </Svg>
              <Text style={[s.emptyTitle, { color: tokens.muted }]}>Nenhum webhook configurado</Text>
              <Text style={[s.emptyDesc, { color: tokens.muted }]}>
                Crie um endpoint para integrar com seu ERP.
              </Text>
            </View>
          ) : (
            <View style={s.webhookList}>
              {webhooks.map((wh) => (
                <View
                  key={wh.id}
                  style={[
                    s.whCard,
                    { borderColor: tokens.border, backgroundColor: tokens.surface },
                    (deletingId === wh.id || togglingId === wh.id) && s.whCardDimmed,
                  ]}
                >
                  <View style={s.whCardBody}>
                    <View style={s.whLeft}>
                      {/* URL + indicador de status */}
                      <View style={s.whUrlRow}>
                        <View
                          style={[
                            s.whDot,
                            { backgroundColor: wh.isActive ? tokens.success : tokens.muted },
                          ]}
                        />
                        <Text
                          style={[s.whUrl, { color: tokens.text }]}
                          numberOfLines={1}
                          ellipsizeMode="middle"
                        >
                          {wh.url}
                        </Text>
                      </View>

                      {/* Event badges */}
                      <View style={s.whBadges}>
                        {wh.events.map((ev) => (
                          <View key={ev} style={[s.whBadge, { backgroundColor: tokens.green + "1A" }]}>
                            <Text style={[s.whBadgeText, { color: tokens.green }]}>{ev}</Text>
                          </View>
                        ))}
                      </View>

                      {/* Último envio */}
                      {wh.lastFiredAt && (
                        <Text style={[s.whMeta, { color: tokens.muted }]}>
                          Último envio: {fmtDate(wh.lastFiredAt)}
                          {wh.lastStatusCode !== null && (
                            <Text
                              style={{
                                fontWeight: "700",
                                color: wh.lastStatusCode < 300 ? tokens.success : tokens.error,
                              }}
                            >
                              {" "}{wh.lastStatusCode}
                            </Text>
                          )}
                        </Text>
                      )}

                      {/* Falhas consecutivas */}
                      {wh.failureCount > 0 && (
                        <Text style={[s.whFailure, { color: tokens.error }]}>
                          {wh.failureCount} falhas consecutivas
                        </Text>
                      )}
                    </View>

                    {/* Botões Pausar/Ativar e Remover */}
                    <View style={s.whActions}>
                      <TouchableOpacity
                        style={[s.whToggleBtn, { borderColor: tokens.border, backgroundColor: tokens.bg }]}
                        onPress={() => handleToggle(wh)}
                        disabled={togglingId === wh.id}
                        accessibilityRole="button"
                        accessibilityLabel={wh.isActive ? "Pausar" : "Ativar"}
                      >
                        <Text style={[s.whToggleBtnText, { color: tokens.text }]}>
                          {wh.isActive ? "Pausar" : "Ativar"}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[s.whDeleteBtn, { borderColor: tokens.error + "4D", backgroundColor: tokens.error + "0D" }]}
                        onPress={() => handleDelete(wh)}
                        disabled={deletingId === wh.id}
                        accessibilityRole="button"
                        accessibilityLabel="Remover webhook"
                      >
                        <Text style={[s.whDeleteBtnText, { color: tokens.error }]}>
                          {deletingId === wh.id ? "…" : "Remover"}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* ── Documentação rápida — verbatim linhas 285-301 ── */}
          <View style={[s.docsCard, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
            <Text style={[s.docsTitle, { color: tokens.text }]}>Como validar a assinatura</Text>
            <Text style={[s.docsDesc, { color: tokens.muted }]}>
              Cada requisição inclui o header{" "}
              <Text style={[s.code, { backgroundColor: tokens.border, color: tokens.text }]}>
                X-ShareO-Signature: sha256={"{hmac}"}
              </Text>
              .{"\n"}Valide com HMAC-SHA256 do body usando seu secret:
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator
              style={[s.codeBlock, { backgroundColor: tokens.bg }]}
            >
              <Text style={[s.codeBlockText, { color: tokens.text }]}>
                {"// Node.js\nconst crypto = require('crypto')\nconst sig = crypto\n  .createHmac('sha256', process.env.SHAREO_WEBHOOK_SECRET)\n  .update(rawBody)\n  .digest('hex')\nconst isValid = `sha256=${sig}` === req.headers['x-shareo-signature']"}
              </Text>
            </ScrollView>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  )
}

// ── Estilos — StyleSheet.create + useTheme(), padrão de meus-anuncios.tsx ────

const s = StyleSheet.create({
  root:          { flex: 1 },
  scroll:        { flex: 1 },
  scrollContent: { padding: 16, gap: 16 },
  center:        { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    paddingBottom:     12,
    paddingHorizontal: 16,
    paddingTop:        8,
    borderBottomWidth: 1,
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:        { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  headerTitleCol: { flex: 1 },
  headerTitle:    { fontSize: 17, fontWeight: "700" },
  headerSubtitle: { fontSize: 12, marginTop: 1 },
  newBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 14,
    paddingVertical:   8,
    borderRadius:      8,
    minHeight:         44,
  },
  newBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // Tabs
  tabBar: {
    flexDirection:     "row",
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderBottomWidth: 1,
    gap:               4,
  },
  tabActive: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      8,
    minHeight:         36,
    justifyContent:    "center",
  },
  tabActiveText:   { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  tabInactive: {
    paddingHorizontal: 14,
    paddingVertical:   7,
    borderRadius:      8,
    minHeight:         36,
    justifyContent:    "center",
  },
  tabInactiveText: { fontSize: 13, fontWeight: "600" },

  // PjGate
  gateCard: {
    margin:       16,
    borderWidth:  1,
    borderRadius: 16,
    padding:      20,
    gap:          8,
  },
  gateTitle: { fontSize: 16, fontWeight: "700" },
  gateDesc:  { fontSize: 14, lineHeight: 20 },

  // Painel — header
  panelHeader: {
    flexDirection:  "row",
    alignItems:     "flex-start",
    justifyContent: "space-between",
    gap:            12,
  },
  panelHeaderText:    { flex: 1 },
  panelTitle:         { fontSize: 15, fontWeight: "700" },
  panelDesc:          { fontSize: 13, marginTop: 2, lineHeight: 18 },
  newEndpointBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               6,
    paddingHorizontal: 12,
    paddingVertical:   7,
    borderRadius:      8,
    minHeight:         36,
  },
  newEndpointBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },

  // Secret box
  secretBox:   { borderWidth: 1, borderRadius: 12, padding: 16, gap: 8 },
  secretTitle: { fontSize: 14, fontWeight: "700" },
  secretDesc:  { fontSize: 12, lineHeight: 18 },
  secretRow:   { flexDirection: "row", alignItems: "center", gap: 8 },
  secretScroll: { flex: 1 },
  secretValue: {
    fontFamily:        Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize:          12,
    paddingHorizontal: 12,
    paddingVertical:   8,
    borderRadius:      8,
  },
  copyBtn: {
    flexShrink:        0,
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 12,
    paddingVertical:   8,
    minHeight:         36,
    justifyContent:    "center",
  },
  copyBtnText: { fontSize: 12 },
  closeSecret: { fontSize: 12, marginTop: 4 },

  // Formulário de criação
  form: {
    borderWidth:  1,
    borderRadius: 12,
    padding:      20,
    gap:          16,
  },
  formTitle: { fontSize: 14, fontWeight: "700" },
  formLabel: { fontSize: 14, fontWeight: "600", marginBottom: 6 },
  input: {
    height:            40,
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 12,
    fontSize:          14,
  },
  eventsGrid: { gap: 10 },
  eventRow:   { flexDirection: "row", alignItems: "center", gap: 8, minHeight: 36 },
  checkbox: {
    width:          18,
    height:         18,
    borderWidth:    1.5,
    borderRadius:   4,
    alignItems:     "center",
    justifyContent: "center",
  },
  eventLabel:  { fontSize: 14, flex: 1 },
  createError: { borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8, fontSize: 14 },
  formBtns:    { flexDirection: "row", gap: 8 },
  submitBtn: {
    height:            40,
    paddingHorizontal: 16,
    borderRadius:      8,
    alignItems:        "center",
    justifyContent:    "center",
  },
  submitBtnDisabled: { opacity: 0.4 },
  submitBtnText:     { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  cancelBtn: {
    height:            40,
    paddingHorizontal: 16,
    borderRadius:      8,
    borderWidth:       1,
    alignItems:        "center",
    justifyContent:    "center",
  },
  cancelBtnText: { fontSize: 14 },

  // Empty state
  emptyState: {
    borderWidth:  1,
    borderStyle:  "dashed",
    borderRadius: 12,
    padding:      40,
    alignItems:   "center",
    gap:          4,
  },
  emptyTitle: { fontSize: 14, fontWeight: "600", marginTop: 8 },
  emptyDesc:  { fontSize: 12 },

  // Lista de webhooks
  webhookList:  { gap: 12 },
  whCard:       { borderWidth: 1, borderRadius: 12, overflow: "hidden" },
  whCardDimmed: { opacity: 0.5 },
  whCardBody: {
    flexDirection: "row",
    alignItems:    "flex-start",
    padding:       16,
    gap:           12,
  },
  whLeft:       { flex: 1, gap: 6 },
  whUrlRow:     { flexDirection: "row", alignItems: "center", gap: 8 },
  whDot:        { width: 8, height: 8, borderRadius: 4, flexShrink: 0 },
  whUrl:        { fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace", fontSize: 13, flex: 1 },
  whBadges:     { flexDirection: "row", flexWrap: "wrap", gap: 4 },
  whBadge:      { borderRadius: 20, paddingHorizontal: 8, paddingVertical: 2 },
  whBadgeText:  { fontSize: 11, fontWeight: "600" },
  whMeta:       { fontSize: 11 },
  whFailure:    { fontSize: 11 },
  whActions:    { flexShrink: 0, gap: 6, alignItems: "flex-end" },
  whToggleBtn: {
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   6,
    minHeight:         32,
    alignItems:        "center",
    justifyContent:    "center",
  },
  whToggleBtnText: { fontSize: 12, fontWeight: "700" },
  whDeleteBtn: {
    borderWidth:       1,
    borderRadius:      8,
    paddingHorizontal: 10,
    paddingVertical:   6,
    minHeight:         32,
    alignItems:        "center",
    justifyContent:    "center",
  },
  whDeleteBtnText: { fontSize: 12, fontWeight: "700" },

  // Docs
  docsCard:  { borderWidth: 1, borderRadius: 12, padding: 20, gap: 8 },
  docsTitle: { fontSize: 14, fontWeight: "700" },
  docsDesc:  { fontSize: 13, lineHeight: 20 },
  code: {
    fontFamily:        Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize:          11,
    borderRadius:      4,
    paddingHorizontal: 4,
  },
  codeBlock: { borderRadius: 8, padding: 12, marginTop: 4 },
  codeBlockText: {
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
    fontSize:   12,
    lineHeight: 18,
  },
})
