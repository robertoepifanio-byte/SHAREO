// Fonte: app/(tabs)/mensagens.tsx (lógica de API existente) + protótipo mobile-app-prototipo-v1.html (frame Chat)
// Lista de conversas usando a API existente do site (auth Bearer via resolveUserId).
// Empty state: texto exato da spec — "Nenhuma conversa ainda" / "Quando você solicitar ou
// receber uma reserva, a conversa aparecerá aqui." (sem botão — conforme spec Lote 2).
// Thread + realtime documentados como follow-up (ver PR).

import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, RefreshControl, StyleSheet } from "react-native"
import { router } from "expo-router"
import { useQuery } from "@tanstack/react-query"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"
import { useTheme } from "@/lib/theme"
import { Avatar } from "@/components/ui/Avatar"

interface Conversation {
  id:          string
  updatedAt:   string
  unreadCount: number
  otherUser:   { id: string; name: string; avatarUrl: string | null } | null
  lastMessage: { body: string; createdAt: string; senderId: string } | null
  booking:     { item: { title: string } } | null
}

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "agora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return `${Math.floor(hrs / 24)}d`
}

export default function ChatScreen() {
  const { tokens } = useTheme()
  const user = useAuth((s) => s.user)

  const { data, isLoading, isRefetching, refetch } = useQuery({
    queryKey: ["conversations"],
    queryFn:  () => apiFetch<{ data: Conversation[] }>("/api/conversations"),
    enabled:  !!user,
  })

  const convs = data?.data ?? []

  // ── Não logado ────────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <Text style={s.icon}>💬</Text>
        <Text style={[s.gateTitle, { color: tokens.navy }]}>
          Faça login para ver suas mensagens
        </Text>
        <TouchableOpacity
          style={s.loginBtn}
          onPress={() => router.push("/(auth)/login")}
          activeOpacity={0.85}
          accessibilityRole="button"
        >
          <Text style={s.loginBtnText}>Entrar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  // ── Loading ───────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <View style={[s.center, { backgroundColor: tokens.bg }]}>
        <ActivityIndicator size="large" color="#007B3C" />
      </View>
    )
  }

  // ── Empty state — texto exato da spec ─────────────────────────────────────
  if (convs.length === 0) {
    return (
      <View style={[s.screen, { backgroundColor: tokens.bg }]}>
        <View style={s.center}>
          <Text style={s.icon}>💬</Text>
          {/* Título e descrição: texto VERBATIM da spec Lote 2 */}
          <Text style={[s.emptyTitle, { color: tokens.navy }]}>Nenhuma conversa ainda</Text>
          <Text style={[s.emptyDesc, { color: tokens.muted }]}>
            Quando você solicitar ou receber uma reserva, a conversa aparecerá aqui.
          </Text>
          {/* Sem botão — conforme spec Lote 2 */}
        </View>
      </View>
    )
  }

  // ── Lista de conversas ────────────────────────────────────────────────────
  return (
    <View style={[s.screen, { backgroundColor: tokens.bg }]}>
      <FlatList
        data={convs}
        keyExtractor={(c) => c.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor="#007B3C" />
        }
        ItemSeparatorComponent={() => <View style={[s.sep, { backgroundColor: tokens.border }]} />}
        renderItem={({ item: c }) => {
          // isUnread — fonte: app/mensagens/page.tsx linhas 79-80 (aqui via
          // unreadCount, que já reflete o mesmo cálculo server-side)
          const isUnread = c.unreadCount > 0
          return (
          <TouchableOpacity
            style={[s.convRow, { backgroundColor: tokens.surface }]}
            onPress={() => router.push(`/mensagens/${c.id}`)}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={
              c.otherUser
                ? `Conversa com ${c.otherUser.name}${isUnread ? `, ${c.unreadCount} mensagens não lidas` : ""}`
                : "Conversa"
            }
          >
            {/* Avatar com inicial */}
            <Avatar
              name={c.otherUser?.name ?? "?"}
              imageUrl={c.otherUser?.avatarUrl ?? null}
              size="md"
            />

            <View style={s.convBody}>
              <View style={s.convHeader}>
                {/* Nome — negrito se não lida, senão peso normal (fonte: page.tsx linha 99) */}
                <Text
                  style={[
                    s.convName,
                    { color: tokens.text, fontWeight: isUnread ? "700" : "400", opacity: isUnread ? 1 : 0.8 },
                  ]}
                >
                  {c.otherUser?.name ?? "Usuário"}
                </Text>
                {c.lastMessage && (
                  <Text style={[s.convTime, { color: tokens.muted }]}>
                    {relTime(c.lastMessage.createdAt)}
                  </Text>
                )}
              </View>

              {/* Item da reserva */}
              {c.booking?.item.title && (
                <Text style={[s.convItem, { color: "#007B3C" }]} numberOfLines={1}>
                  {c.booking.item.title}
                </Text>
              )}

              {/* Última mensagem — prefixo "Você: " + negrito se não lida (fonte: page.tsx linhas 109-113) */}
              {c.lastMessage && (
                <Text
                  style={[
                    s.convLast,
                    { color: isUnread ? tokens.text : tokens.muted, fontWeight: isUnread ? "600" : "400" },
                  ]}
                  numberOfLines={1}
                >
                  {c.lastMessage.senderId === user.id ? "Você: " : ""}{c.lastMessage.body}
                </Text>
              )}
            </View>

            {/* Badge de não lidas — o site usa só uma bolinha indicadora (sem
                número); mobile mostra a contagem real (já vem correta da API),
                adaptação de plataforma aceita — mesmo critério do diálogo de
                confirmação de logout em perfil.tsx. */}
            {isUnread && (
              <View style={s.unreadBadge}>
                <Text style={s.unreadText}>{c.unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          )
        }}
      />
    </View>
  )
}

const s = StyleSheet.create({
  screen: {
    flex: 1,
  },
  center: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  icon: {
    fontSize:    48,
    marginBottom: 12,
  },
  gateTitle: {
    fontSize:    16,
    fontWeight:  "600",
    textAlign:   "center",
    marginBottom: 20,
  },
  loginBtn: {
    backgroundColor:  "#007B3C",
    borderRadius:     8,
    minHeight:        44,
    paddingHorizontal: 32,
    paddingVertical:   12,
    alignItems:       "center",
  },
  loginBtnText: {
    fontSize:   14,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  emptyTitle: {
    fontSize:    16,
    fontWeight:  "600",
    textAlign:   "center",
    marginBottom: 8,
  },
  emptyDesc: {
    fontSize:  13,
    textAlign: "center",
    lineHeight: 19,
    maxWidth:  240,
  },
  sep: {
    height: 1,
  },
  convRow: {
    flexDirection:    "row",
    alignItems:       "center",
    paddingHorizontal: 16,
    paddingVertical:   12,
    gap:              12,
    minHeight:        72,
  },
  convBody: {
    flex:     1,
    minWidth: 0,
  },
  convHeader: {
    flexDirection:  "row",
    alignItems:     "center",
    justifyContent: "space-between",
    marginBottom:   2,
  },
  convName: {
    fontSize:   14,
    fontWeight: "600",
  },
  convTime: {
    fontSize: 11,
  },
  convItem: {
    fontSize:    10,
    fontWeight:  "500",
    marginBottom: 2,
  },
  convLast: {
    fontSize: 12,
  },
  unreadBadge: {
    backgroundColor:  "#007B3C",
    borderRadius:     12,
    minWidth:         20,
    height:           20,
    alignItems:       "center",
    justifyContent:   "center",
    paddingHorizontal: 4,
  },
  unreadText: {
    fontSize:   10,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
})
