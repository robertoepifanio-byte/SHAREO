// Fonte: app/itens/[id]/_PriceCalc.tsx + lib/platform-config.ts
// Tela de checkout do app mobile — espelha _PriceCalc.tsx do site.
// Integração Mercado Pago preservada (rota unificada resolveUserId + client:"mobile").
// Aviso de teto R$500: copy verbatim de _PriceCalc.tsx linha 434.
// Modalidade diária/semanal/mensal: verbatim de _PriceCalc.tsx linhas 86-90 e 205-235.

import React, { useState, useMemo } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  StyleSheet,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { calcBookingTotal, fmtCurrency, addDays, CHECKOUT_MAX_CENTS } from "@/lib/pricing"
import { useTheme } from "@/lib/theme"

// ── Tipos ──────────────────────────────────────────────────────────────────────
type Mode = "daily" | "weekly" | "monthly"
type CheckoutParams = Record<string, string>

interface CreateBookingResponse {
  data: { id: string; status: string }
}

// ── Helpers ────────────────────────────────────────────────────────────────────
function toLocalISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

function fmtDisplayDate(date: Date): string {
  return date.toLocaleDateString("pt-BR", {
    weekday: "short", day: "2-digit", month: "short", year: "numeric",
  })
}

const today = (() => {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
})()

// ── Tela principal ─────────────────────────────────────────────────────────────
export default function BookingCheckoutScreen() {
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const qc         = useQueryClient()
  const { tokens } = useTheme()

  const params = useLocalSearchParams<CheckoutParams>()

  const itemId        = params.itemId ?? ""
  const title         = params.title  ?? "Solicitar locação"
  const pricePerDay   = parseInt(params.pricePerDay   ?? "0", 10)
  const pricePerWeek  = params.pricePerWeek  ? parseInt(params.pricePerWeek,  10) : null
  const pricePerMonth = params.pricePerMonth ? parseInt(params.pricePerMonth, 10) : null

  // Modos disponíveis — verbatim de _PriceCalc.tsx linhas 86-90
  const availableModes: Mode[] = [
    "daily",
    ...(pricePerWeek  ? (["weekly"]  as Mode[]) : []),
    ...(pricePerMonth ? (["monthly"] as Mode[]) : []),
  ]

  // ── Estado ────────────────────────────────────────────────────────────────
  const [mode,          setMode]          = useState<Mode>("daily")
  const [startDate,     setStartDate]     = useState<Date>(today)
  const [numDays,       setNumDays]       = useState(1)
  const [note,          setNote]          = useState("")
  const [showPicker,    setShowPicker]    = useState(false)
  const [error,         setError]         = useState<string | null>(null)
  const [needsComplete, setNeedsComplete] = useState(false)

  // ── Devolução calculada automaticamente — verbatim de _PriceCalc.tsx 104-109
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

  // ── Cálculo de preço (verbatim de _PriceCalc.tsx linhas 118-131) ──────────
  const { totalPrice: subtotalCents, savings: savingsCents } = useMemo(
    () => calcBookingTotal(totalDays, pricePerDay, pricePerWeek, pricePerMonth),
    [totalDays, pricePerDay, pricePerWeek, pricePerMonth],
  )

  // Teto D2 — verbatim de _PriceCalc.tsx linha 134
  const overLimit = subtotalCents > CHECKOUT_MAX_CENTS

  // ── Mutação — integração MP preservada (client:"mobile") ──────────────────
  // Fonte: PR #161 feat/mobile-booking-checkout — rota unificada resolveUserId
  const createBooking = useMutation({
    mutationFn: () =>
      apiFetch<CreateBookingResponse>("/api/bookings", {
        method: "POST",
        body: JSON.stringify({
          itemId,
          startDate: new Date(`${toLocalISODate(startDate)}T12:00:00`).toISOString(),
          endDate:   new Date(`${toLocalISODate(endDate)}T12:00:00`).toISOString(),
          borrowerNote: note.trim() || undefined,
          client: "mobile",   // flag para resolveUserId — PR #161
        }),
      }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["bookings"] })
      router.replace(`/reservas/${res.data.id}` as never)
    },
    onError: (e) => {
      const msg = e instanceof Error ? e.message : "Erro ao solicitar reserva."
      if (msg.includes("Complete seu cadastro")) setNeedsComplete(true)
      setError(msg)
    },
  })

  // ── Rótulos de modalidade — verbatim de _PriceCalc.tsx linhas 190-194 ─────
  const MODE_LABELS: Record<Mode, { label: string; price: number; unit: string }> = {
    daily:   { label: "Diário",  price: pricePerDay,        unit: "/dia" },
    weekly:  { label: "Semanal", price: pricePerWeek  ?? 0, unit: "/sem" },
    monthly: { label: "Mensal",  price: pricePerMonth ?? 0, unit: "/mês" },
  }

  // ── Handlers ──────────────────────────────────────────────────────────────
  function handleModeChange(m: Mode) {
    setMode(m)
    setError(null)
    if (m === "daily") setNumDays(1)
  }

  function handleDateChange(_: DateTimePickerEvent, selected?: Date) {
    setShowPicker(Platform.OS === "ios")
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      {/* Header */}
      <View
        style={[
          s.header,
          {
            paddingTop:      insets.top + 8,
            backgroundColor: tokens.surface,
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
        <Text style={[s.headerTitle, { color: tokens.navy }]} numberOfLines={1}>
          {title}
        </Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: 16, paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >

        {/* ── Tabs de modalidade — verbatim de _PriceCalc.tsx 205-235 ── */}
        {availableModes.length > 1 && (
          <View style={{ marginBottom: 20 }}>
            <Text style={[s.fieldLabel, { color: tokens.muted }]}>MODALIDADE</Text>
            <View style={s.modeTabs}>
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
                    style={[
                      s.modeTab,
                      { borderColor: active ? tokens.green : tokens.border },
                      active && { backgroundColor: "#F0FDF4" },
                    ]}
                  >
                    <Text style={[s.modeTabLabel, { color: active ? tokens.green : tokens.muted }]}>
                      {label.toUpperCase()}
                    </Text>
                    <Text style={[s.modeTabPrice, { color: active ? tokens.text : tokens.muted }]}>
                      {fmtCurrency(price)}
                    </Text>
                    <Text style={[s.modeTabUnit, { color: active ? tokens.green : tokens.muted }]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </View>
        )}

        {/* ── Data de retirada ── */}
        <View style={{ marginBottom: 16 }}>
          <Text style={[s.fieldLabel, { color: tokens.muted }]}>DATA DE RETIRADA</Text>
          <TouchableOpacity
            onPress={() => setShowPicker(true)}
            accessibilityRole="button"
            accessibilityLabel={`Data de retirada: ${fmtDisplayDate(startDate)}. Toque para alterar`}
            style={[s.dateBtn, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
          >
            <Text style={[s.dateBtnDate, { color: tokens.text }]}>
              {fmtDisplayDate(startDate)}
            </Text>
            <Text style={[s.dateBtnChange, { color: tokens.green }]}>Alterar</Text>
          </TouchableOpacity>
          {showPicker && (
            <DateTimePicker
              value={startDate}
              mode="date"
              display={Platform.OS === "ios" ? "spinner" : "default"}
              minimumDate={today}
              onChange={handleDateChange}
            />
          )}
          {showPicker && Platform.OS === "ios" && (
            <TouchableOpacity
              onPress={() => setShowPicker(false)}
              style={{ alignItems: "flex-end", marginTop: 8 }}
            >
              <Text style={[{ color: tokens.green, fontSize: 14, fontWeight: "600" }]}>
                Confirmar
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* ── Quantidade de dias (modo diário) — verbatim de _PriceCalc.tsx 256-292 ── */}
        {mode === "daily" && (
          <View style={{ marginBottom: 16 }}>
            <Text style={[s.fieldLabel, { color: tokens.muted }]}>QUANTIDADE DE DIAS</Text>
            <View style={s.stepper}>
              <TouchableOpacity
                onPress={() => setNumDays((n) => Math.max(1, n - 1))}
                accessibilityRole="button"
                accessibilityLabel="Diminuir dias"
                style={[s.stepBtn, { borderColor: tokens.border }]}
              >
                <Text style={[s.stepBtnText, { color: tokens.muted }]}>−</Text>
              </TouchableOpacity>
              <TextInput
                value={String(numDays)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10)
                  if (!isNaN(n)) setNumDays(Math.min(365, Math.max(1, n)))
                }}
                keyboardType="number-pad"
                accessibilityLabel="Número de dias"
                style={[s.stepInput, { borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text }]}
              />
              <TouchableOpacity
                onPress={() => setNumDays((n) => Math.min(365, n + 1))}
                accessibilityRole="button"
                accessibilityLabel="Aumentar dias"
                style={[s.stepBtn, { borderColor: tokens.border }]}
              >
                <Text style={[s.stepBtnText, { color: tokens.muted }]}>+</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ── Devolução — calculada automaticamente — verbatim de _PriceCalc.tsx 295-321 ── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[s.fieldLabel, { color: tokens.muted }]}>
            DEVOLUÇÃO{" "}
            <Text style={{ fontSize: 10, fontWeight: "400", textTransform: "none" }}>
              (calculado automaticamente)
            </Text>
          </Text>
          <View style={[s.dateReadOnly, { borderColor: tokens.border, backgroundColor: "#F1F5F9" }]}>
            <Text style={[{ color: tokens.text, fontSize: 14 }]}>
              {fmtDisplayDate(endDate)}
            </Text>
          </View>
          <Text style={[s.devNote, { color: tokens.muted }]}>
            {mode === "daily"
              ? `Retirada + ${numDays} dia${numDays > 1 ? "s" : ""} — devolução no mesmo horário da retirada`
              : mode === "weekly"
              ? "Retirada + 7 dias — devolução no mesmo horário da retirada"
              : "Retirada + 30 dias — devolução no mesmo horário da retirada"}
          </Text>
        </View>

        {/* ── Resumo de preço — verbatim de _PriceCalc.tsx linhas 324-373 ── */}
        <View
          style={[s.summary, { backgroundColor: tokens.bg, borderColor: tokens.border }]}
          accessibilityLabel="Resumo de preço"
          accessible
        >
          <Text style={[s.summaryHeader, { color: tokens.muted }]}>RESUMO</Text>

          <View style={s.summaryRow}>
            <Text style={[s.summaryLabel, { color: tokens.muted }]}>
              {mode === "daily"
                ? `${totalDays} dia${totalDays > 1 ? "s" : ""} × ${fmtCurrency(pricePerDay)}`
                : mode === "weekly"
                ? `1 semana × ${fmtCurrency(pricePerWeek ?? 0)}`
                : `1 mês × ${fmtCurrency(pricePerMonth ?? 0)}`}
            </Text>
            <Text style={[s.summaryValue, { color: tokens.text }]}>
              {fmtCurrency(subtotalCents)}
            </Text>
          </View>

          {savingsCents > 0 && (
            <View style={s.summaryRow}>
              <Text style={[s.savingsLabel, { color: tokens.success }]}>🏷️ Desconto por período</Text>
              <Text style={[s.savingsValue, { color: tokens.success }]}>-{fmtCurrency(savingsCents)}</Text>
            </View>
          )}

          <View style={[s.divider, { backgroundColor: tokens.border }]} />

          <View style={s.summaryRow}>
            <Text style={[s.totalLabel, { color: tokens.text }]}>Total do aluguel</Text>
            <Text style={[s.totalValue, { color: tokens.text }]}>{fmtCurrency(subtotalCents)}</Text>
          </View>

          <Text style={[s.feeNote, { color: tokens.muted }]}>
            Você paga apenas o valor da locação. A ShareO retém um percentual do repasse ao proprietário.
          </Text>
        </View>

        {/* ── Aviso de teto R$500 — copy VERBATIM de _PriceCalc.tsx linha 434 ── */}
        {overLimit && (
          <View style={s.limitWarn} accessibilityRole="alert">
            <Text style={s.limitWarnText}>
              ⚠️ O total excede o limite de{" "}
              <Text style={{ fontWeight: "700" }}>
                {fmtCurrency(CHECKOUT_MAX_CENTS)}
              </Text>
              {" "}por locação.{"\n"}
              Reduza a quantidade de dias ou escolha outra modalidade.
            </Text>
          </View>
        )}

        {/* ── Nota ao proprietário — verbatim de _PriceCalc.tsx linhas 376-391 ── */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[s.fieldLabel, { color: tokens.muted }]}>
            MENSAGEM AO PROPRIETÁRIO (OPCIONAL)
          </Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            multiline
            numberOfLines={3}
            maxLength={500}
            placeholder="Ex.: Preciso para um evento no fim de semana…"
            placeholderTextColor={tokens.muted}
            accessibilityLabel="Mensagem opcional ao proprietário"
            style={[
              s.textarea,
              { borderColor: tokens.border, backgroundColor: tokens.surface, color: tokens.text },
            ]}
            textAlignVertical="top"
          />
        </View>

        {/* ── Erro ── */}
        {error && (
          <View style={s.errorBox} accessibilityRole="alert">
            <Text style={s.errorText}>{error}</Text>
            {needsComplete && (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: "/cadastro/completar" as never,
                    params: { callbackUrl: `/itens/${itemId}` },
                  })
                }
                style={{ marginTop: 8 }}
              >
                <Text style={{ color: tokens.green, fontSize: 13, fontWeight: "600" }}>
                  Completar cadastro →
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Estado enviando / sucesso ── */}
        {createBooking.isPending && (
          <View style={[s.stateBox, { backgroundColor: "#EFF6FF", borderColor: "#BFDBFE" }]}>
            <ActivityIndicator size="small" color="#1D4ED8" />
            <Text style={{ color: "#1E40AF", fontSize: 13, marginLeft: 8 }}>Enviando solicitação…</Text>
          </View>
        )}

        {createBooking.isSuccess && (
          <View style={[s.stateBox, { backgroundColor: "#F0FDF4", borderColor: "#86EFAC" }]}>
            <Text style={{ color: "#166534", fontSize: 14, fontWeight: "700" }}>
              ✓ Solicitação enviada com sucesso!
            </Text>
            <Text style={{ color: "#166534", fontSize: 12, marginTop: 4 }}>
              O proprietário precisa confirmar antes do pagamento.
            </Text>
          </View>
        )}

      </ScrollView>

      {/* ── CTA fixo ── */}
      <View
        style={[
          s.cta,
          {
            backgroundColor:  tokens.surface,
            borderTopColor:   tokens.border,
            paddingBottom:    insets.bottom + 12,
          },
        ]}
      >
        <TouchableOpacity
          onPress={handleSolicitar}
          disabled={!isReady || createBooking.isPending}
          accessibilityRole="button"
          accessibilityLabel="Solicitar locação"
          accessibilityState={{ disabled: !isReady || createBooking.isPending }}
          style={[
            s.ctaBtn,
            { backgroundColor: isReady && !createBooking.isPending ? tokens.green : "#94A3B8" },
          ]}
        >
          {createBooking.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.ctaBtnText}>💬 Solicitar locação</Text>
          )}
        </TouchableOpacity>
        <Text style={[s.ctaNote, { color: tokens.muted }]}>
          O proprietário precisa confirmar antes do pagamento
        </Text>
      </View>

    </View>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  backBtn:      { width: 44, height: 44, alignItems: "center", justifyContent: "center" },
  backBtnText:  { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  headerTitle:  { flex: 1, fontSize: 17, fontWeight: "700" },

  // Campos
  fieldLabel: { fontSize: 11, fontWeight: "600", letterSpacing: 0.4, marginBottom: 6 },

  // Tabs de modalidade
  modeTabs: { flexDirection: "row", gap: 8 },
  modeTab: {
    flex: 1, borderWidth: 1, borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 8,
    alignItems: "center",
  },
  modeTabLabel: { fontSize: 9, fontWeight: "700", letterSpacing: 0.5 },
  modeTabPrice: { fontSize: 15, fontWeight: "800", marginTop: 2 },
  modeTabUnit:  { fontSize: 9, marginTop: 1 },

  // Seletor de data
  dateBtn: {
    minHeight: 44, flexDirection: "row", alignItems: "center",
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12,
  },
  dateBtnDate:   { flex: 1, fontSize: 14 },
  dateBtnChange: { fontSize: 14, fontWeight: "600" },
  dateReadOnly: {
    minHeight: 44, justifyContent: "center",
    borderWidth: 1, borderRadius: 8, paddingHorizontal: 12,
  },
  devNote: { fontSize: 11, marginTop: 4, lineHeight: 16 },

  // Stepper de dias
  stepper: { flexDirection: "row", gap: 8 },
  stepBtn: {
    width: 44, height: 44, borderWidth: 1, borderRadius: 8,
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  stepBtnText: { fontSize: 20, lineHeight: 24 },
  stepInput: {
    flex: 1, height: 44, borderWidth: 1, borderRadius: 8,
    textAlign: "center", fontSize: 16, fontWeight: "700",
  },

  // Resumo de preço
  summary: { borderWidth: 1, borderRadius: 12, padding: 16, marginBottom: 16 },
  summaryHeader: { fontSize: 11, fontWeight: "700", letterSpacing: 0.8, marginBottom: 12 },
  summaryRow: { flexDirection: "row", justifyContent: "space-between", marginVertical: 4 },
  summaryLabel:  { fontSize: 13, flex: 1, marginRight: 8 },
  summaryValue:  { fontSize: 13, fontWeight: "600" },
  savingsLabel:  { fontSize: 12, fontWeight: "600" },
  savingsValue:  { fontSize: 12, fontWeight: "600" },
  divider:       { height: 1, marginVertical: 10 },
  totalLabel:    { fontSize: 15, fontWeight: "700" },
  totalValue:    { fontSize: 15, fontWeight: "700" },
  feeNote:       { fontSize: 11, marginTop: 8, lineHeight: 16 },

  // Aviso de teto — copy verbatim de _PriceCalc.tsx
  limitWarn: {
    borderRadius: 10, borderWidth: 1,
    borderColor: "#FCD34D", backgroundColor: "#FFFBEB",
    padding: 12, marginBottom: 16,
  },
  limitWarnText: { color: "#92400E", fontSize: 13, lineHeight: 20 },

  // Textarea
  textarea: {
    borderWidth: 1, borderRadius: 10,
    paddingHorizontal: 12, paddingVertical: 10,
    fontSize: 14, minHeight: 80,
  },

  // Erro
  errorBox:  { backgroundColor: "#FEF2F2", borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: "#FECACA" },
  errorText: { color: "#B91C1C", fontSize: 13 },

  // Estado
  stateBox: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1,
  },

  // CTA
  cta: {
    borderTopWidth: 1, paddingTop: 12, paddingHorizontal: 16,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.08, shadowRadius: 10 },
      android: { elevation: 8 },
    }),
  },
  ctaBtn: {
    minHeight: 52, borderRadius: 12,
    alignItems: "center", justifyContent: "center",
  },
  ctaBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "700" },
  ctaNote:    { fontSize: 11, textAlign: "center", marginTop: 6 },
})
