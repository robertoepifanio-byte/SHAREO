"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/lib/supabase/client"

interface Message {
  id: string
  content: string
  senderId: string
  createdAt: string
}

export function useChat(conversationId: string) {
  const [messages, setMessages] = useState<Message[]>([])

  useEffect(() => {
    if (!conversationId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`conversation:${conversationId}`)
      .on("broadcast", { event: "message" }, ({ payload }) => {
        setMessages(prev => [...prev, payload as Message])
      })
      .subscribe()
    return () => { supabase.removeChannel(channel) }
  }, [conversationId])

  return { messages }
}
