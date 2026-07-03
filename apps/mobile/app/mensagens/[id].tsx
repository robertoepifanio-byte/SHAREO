// Fonte: app/mensagens/[id]/page.tsx + app/api/conversations/[id]/route.ts
//        + app/api/conversations/[id]/messages/route.ts
// Thread do chat — polling a cada 5s (Supabase Realtime não é seguro para RN/Expo no MVP).
// Documentado como follow-up: migrar para Supabase Realtime quando canal for estabilizado.
// StyleSheet + tokens; funcionalidade preservada: send + scroll automático.

import React, { useState, useRef, useEffect } from "react"
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { Image } from "expo-image"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface Message {
  id:        string
  body:      string
  readAt:    string | null
  createdAt: string
  sender:    { id: string; name: string }
}

interface ConversationDetail {
  id:        string
  otherUser: { id: string; name: string; avatarUrl: string | null } | null
  booking:   { id: string; item: { id: string; title: string } } | null
  messages:  Message[]
  meta:      { total: number; page: number; limit: number; hasMore: boolean }
}

// Fonte: _ChatWindow.tsx linhas 246-265 (P3-66 — templates de mensagem)
const MESSAGE_TEMPLATES = [
  "Ainda está disponível?",
  "Qual o prazo mínimo?",
  "Posso retirar hoje?",
  "Aceita entrega?",
  "Tenho uma dúvida…",
]

// ── Utilitário de tempo relativo ───────────────────────────────────────────────
// Fonte: app/mensagens/page.tsx — verbatim
function relTime(d: string): string {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "agora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

// Divisor de dia — fonte: _ChatWindow.tsx linhas 37-44 (fmtDay)
function fmtDay(d: string): string {
  const date  = new Date(d)
  const today = new Date()
  const yest  = new Date(); yest.setDate(yest.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return "Hoje"
  if (date.toDateString() === yest.toDateString())  return "Ontem"
  return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "long" })
}

// ── Tela ──────────────────────────────────────────────────────────────────────
export default function ChatScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>()
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const { tokens } = useTheme()
  const [text, setText] = useState("")
  const listRef    = useRef<FlatList>(null)
  const qc         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn:  () => apiFetch<{ data: ConversationDetail }>(`/api/conversations/${id}`),
    enabled:  !!id && !!user,
    // Polling a 5s — Supabase Realtime pendente como follow-up (MOB-BL / chat-realtime)
    refetchInterval: 5000,
  })

  const conv = data?.data

  const send = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/api/conversations/${id}/messages`, {
        method: "POST",
        body: JSON.stringify({ content }),
      }),
    onSuccess: () => {
      setText("")
      qc.invalidateQueries({ queryKey: ["conversation", id] })
      qc.invalidateQueries({ queryKey: ["conversations"] })
      setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100)
    },
  })

  useEffect(() => {
    if (conv?.messages?.length) {
      setTimeout(() => listRef.current?.scrollToEnd({ animated: false }), 100)
    }
  }, [conv?.messages?.length])

  // ── Guard: não autenticado ─────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={{ color: tokens.muted, fontSize: 14 }}>
          Faça login para ver mensagens
        </Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      style={[s.root, { backgroundColor: tokens.bg }]}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >

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
        {conv?.otherUser?.avatarUrl ? (
          <Image
            source={{ uri: conv.otherUser.avatarUrl }}
            style={[s.avatar, { backgroundColor: tokens.border }]}
            contentFit="cover"
          />
        ) : (
          <View style={[s.avatar, { backgroundColor: tokens.navy }]}>
            <Text style={s.avatarInitial}>
              {(conv?.otherUser?.name ?? "").charAt(0).toUpperCase() || "?"}
            </Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[s.convName, { color: tokens.text }]} numberOfLines={1}>
            {conv?.otherUser?.name ?? "…"}
          </Text>
          {/* Item da reserva — clicável, fonte: page.tsx linhas 93-100 */}
          {conv?.booking?.item.title ? (
            <TouchableOpacity
              onPress={() => router.push(`/itens/${conv.booking!.item.id}` as never)}
              accessibilityRole="link"
            >
              <Text style={[s.convItem, { color: tokens.green }]} numberOfLines={1}>
                {conv.booking.item.title}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
        {/* "Ver reserva" — fonte: page.tsx linhas 103-110 */}
        {conv?.booking && (
          <TouchableOpacity
            style={[s.viewBookingBtn, { borderColor: tokens.border }]}
            onPress={() => router.push(`/reservas/${conv.booking!.id}` as never)}
            accessibilityRole="button"
            accessibilityLabel="Ver reserva"
          >
            <Text style={[s.viewBookingBtnText, { color: tokens.text }]}>Ver reserva</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Mensagens ── */}
      {isLoading ? (
        <View style={s.center}>
          <ActivityIndicator size="large" color={tokens.green} />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={conv?.messages ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            // Fonte: _ChatWindow.tsx linhas 200-203 — texto personalizado com o
            // nome do outro participante ("Diga olá para {otherName}!")
            <View style={s.emptyState}>
              <Text style={{ fontSize: 40 }}>💬</Text>
              <Text style={[s.emptyTitle, { color: tokens.muted }]}>
                Nenhuma mensagem ainda. Diga olá para {conv?.otherUser?.name ?? "essa pessoa"}!
              </Text>
            </View>
          }
          renderItem={({ item: m, index }) => {
            const isMe = m.sender.id === user.id
            // Divisor de dia — fonte: _ChatWindow.tsx linhas 208-220
            const day = fmtDay(m.createdAt)
            const prevDay = index > 0 ? fmtDay(conv!.messages[index - 1].createdAt) : null
            const showDay = day !== prevDay
            return (
              <View>
                {showDay && (
                  <View style={s.dayDivider}>
                    <View style={[s.dayDividerLine, { backgroundColor: tokens.border }]} />
                    <Text style={[s.dayDividerText, { color: tokens.muted }]}>{day}</Text>
                    <View style={[s.dayDividerLine, { backgroundColor: tokens.border }]} />
                  </View>
                )}
                <View style={[s.msgRow, { justifyContent: isMe ? "flex-end" : "flex-start" }]}>
                  <View
                    style={[
                      s.bubble,
                      isMe
                        ? [s.bubbleMe, { backgroundColor: tokens.green }]
                        : [s.bubbleOther, { backgroundColor: tokens.surface, borderColor: tokens.border }],
                    ]}
                  >
                    <Text style={[s.bubbleText, { color: isMe ? "#FFFFFF" : tokens.text }]}>
                      {m.body}
                    </Text>
                    <Text
                      style={[
                        s.bubbleTime,
                        { color: isMe ? "rgba(255,255,255,0.7)" : tokens.muted },
                      ]}
                    >
                      {relTime(m.createdAt)}
                      {/* Recibo de leitura — fonte: _ChatWindow.tsx linha 232 */}
                      {isMe && m.readAt && " ✓✓"}
                    </Text>
                  </View>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* ── Templates de mensagem — fonte: _ChatWindow.tsx linhas 246-265 (P3-66) ── */}
      {!text && (
        <View
          style={[
            s.templatesRow,
            { backgroundColor: tokens.surface, borderTopColor: tokens.border },
          ]}
        >
          {MESSAGE_TEMPLATES.map((tpl) => (
            <TouchableOpacity
              key={tpl}
              onPress={() => setText(tpl)}
              style={[s.templateChip, { borderColor: tokens.border, backgroundColor: tokens.bg }]}
              accessibilityRole="button"
              accessibilityLabel={`Usar mensagem: ${tpl}`}
            >
              <Text style={[s.templateChipText, { color: tokens.muted }]}>{tpl}</Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* ── Input ── */}
      <View
        style={[
          s.inputBar,
          {
            borderTopColor:   tokens.border,
            backgroundColor:  tokens.surface,
            paddingBottom:    insets.bottom + 8,
          },
        ]}
      >
        <TextInput
          style={[
            s.textInput,
            {
              backgroundColor: tokens.bg,
              borderColor:     tokens.border,
              color:           tokens.text,
            },
          ]}
          placeholder="Escreva uma mensagem..."
          placeholderTextColor={tokens.muted}
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (text.trim()) send.mutate(text.trim())
          }}
          accessibilityLabel="Campo de mensagem"
        />
        <TouchableOpacity
          style={[
            s.sendBtn,
            { backgroundColor: text.trim() ? tokens.green : tokens.border },
          ]}
          onPress={() => { if (text.trim()) send.mutate(text.trim()) }}
          disabled={!text.trim() || send.isPending}
          accessibilityRole="button"
          accessibilityLabel="Enviar mensagem"
          accessibilityState={{ disabled: !text.trim() || send.isPending }}
        >
          {send.isPending ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Text style={s.sendBtnArrow}>↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  root:   { flex: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },

  // Header
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingBottom: 12, paddingHorizontal: 16,
    borderBottomWidth: 1,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 4 },
      android: { elevation: 2 },
    }),
  },
  backBtn:     { width: 44, height: 44, alignItems: "center", justifyContent: "center", marginRight: 4 },
  backBtnText: { fontSize: 28, fontWeight: "700", lineHeight: 32 },
  avatar:      { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center", overflow: "hidden" },
  avatarInitial:{ fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  convName:    { fontSize: 14, fontWeight: "600" },
  convItem:    { fontSize: 10, marginTop: 1 },
  viewBookingBtn: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 10, minHeight: 32, justifyContent: "center",
  },
  viewBookingBtnText: { fontSize: 11, fontWeight: "700" },

  // Empty state
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", paddingVertical: 64, paddingHorizontal: 32 },
  emptyTitle: { fontSize: 13, fontWeight: "600", marginTop: 10, textAlign: "center", lineHeight: 18 },

  // Divisor de dia
  dayDivider: { flexDirection: "row", alignItems: "center", gap: 10, marginVertical: 14 },
  dayDividerLine: { flex: 1, height: 1 },
  dayDividerText: { fontSize: 11 },

  // Mensagens
  msgRow: { flexDirection: "row", marginBottom: 8 },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  bubbleMe:    { borderTopRightRadius: 4 },
  bubbleOther: { borderTopLeftRadius: 4, borderWidth: 1 },
  bubbleText:  { fontSize: 14, lineHeight: 20 },
  bubbleTime:  { fontSize: 10, marginTop: 3, textAlign: "right" },

  // Templates de mensagem
  templatesRow: {
    flexDirection: "row", flexWrap: "wrap", gap: 6,
    paddingHorizontal: 16, paddingTop: 10, paddingBottom: 2,
    borderTopWidth: 1,
  },
  templateChip: {
    borderWidth: 1, borderRadius: 20,
    paddingHorizontal: 12, minHeight: 32, justifyContent: "center",
  },
  templateChipText: { fontSize: 12 },

  // Input bar
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 8,
    borderTopWidth: 1, paddingHorizontal: 16, paddingTop: 12,
  },
  textInput: {
    flex: 1, borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 14, maxHeight: 120,
  },
  sendBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
  },
  sendBtnArrow: { color: "#FFFFFF", fontSize: 18, fontWeight: "700" },
})
