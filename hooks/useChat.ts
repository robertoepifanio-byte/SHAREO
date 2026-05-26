"use client"

import { useEffect, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

interface Message {
  id:        string
  content:   string
  senderId:  string
  createdAt: string
}

/**
 * Hook legado — mantido para retrocompatibilidade.
 * A implementação de chat principal usa Realtime diretamente em _ChatWindow.tsx.
 */
export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!conversationId) return
    const supabase = getSupabaseBrowserClient()
    if (!supabase) return

    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message" }, ({ payload }: { payload: Message }) => {
        setMessages((prev) => [...prev, payload])
      })
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  return { messages }
}
