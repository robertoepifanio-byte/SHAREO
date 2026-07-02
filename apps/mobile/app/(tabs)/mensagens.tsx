// Redirect: mensagens (tab antiga) → chat (tab nova do Lote 2)
// A tela de chat foi movida para (tabs)/chat.tsx conforme BottomNav do Lote 1.
// Este arquivo mantém compatibilidade com links que usam /mensagens.
import { Redirect } from "expo-router"
export default function MensagensRedirect() {
  return <Redirect href="/chat" />
}
