import { useState, useRef, useEffect } from "react"
import {
  View, Text, TextInput, FlatList, TouchableOpacity,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { useSafeAreaInsets } from "react-native-safe-area-context"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth"

interface Message {
  id:        string
  body:      string
  createdAt: string
  sender:    { id: string; name: string }
}

interface ConversationDetail {
  id:        string
  otherUser: { id: string; name: string; avatarUrl: string | null } | null
  booking:   { item: { title: string } } | null
  messages:  Message[]
  meta:      { total: number; page: number; limit: number; hasMore: boolean }
}

function relTime(d: string) {
  const diff = Date.now() - new Date(d).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1)  return "agora"
  if (mins < 60) return `${mins}m`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24)  return `${hrs}h`
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })
}

export default function ChatScreen() {
  const { id }     = useLocalSearchParams<{ id: string }>()
  const insets     = useSafeAreaInsets()
  const user       = useAuth((s) => s.user)
  const [text, setText] = useState("")
  const listRef    = useRef<FlatList>(null)
  const qc         = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ["conversation", id],
    queryFn:  () => apiFetch<{ data: ConversationDetail }>(`/api/conversations/${id}`),
    enabled:  !!id && !!user,
    refetchInterval: 5000,
  })

  const conv = data?.data

  const send = useMutation({
    mutationFn: (content: string) =>
      apiFetch(`/api/conversations/${id}/messages`, { method: "POST", body: JSON.stringify({ content }) }),
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

  if (!user) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <Text className="text-base text-muted">Faça login para ver mensagens</Text>
      </View>
    )
  }

  return (
    <KeyboardAvoidingView
      className="flex-1 bg-background"
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
    >
      {/* Header */}
      <View
        className="flex-row items-center gap-3 border-b border-border bg-surface px-4 pb-3 pt-4"
        style={{ paddingTop: insets.top + 8 }}
      >
        <TouchableOpacity onPress={() => router.back()} className="mr-1">
          <Text className="text-2xl text-muted">‹</Text>
        </TouchableOpacity>
        <View className="h-9 w-9 items-center justify-center rounded-full bg-primary">
          <Text className="text-sm font-bold text-white">
            {conv?.otherUser?.name[0]?.toUpperCase() ?? "?"}
          </Text>
        </View>
        <View className="flex-1">
          <Text className="text-sm font-semibold text-foreground" numberOfLines={1}>
            {conv?.otherUser?.name ?? "…"}
          </Text>
          {conv?.booking?.item.title && (
            <Text className="text-[10px] text-brand" numberOfLines={1}>
              📦 {conv.booking.item.title}
            </Text>
          )}
        </View>
      </View>

      {/* Messages */}
      {isLoading ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator size="large" color="#007B3C" />
        </View>
      ) : (
        <FlatList
          ref={listRef}
          data={conv?.messages ?? []}
          keyExtractor={(m) => m.id}
          contentContainerStyle={{ padding: 16, flexGrow: 1 }}
          ListEmptyComponent={
            <View className="flex-1 items-center justify-center py-16">
              <Text className="text-4xl">💬</Text>
              <Text className="mt-3 text-sm text-muted">Nenhuma mensagem ainda</Text>
              <Text className="text-xs text-muted">Seja o primeiro a dizer olá!</Text>
            </View>
          }
          renderItem={({ item: m }) => {
            const isMe = m.sender.id === user.id
            return (
              <View className={`mb-2 flex-row ${isMe ? "justify-end" : "justify-start"}`}>
                <View
                  className={`max-w-[75%] rounded-2xl px-3 py-2 ${
                    isMe ? "rounded-tr-sm bg-brand" : "rounded-tl-sm bg-surface border border-border"
                  }`}
                >
                  <Text className={`text-sm ${isMe ? "text-white" : "text-foreground"}`}>
                    {m.body}
                  </Text>
                  <Text className={`mt-0.5 text-[10px] ${isMe ? "text-white/70" : "text-muted"} text-right`}>
                    {relTime(m.createdAt)}
                  </Text>
                </View>
              </View>
            )
          }}
        />
      )}

      {/* Input */}
      <View
        className="flex-row items-end gap-2 border-t border-border bg-surface px-4 py-3"
        style={{ paddingBottom: insets.bottom + 8 }}
      >
        <TextInput
          className="flex-1 rounded-2xl border border-border bg-background px-4 py-2.5 text-sm text-foreground"
          placeholder="Escreva uma mensagem..."
          placeholderTextColor="#94A3B8"
          value={text}
          onChangeText={setText}
          multiline
          maxLength={1000}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (text.trim()) send.mutate(text.trim())
          }}
        />
        <TouchableOpacity
          className={`h-10 w-10 items-center justify-center rounded-full ${
            text.trim() ? "bg-brand" : "bg-border"
          }`}
          onPress={() => { if (text.trim()) send.mutate(text.trim()) }}
          disabled={!text.trim() || send.isPending}
        >
          {send.isPending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text className="text-white font-bold">↑</Text>
          )}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}
