// Fonte: app/perfil/repasses/page.tsx

/**
 * RepassesScreen — apps/mobile/app/perfil/repasses.tsx
 *
 * Tela nativa de histórico de repasses (payouts) recebidos pelo locador.
 * Transcrição literal de app/perfil/repasses/page.tsx (Server Component do site).
 *
 * Fonte de dados: GET /api/user/payouts (rota nova — mesma query Prisma do site).
 * Links para /perfil/recebimentos e /perfil/repasses/informe abrem no navegador
 * (páginas ainda não nativizadas).
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Linking,
} from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch, API_URL } from "@/lib/api"
import { useAuth } from "@/lib/auth"

// ─── Labels de status verbatim do site ──────────────────────────────────────
// Fonte: app/perfil/repasses/page.tsx — STATUS_LABEL
const STATUS_LABEL: Record<string, { label: string; badgeCls: string; textCls: string }> = {
  PENDING:    { label: "Aguardando",  badgeCls: "border-yellow-200 bg-yellow-50", textCls: "text-yellow-700" },
  PROCESSING: { label: "Em processo", badgeCls: "border-blue-200 bg-blue-50",     textCls: "text-blue-700"   },
  COMPLETED:  { label: "Pago",        badgeCls: "border-green-200 bg-green-50",   textCls: "text-green-700"  },
  FAILED:     { label: "Falhou",      badgeCls: "border-red-200 bg-red-50",       textCls: "text-red-600"    },
  BLOCKED:    { label: "Bloqueado",   badgeCls: "border-border bg-surface",       textCls: "text-muted"      },
}

// Formatadores idênticos aos do site
const fmt = (cents: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100)

const fmtDate = (d: string) =>
  new Intl.DateTimeFormat("pt-BR", { dateStyle: "short" }).format(new Date(d))

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface PayoutAccount {
  id:          string
  pixKey:      string | null
  pixKeyType:  string | null
  holderName:  string | null
  status:      string
}

interface Payout {
  id:            string
  amount:        number
  status:        string
  eligibleAfter: string | null
  processedAt:   string | null
  failureReason: string | null
  booking: {
    id:        string
    startDate: string
    endDate:   string
    item:      { title: string }
  }
}

interface PayoutsResponse {
  data: {
    account: PayoutAccount | null
    payouts: Payout[]
  }
}

// ─── Tela ────────────────────────────────────────────────────────────────────

export default function RepassesScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["user-payouts"],
    queryFn:  () => apiFetch<PayoutsResponse>("/api/user/payouts"),
    enabled:  !!user,
  })

  const account = data?.data?.account ?? null
  const payouts = data?.data?.payouts ?? []

  const totalPaid    = payouts.filter((p) => p.status === "COMPLETED").reduce((s, p) => s + p.amount, 0)
  const totalPending = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").reduce((s, p) => s + p.amount, 0)
  const countPaid    = payouts.filter((p) => p.status === "COMPLETED").length
  const countPending = payouts.filter((p) => p.status === "PENDING" || p.status === "PROCESSING").length

  if (!user) {
    return (
      <View
        className="flex-1 items-center justify-center bg-background px-6"
        style={{ paddingTop: insets.top }}
      >
        <Text className="text-5xl">💸</Text>
        <Text className="mt-3 text-base font-semibold text-primary">
          Faça login para ver seus repasses
        </Text>
        <TouchableOpacity
          className="mt-6 rounded-xl bg-brand px-8 py-3"
          onPress={() => router.push("/(auth)/login")}
          accessibilityRole="button"
          accessibilityLabel="Entrar"
        >
          <Text className="font-bold text-white">Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

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
        <Text className="flex-1 text-lg font-bold text-primary">Meus Repasses</Text>
        {/* Informe IR — abre no navegador (página ainda não nativizada) */}
        <TouchableOpacity
          onPress={() => Linking.openURL(`${API_URL}/perfil/repasses/informe`)}
          accessibilityLabel="Informe de Rendimentos IR"
          accessibilityRole="button"
          className="min-h-[44px] items-center justify-center px-2"
        >
          <Text className="text-sm font-medium text-foreground">📄 Informe IR</Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <ScrollView
          className="flex-1"
          contentContainerStyle={{ padding: 16, paddingBottom: 40 }}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor="#007B3C"
            />
          }
        >
          {/* Descrição verbatim do site */}
          <Text className="mb-4 text-sm text-muted">
            Histórico de repasses das suas locações. O valor fica retido na plataforma até o repasse semanal (toda segunda-feira).
          </Text>

          {/* Conta PIX cadastrada — verbatim do site */}
          {account?.pixKey ? (
            <View
              className={`mb-4 rounded-xl border p-4 ${
                account.status === "VERIFIED"
                  ? "border-green-200 bg-green-50"
                  : account.status === "REJECTED"
                  ? "border-red-200 bg-red-50"
                  : "border-yellow-200 bg-yellow-50"
              }`}
            >
              <Text
                className={`text-sm font-semibold ${
                  account.status === "VERIFIED"
                    ? "text-green-700"
                    : account.status === "REJECTED"
                    ? "text-red-600"
                    : "text-yellow-700"
                }`}
              >
                {account.status === "VERIFIED"
                  ? "✓ Conta PIX verificada"
                  : account.status === "REJECTED"
                  ? "✗ Conta PIX rejeitada"
                  : "⏳ Conta PIX aguardando verificação"}
              </Text>
              <Text className="mt-0.5 text-sm text-muted">
                {account.pixKeyType}: {account.pixKey} · {account.holderName}
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`${API_URL}/perfil/recebimentos`)}
                accessibilityRole="link"
                accessibilityLabel="Editar conta PIX"
                className="min-h-[44px] justify-center"
              >
                <Text className="text-xs text-brand underline">Editar conta →</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View className="mb-4 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
              <Text className="text-sm font-semibold text-yellow-800">
                Cadastre sua chave PIX para receber repasses
              </Text>
              <TouchableOpacity
                onPress={() => Linking.openURL(`${API_URL}/perfil/recebimentos`)}
                accessibilityRole="link"
                accessibilityLabel="Cadastrar chave PIX"
                className="min-h-[44px] justify-center"
              >
                <Text className="text-sm text-yellow-700 underline">
                  Cadastrar chave PIX →
                </Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Resumo (só aparece com repasses — verbatim do site) */}
          {payouts.length > 0 && (
            <View className="mb-4 flex-row gap-3">
              <View className="flex-1 rounded-xl border border-border bg-surface p-4">
                <Text className="text-2xl font-bold text-success">{fmt(totalPaid)}</Text>
                <Text className="mt-0.5 text-sm font-medium text-foreground">Total recebido</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {countPaid} {countPaid === 1 ? "repasse" : "repasses"}
                </Text>
              </View>
              <View className="flex-1 rounded-xl border border-border bg-surface p-4">
                <Text className="text-2xl font-bold text-primary">{fmt(totalPending)}</Text>
                <Text className="mt-0.5 text-sm font-medium text-foreground">A receber</Text>
                <Text className="mt-0.5 text-xs text-muted">
                  {countPending} {countPending === 1 ? "pendente" : "pendentes"}
                </Text>
              </View>
            </View>
          )}

          {/* Lista / Estado vazio — verbatim do site */}
          {payouts.length === 0 ? (
            <View className="items-center rounded-xl border border-border bg-surface p-8">
              <Text className="text-center text-sm text-muted">
                Nenhum repasse ainda. Complete uma locação para receber.
              </Text>
            </View>
          ) : (
            <View className="overflow-hidden rounded-xl border border-border bg-surface">
              {payouts.map((p, i) => {
                const info = STATUS_LABEL[p.status] ?? STATUS_LABEL["BLOCKED"]
                return (
                  <View
                    key={p.id}
                    className={`px-5 py-4 ${i < payouts.length - 1 ? "border-b border-border" : ""}`}
                  >
                    <View className="flex-row items-start justify-between gap-3">
                      {/* Dados do repasse */}
                      <View className="min-w-0 flex-1">
                        <Text
                          className="text-sm font-semibold text-foreground"
                          numberOfLines={1}
                        >
                          {p.booking.item.title}
                        </Text>
                        <Text className="text-xs text-muted">
                          {fmtDate(p.booking.startDate)} – {fmtDate(p.booking.endDate)}
                        </Text>
                        {p.status === "PENDING" && p.eligibleAfter && (
                          <Text className="text-xs text-muted">
                            Disponível em {fmtDate(p.eligibleAfter)}
                          </Text>
                        )}
                        {p.processedAt && (
                          <Text className="text-xs text-muted">
                            Pago em {fmtDate(p.processedAt)}
                          </Text>
                        )}
                        {p.failureReason && (
                          <Text className="text-xs text-red-600">{p.failureReason}</Text>
                        )}
                      </View>

                      {/* Valor + badge de status */}
                      <View className="flex-shrink-0 items-end gap-1.5">
                        <Text className="text-lg font-bold text-foreground">
                          {fmt(p.amount)}
                        </Text>
                        <View
                          className={`rounded-full border px-2.5 py-0.5 ${info.badgeCls}`}
                        >
                          <Text className={`text-xs font-semibold ${info.textCls}`}>
                            {info.label}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )
              })}
            </View>
          )}
        </ScrollView>
      )}
    </View>
  )
}
