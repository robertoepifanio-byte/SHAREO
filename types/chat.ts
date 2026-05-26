export interface ChatMessage {
  id: string
  content: string
  senderId: string
  conversationId: string
  readAt: Date | null
  createdAt: Date
}

export interface ConversationParticipant {
  id: string
  name: string | null
  image: string | null
}

export interface ConversationWithLastMessage {
  id: string
  participants: ConversationParticipant[]
  lastMessage: ChatMessage | null
  unreadCount: number
  item: { id: string; title: string; images: Array<{ url: string }> }
}
