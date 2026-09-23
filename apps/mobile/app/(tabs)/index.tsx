// Fonte: app/page.tsx (site) — home virou a landing de campanha transcrita
// (apps/campanha/components/landing/*), CTAs pra /cadastro, sem formulário de
// lead. Ver revisão pré-go-live, 2026-09-22.
import React from "react"
import { ScrollView, StyleSheet } from "react-native"
import { useTheme } from "@/lib/theme"
import { Hero } from "@/components/home/landing/Hero"
import { ItensParados } from "@/components/home/landing/ItensParados"
import { DoisLados } from "@/components/home/landing/DoisLados"
import { ComoFunciona } from "@/components/home/landing/ComoFunciona"
import { QuantoVale } from "@/components/home/landing/QuantoVale"
import { Confianca } from "@/components/home/landing/Confianca"
import { Fundadores } from "@/components/home/landing/Fundadores"
import { Embaixadores } from "@/components/home/landing/Embaixadores"
import { Faq } from "@/components/home/landing/Faq"
import { Fechamento } from "@/components/home/landing/Fechamento"
import { AppFooter } from "@/components/layout/AppFooter"

export default function HomeScreen() {
  const { tokens } = useTheme()
  return (
    <ScrollView
      style={[styles.scroll, { backgroundColor: tokens.bg }]}
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
    >
      <Hero />
      <ItensParados />
      <DoisLados />
      <ComoFunciona />
      <QuantoVale />
      <Confianca />
      <Fundadores />
      <Embaixadores />
      <Faq />
      <Fechamento />
      <AppFooter />
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
})
