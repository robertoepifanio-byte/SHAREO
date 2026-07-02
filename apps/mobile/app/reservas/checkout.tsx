/**
 * BookingCheckoutScreen — apps/mobile/app/reservas/checkout.tsx
 *
 * Tela de seleção de datas e criação de reserva no app Android.
 * Espelha a lógica de app/itens/[id]/_PriceCalc.tsx (web), adaptada para RN.
 *
 * Fluxo:
 *  1. Usuário seleciona modalidade (diária/semanal/mensal) + data de retirada
 *  2. Devolução calculada automaticamente
 *  3. Resumo de preço exibido em tempo real
 *  4. "Solicitar locação" → POST /api/bookings (Bearer)
 *  5. Após criar, navega para /reservas/[id] (tela de detalhe existente)
 *
 * O pagamento MP é iniciado a partir da tela de detalhe da reserva,
 * quando o locador confirmar (status CONFIRMED).
 */
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
} from "react-native"
import { useState, useMemo } from "react"
import { router, useLocalSearchParams } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { calcBookingTotal, fmtCurrency, addDays, CHECKOUT_MAX_CENTS } from "@/lib/pricing"

// ─── Tipos ───────────────────────────────────────────────────────────────────

type Mode = "daily" | "weekly" | "monthly"

// useLocalSearchParams requer Record<string, string> — todos os campos como string.
// Campos opcionais chegam como string vazia ("") quando ausentes.
type CheckoutParams = Record<string, string>

interface CreateBookingResponse {
  data: { id: string; status: string }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Data local no formato YYYY-MM-DD sem conversão UTC (evita virada de dia no Brasil) */
function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/** Formata data local para exibição pt-BR: seg., 01 jan. 2026 */
function fmtDisplayDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  })
}

/** Número de dias entre duas datas (inteiro, sem milissegundos) */
function daysBetween(start: Date, end: Date): number {
  return Math.round((end.getTime() - start.getTime()) / 86_400_000)
}

// ─── Componente ──────────────────────────────────────────────────────────────

export default function BookingCheckoutScreen() {
  const insets = useSafeAreaInsets()
  const user   = useAuth((s) => s.user)
  const qc     = useQueryClient()

  const params = useLocalSearchParams<CheckoutParams>()

  // today calculado na montagem do componente (não no carregamento do módulo),
  // resolvendo o caso de o app ficar em background passando da meia-noite.
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])

  const itemId = params.itemId ?? ""
  const title  = params.title  ?? ""
  const pricePerDay   = parseInt(params.pricePerDay   ?? "0", 10)
  const pricePerWeek  = params.pricePerWeek  ? parseInt(params.pricePerWeek,  10) : null
  const pricePerMonth = params.pricePerMonth ? parseInt(params.pricePerMonth, 10) : null

  const availableModes: Mode[] = [
    "daily",
    ...(pricePerWeek  ? (["weekly"]  as Mode[]) : []),
    ...(pricePerMonth ? (["monthly"] as Mode[]) : []),
  ]

  // ── State ────────────────────────────────────────────────────────────────
  const [mode,           setMode]           = useState<Mode>("daily")
  const [startDate,      setStartDate]      = useState<Date>(today)
  const [numDays,        setNumDays]        = useState(1)
  const [note,           setNote]           = useState("")
  const [showPicker,     setShowPicker]     = useState(false)
  const [error,          setError]          = useState<string | null>(null)
  const [needsComplete,  setNeedsComplete]  = useState(false)

  // ── Datas calculadas ─────────────────────────────────────────────────────
  const endDate = useMemo<Date>(() => {
    if (mode === "weekly")  return addDays(startDate, 7)
    if (mode === "monthly") return addDays(startDate, 30)
    return addDays(startDate, numDays)
  }, [startDate, mode, numDays])

  const totalDays = useMemo<number>(() => {
    if (mode === "weekly")  return 7
    if (mode === "monthly") return 30
    return numDays
  }, [mode, numDays])

  // ── Cálculo de preço ─────────────────────────────────────────────────────
  const { totalPrice: subtotalCents, savings: savingsCents } = useMemo(
    () => calcBookingTotal(totalDays, pricePerDay, pricePerWeek, pricePerMonth),
    [totalDays, pricePerDay, pricePerWeek, pricePerMonth],
  )

  const overLimit = subtotalCents > CHECKOUT_MAX_CENTS

  // ── Mutação de criação ───────────────────────────────────────────────────
  const createBooking = useMutation({
    mutationFn: () =>
      apiFetch<CreateBookingResponse>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          // Envia às 12h local para evitar ambiguidade de fuso
          startDate: new Date(`${toLocalISODate(startDate)}T12:00:00`).toISOString(),
          endDate:   new Date(`${toLocalISODate(endDate)}T12:00:00`).toISOString(),
          borrowerNote: note.trim() || undefined,
        }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      router.replace(`/reservas/${res.data.id}`)
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Erro ao solicitar reserva."
      if (msg.includes("Complete seu cadastro")) {
        setNeedsComplete(true)
      }
      setError(msg)
    },
  })

  // ── Handlers ─────────────────────────────────────────────────────────────
  function handleModeChange(m: Mode) {
    setMode(m)
    setError(null)
    if (m === "daily") setNumDays(1)
  }

  function handleDateChange(_: DateTimePickerEvent, selected?: Date) {
    setShowPicker(Platform.OS === "ios") // iOS mantém o picker aberto
    if (selected) {
      selected.setHours(0, 0, 0, 0)
      setStartDate(selected)
      setError(null)
    }
  }

  function handleSolicitar() {
    if (!user) {
      Alert.alert("Login necessário", "Faça login para fazer uma reserva.", [
        { text: "Cancelar", style: "cancel" },
        { text: "Entrar", onPress: () => router.push("/(auth)/login") },
      ])
      return
    }
    setError(null)
    setNeedsComplete(false)
    createBooking.mutate()
  }

  const isReady = totalDays > 0 && !overLimit && !!itemId

  // ─── Rótulos de modalidade ───────────────────────────────────────────────
  const MODE_LABELS: Record<Mode, { label: string; price: number; unit: string }> = {
    daily:   { label: "Diário",  price: pricePerDay,          unit: "/dia" },
    weekly:  { label: "Semanal", price: pricePerWeek  ?? 0,   unit: "/sem" },
    monthly: { label: "Mensal",  price: pricePerMonth ?? 0,   unit: "/mês" },
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
        <Text className="flex-1 text-lg font-bold text-primary" numberOfLines={1}>
          {title ?? "Solicitar locação"}
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>

        {/* ── Modalidade (tabs) ── */}
        {availableModes.length > 1 && (
          <View className="mb-5">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Modalidade
            </Text>
            <View className="flex-row gap-2">
              {availableModes.map((m) => {
                const { label, price, unit } = MODE_LABELS[m]
                const active = mode === m
                return (
                  <TouchableOpacity
                    key={m}
                    onPress={() => handleModeChange(m)}
                    accessibilityRole="button"
                    accessibilityState={{ selected: active }}
                    accessibilityLabel={`${label}: ${fmtCurrency(price)}${unit}`}
                    className={[
                      "flex-1 items-center rounded-xl border py-3 px-2",
                      active
                        ? "border-brand bg-emerald-50 shadow-sm"
                        : "border-border bg-surface",
                    ].join(" ")}
                  >
                    <Text
                      className={[
                        "text-[10px] font-semibold uppercase tracking-wider",
                        active ? "text-brand" : "text-muted",
                      ].join(" ")}
                    >
                      {label}
                    </Text>
                    <Text
                      className={[
                        "mt-0.5 text-base font-extrabold leading-tight",
                        active ? "text-foreground" : "text-muted",
                      ].join(" ")}
                    >
                      {fmtCurrency(price)}
                    </Text>
                    <Text className={active ? "text-[10px] text-brand" : "text-[10px] text-muted"}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Data de retirada ── */}
        <View className="mb-4">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Data de retirada
          </Text>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Data de retirada: ${fmtDisplayDate(startDate)}. Toque para alterar`}
            className="min-h-[44px] flex-row items-center rounded-lg border border-border bg-surface px-4"
          >
            <Text className="flex-1 text-sm text-foreground">{fmtDisplayDate(startDate)}</Text>
            <Text className="text-sm text-brand">Alterar</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={today}
              onChange={handleDateChange}
              locale="pt-BR"
            />
          )}
          {/* iOS: botão para fechar o picker quando display="spinner" */}
          {showPicker && Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() => setShowPicker(false)}
              className="mt-2 items-end"
            >
              <Text className="text-sm font-semibold text-brand">Confirmar</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quantidade de dias (apenas modo diário) ── */}
        {mode === "daily" && (
          <View className="mb-4">
            <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
              Quantidade de dias
            </Text>
            <View className="flex-row items-center gap-3">
              <TouchableOpacity
                onPress={() => setNumDays((n) => Math.max(1, n - 1))}
                accessibilityRole="button"
                accessibilityLabel="Diminuir dias"
                className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary/10"
              >
                <Text className="text-xl font-bold text-primary">−</Text>
              </TouchableOpacity>
              <TextInput
                value={String(numDays)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10)
                  if (!isNaN(n)) setNumDays(Math.min(365, Math.max(1, n)))
                }}
                keyboardType="number-pad"
                accessibilityLabel="Número de dias"
                className="min-h-[44px] flex-1 rounded-lg border border-border bg-surface px-3 text-center text-base font-semibold text-foreground"
              />
              <TouchableOpacity
                onPress={() => setNumDays((n) => Math.min(365, n + 1))}
                accessibilityRole="button"
                accessibilityLabel="Aumentar dias"
                className="min-h-[44px] min-w-[44px] items-center justify-center rounded-lg bg-primary/10"
              >
                <Text className="text-xl font-bold text-primary">+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Data de devolução (calculada automaticamente) ── */}
        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Devolução{" "}
            <Text className="font-normal normal-case text-[10px]">(calculado automaticamente)</Text>
          </Text>
          <View
            className="min-h-[44px] flex-row items-center rounded-lg border border-border bg-muted/20 px-4"
            accessibilityLabel={`Data de devolução: ${fmtDisplayDate(endDate)}`}
            accessible
          >
            <Text className="text-sm text-foreground">{fmtDisplayDate(endDate)}</Text>
          </View>
          <Text className="mt-1 text-[11px] text-muted">
            {mode === "daily"
              ? `Retirada + ${numDays} dia${numDays > 1 ? "s" : ""} — devolução no mesmo horário`
              : mode === "weekly"
              ? "Retirada + 7 dias — devolução no mesmo horário"
              : "Retirada + 30 dias — devolução no mesmo horário"}
          </Text>
        </View>

        {/* ── Resumo de preço ── */}
        <View
          className="mb-5 rounded-xl border border-border bg-surface p-4"
          accessibilityLabel="Resumo de preço"
          accessible
        >
          <Text className="mb-2 text-[11px] font-bold uppercase tracking-widest text-muted">
            Resumo
          </Text>

          <View className="flex-row items-center justify-between">
            <Text className="text-sm text-muted">
              {mode === "daily"
                ? `${totalDays} dia${totalDays > 1 ? "s" : ""} × ${fmtCurrency(pricePerDay)}`
                : mode === "weekly"
                ? `1 semana × ${fmtCurrency(pricePerWeek ?? 0)}`
                : `1 mês × ${fmtCurrency(pricePerMonth ?? 0)}`}
            </Text>
            <Text className="text-sm font-semibold text-foreground">
              {fmtCurrency(subtotalCents)}
            </Text>
          </View>

          {savingsCents > 0 && (
            <View className="mt-1.5 flex-row items-center justify-between">
              <Text className="text-xs font-medium text-success">Desconto por período</Text>
              <Text className="text-xs font-medium text-success">-{fmtCurrency(savingsCents)}</Text>
            </View>
          )}

          <View className="my-3 h-px bg-border" />

          <View className="flex-row items-center justify-between">
            <Text className="text-base font-bold text-foreground">Total do aluguel</Text>
            <Text className="text-xl font-extrabold text-primary">{fmtCurrency(subtotalCents)}</Text>
          </View>

          <Text className="mt-2 text-[11px] leading-relaxed text-muted">
            Você paga apenas o valor da locação. A ShareO retém um percentual do repasse ao proprietário.
          </Text>
        </View>

        {/* ── Aviso de teto D2 ── */}
        {overLimit && (
          <View
            className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3"
            accessibilityRole="alert"
          >
            <Text className="text-sm font-semibold text-amber-800">
              Total acima do limite desta versão
            </Text>
            <Text className="mt-0.5 text-xs text-amber-700">
              Locações acima de {fmtCurrency(CHECKOUT_MAX_CENTS)} não estão disponíveis agora.
              Reduza a quantidade de dias ou escolha outra modalidade.
            </Text>
          </View>
        )}

        {/* ── Nota ao proprietário ── */}
        <View className="mb-5">
          <Text className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-600">
            Mensagem ao proprietário{" "}
            <Text className="font-normal normal-case">(opcional)</Text>
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={500}
            placeholder="Ex.: Preciso para um evento no fim de semana…"
            placeholderTextColor="#9CA3AF"
            accessibilityLabel="Mensagem opcional ao proprietário"
            className="rounded-xl border border-border bg-surface px-4 py-3 text-sm text-foreground"
            style={{ textAlignVertical: "top", minHeight: 80 }}
          />
        </View>

        {/* ── Erro ── */}
        {error && (
          <View
            className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            accessibilityRole="alert"
          >
            <Text className="text-sm text-red-700">{error}</Text>
            {needsComplete && (
              <TouchableOpacity
                onPress={() => router.push({
                  pathname: "/cadastro/completar" as never,
                  params: { callbackUrl: `/itens/${itemId}` },
                })}
                className="mt-2"
              >
                <Text className="text-sm font-semibold text-brand">
                  Completar cadastro →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

      </ScrollView>

      {/* ── CTA fixo ── */}
      <View
        className="border-t border-border bg-surface px-4 py-3"
        style={{ paddingBottom: insets.bottom + 12 }}
      >
        <TouchableOpacity
          onPress={handleSolicitar}
          disabled={!isReady || createBooking.isPending}
          accessibilityRole="button"
          accessibilityLabel="Solicitar locação"
          accessibilityState={{ disabled: !isReady || createBooking.isPending }}
          className={[
            "min-h-[52px] items-center justify-center rounded-xl",
            isReady && !createBooking.isPending ? "bg-brand" : "bg-brand/50",
          ].join(" ")}
        >
          {createBooking.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text className="text-base font-bold text-white">
              Solicitar locação
            </Text>
          )}
        </TouchableOpacity>
        <Text className="mt-2 text-center text-xs text-muted">
          O proprietário precisa confirmar antes do pagamento
        </Text>
      </View>
    </View>
  )
}
