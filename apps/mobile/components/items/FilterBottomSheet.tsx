// Fonte: app/itens/_FilterTrigger.tsx + app/itens/_FilterForm.tsx + app/itens/_DistanceFilter.tsx
// Transcrição literal do botão "Filtros" e do bottom sheet de filtros do site.
// Seções: Categoria, Preço máx./dia, Distância, Avaliação mínima — mesma ordem do site.
// Adaptações de plataforma documentadas:
//   - Slider de preço → stepper -/+ (sem @react-native-community/slider na dep)
//   - GPS: navigator.geolocation → expo-location (já instalado)
//   - router.push imediato → confirmar via "Ver resultados" (batch de mudanças)

import React, { useEffect, useState } from "react"
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Pressable,
} from "react-native"
import Svg, { Line, Path } from "react-native-svg"
import * as Location from "expo-location"
import { useTheme } from "@/lib/theme"

// ── Tipos ─────────────────────────────────────────────────────────────────────

export interface FilterValues {
  categoryId: string | null  // null = "Todas" (todas as categorias)
  priceMax:   number         // R$, 0–500 (500 = sem filtro; site default)
  dist:       string         // "" | "2" | "5" | "10"
  userLat:    string         // "" quando sem GPS
  userLng:    string         // "" quando sem GPS
  minRating:  string         // "" | "3" | "4" | "5"
}

interface Props {
  isOpen:     boolean
  onClose:    () => void
  categories: { id: string; name: string }[]
  values:     FilterValues
  onApply:    (values: FilterValues) => void
}

// ── Constantes — transcritas verbatim dos arquivos-fonte ──────────────────────

// _DistanceFilter.tsx linhas 15-20
const DIST_OPTIONS = [
  { label: "Até 2 km",  value: "2"  },
  { label: "Até 5 km",  value: "5"  },
  { label: "Até 10 km", value: "10" },
  { label: "Qualquer",  value: ""   },
]

// _FilterForm.tsx linhas 137-142
const RATING_OPTIONS = [
  { label: "Qualquer avaliação", value: "" },
  { label: "★★★★★ 5 estrelas",  value: "5" },
  { label: "★★★★+ 4+",          value: "4" },
  { label: "★★★+  3+",          value: "3" },
]

const PRICE_STEP = 10   // R$10, fonte: _FilterForm.tsx min="0" max="500" step="10"
const PRICE_MAX  = 500  // fonte: _FilterForm.tsx max="500"
const PRICE_MIN  = 0

// ── Componentes auxiliares ────────────────────────────────────────────────────

// Ícone de funil — fonte: _FilterTrigger.tsx SVG linhas 30-33
function FunnelIcon({ color }: { color: string }) {
  return (
    <Svg width={15} height={15} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1="4"  y1="6"  x2="20" y2="6"  strokeLinecap="round"/>
      <Line x1="8"  y1="12" x2="16" y2="12" strokeLinecap="round"/>
      <Line x1="11" y1="18" x2="13" y2="18" strokeLinecap="round"/>
    </Svg>
  )
}

function CloseIcon({ color }: { color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Line x1="18" y1="6"  x2="6"  y2="18" strokeLinecap="round"/>
      <Line x1="6"  y1="6"  x2="18" y2="18" strokeLinecap="round"/>
    </Svg>
  )
}

// Ícone GPS — fonte: _DistanceFilter.tsx SVG (circle+crosshair)
function GpsIcon({ color }: { color: string }) {
  return (
    <Svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2}>
      <Path d="M12 2v3m0 14v3M2 12h3m14 0h3" strokeLinecap="round"/>
      <Path d="M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"/>
    </Svg>
  )
}

// ── Botão trigger "Filtros" — visível somente abaixo de lg (lg:hidden do site) ──

interface FilterTriggerButtonProps {
  hasFilters: boolean
  onPress:    () => void
}

export function FilterTriggerButton({ hasFilters, onPress }: FilterTriggerButtonProps) {
  const { tokens } = useTheme()
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        s.triggerBtn,
        { borderColor: tokens.border, backgroundColor: tokens.surface },
      ]}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel="Abrir filtros"
      accessibilityHint="Abre painel de filtros avançados"
    >
      <View style={s.triggerLeft}>
        <FunnelIcon color={tokens.text} />
        <Text style={[s.triggerLabel, { color: tokens.text }]}>Filtros</Text>
      </View>
      {hasFilters && (
        <View style={s.activeBadge}>
          <Text style={s.activeBadgeText}>Ativos</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

// ── Bottom sheet principal ────────────────────────────────────────────────────

export function FilterBottomSheet({ isOpen, onClose, categories, values, onApply }: Props) {
  const { tokens } = useTheme()

  // Estado local — só aplicado quando "Ver resultados" é pressionado
  const [local,           setLocal]           = useState<FilterValues>(values)
  const [locationLoading, setLocationLoading] = useState(false)
  const [locationActive,  setLocationActive]  = useState(false)

  // Sincroniza ao abrir o sheet com os valores atuais do pai
  useEffect(() => {
    if (isOpen) {
      setLocal(values)
      setLocationActive(!!(values.userLat && values.userLng))
    }
  }, [isOpen]) // eslint-disable-line react-hooks/exhaustive-deps

  function apply() {
    onApply(local)
    onClose()
  }

  function clear() {
    setLocal({
      categoryId: null,
      priceMax:   PRICE_MAX,
      dist:       "",
      userLat:    "",
      userLng:    "",
      minRating:  "",
    })
    setLocationActive(false)
  }

  // GPS — fonte: _DistanceFilter.tsx requestLocation (usando expo-location em vez de
  // navigator.geolocation que não existe no React Native)
  async function requestGPS(distValue: string) {
    const { status } = await Location.requestForegroundPermissionsAsync()
    if (status !== "granted") {
      Alert.alert(
        "Permissão negada",
        "Permite acesso à localização nas configurações do celular.",
        [{ text: "OK" }],
      )
      return
    }
    setLocationLoading(true)
    try {
      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      })
      setLocationActive(true)
      setLocal((v) => ({
        ...v,
        dist:    distValue,
        userLat: String(loc.coords.latitude),
        userLng: String(loc.coords.longitude),
      }))
    } catch {
      Alert.alert("Erro de localização", "Não foi possível obter a localização. Tente novamente.")
    } finally {
      setLocationLoading(false)
    }
  }

  function handleDistSelect(distValue: string) {
    if (!distValue) {
      // "Qualquer" — limpa GPS
      setLocal((v) => ({ ...v, dist: "", userLat: "", userLng: "" }))
      setLocationActive(false)
      return
    }
    if (local.userLat && local.userLng) {
      // GPS já disponível — só muda o raio
      setLocal((v) => ({ ...v, dist: distValue }))
    } else {
      // Precisa pedir GPS — mesmo comportamento do site (_DistanceFilter.tsx linha 89)
      requestGPS(distValue)
    }
  }

  return (
    <Modal
      visible={isOpen}
      animationType="slide"
      transparent
      onRequestClose={onClose}
      accessibilityViewIsModal
    >
      {/* Overlay escuro — idêntico ao overlay do MobileMenu.tsx */}
      <Pressable style={s.overlay} onPress={onClose} accessibilityLabel="Fechar filtros" />

      {/* Sheet */}
      <SafeAreaView style={[s.sheet, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
        {/* Alça de drag (decorativa) */}
        <View style={[s.handle, { backgroundColor: tokens.border }]} />

        {/* Header */}
        <View style={[s.header, { borderBottomColor: tokens.border }]}>
          {/* Título — "Filtros" verbatim de _FilterTrigger.tsx */}
          <Text style={[s.headerTitle, { color: tokens.navy }]}>Filtros</Text>
          <View style={s.headerActions}>
            {/* "Limpar" — equivale ao "Ver todos os anúncios" link do site (apaga filtros) */}
            <TouchableOpacity onPress={clear} accessibilityRole="button" accessibilityLabel="Limpar filtros" style={s.clearBtn}>
              <Text style={[s.clearText, { color: tokens.green }]}>Limpar</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} accessibilityRole="button" accessibilityLabel="Fechar" style={s.closeBtn}>
              <CloseIcon color={tokens.muted} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          contentContainerStyle={s.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── CATEGORIA ── _FilterForm.tsx linhas 66-97 ───────────────── */}
          <View style={[s.section, { borderBottomColor: tokens.border }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>CATEGORIA</Text>
            {/* "Todas" — _FilterForm.tsx linhas 72-82 */}
            <TouchableOpacity
              style={s.radioRow}
              onPress={() => setLocal((v) => ({ ...v, categoryId: null }))}
              accessibilityRole="radio"
              accessibilityState={{ checked: local.categoryId === null }}
            >
              <View style={[s.radioCircle, { borderColor: tokens.border }]}>
                {local.categoryId === null && <View style={s.radioFill} />}
              </View>
              <Text style={[s.radioLabel, { color: tokens.text }]}>Todas</Text>
            </TouchableOpacity>
            {categories.map((cat) => (
              <TouchableOpacity
                key={cat.id}
                style={s.radioRow}
                onPress={() => setLocal((v) => ({ ...v, categoryId: cat.id }))}
                accessibilityRole="radio"
                accessibilityState={{ checked: local.categoryId === cat.id }}
              >
                <View style={[s.radioCircle, { borderColor: tokens.border }]}>
                  {local.categoryId === cat.id && <View style={s.radioFill} />}
                </View>
                <Text style={[s.radioLabel, { color: tokens.text }]}>{cat.name}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* ── PREÇO MÁX./DIA ── _FilterForm.tsx linhas 99-120 ─────────── */}
          {/* Adaptação: slider HTML → stepper +/- (sem @react-native-community/slider) */}
          <View style={[s.section, { borderBottomColor: tokens.border }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>PREÇO MÁX./DIA</Text>
            <View style={s.stepperRow}>
              <Text style={[s.stepperBound, { color: tokens.muted }]}>R$0</Text>
              <View style={s.stepperControls}>
                <TouchableOpacity
                  onPress={() => setLocal((v) => ({ ...v, priceMax: Math.max(PRICE_MIN, v.priceMax - PRICE_STEP) }))}
                  style={[s.stepperBtn, { borderColor: tokens.border }]}
                  disabled={local.priceMax <= PRICE_MIN}
                  accessibilityRole="button"
                  accessibilityLabel="Diminuir preço máximo"
                >
                  <Text style={[s.stepperBtnText, { color: local.priceMax <= PRICE_MIN ? tokens.muted : tokens.text }]}>−</Text>
                </TouchableOpacity>
                <Text style={[s.stepperValue, { color: tokens.text }]}>
                  R${local.priceMax}
                </Text>
                <TouchableOpacity
                  onPress={() => setLocal((v) => ({ ...v, priceMax: Math.min(PRICE_MAX, v.priceMax + PRICE_STEP) }))}
                  style={[s.stepperBtn, { borderColor: tokens.border }]}
                  disabled={local.priceMax >= PRICE_MAX}
                  accessibilityRole="button"
                  accessibilityLabel="Aumentar preço máximo"
                >
                  <Text style={[s.stepperBtnText, { color: local.priceMax >= PRICE_MAX ? tokens.muted : tokens.text }]}>+</Text>
                </TouchableOpacity>
              </View>
              <Text style={[s.stepperBound, { color: tokens.muted }]}>R$500</Text>
            </View>
            {/* Barra de progresso visual (proporcional) */}
            <View style={[s.progressTrack, { backgroundColor: tokens.border }]}>
              <View
                style={[
                  s.progressFill,
                  { width: `${(local.priceMax / PRICE_MAX) * 100}%`, backgroundColor: tokens.green },
                ]}
              />
            </View>
          </View>

          {/* ── DISTÂNCIA ── _DistanceFilter.tsx ──────────────────────────── */}
          <View style={[s.section, { borderBottomColor: tokens.border }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>DISTÂNCIA</Text>
            {DIST_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={s.radioRow}
                onPress={() => handleDistSelect(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: local.dist === opt.value }}
              >
                <View style={[s.radioCircle, { borderColor: tokens.border }]}>
                  {local.dist === opt.value && <View style={s.radioFill} />}
                </View>
                <Text style={[s.radioLabel, { color: tokens.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}

            {/* Estado GPS — _DistanceFilter.tsx linhas 101-146 */}
            {locationActive && local.dist !== "" && (
              <View style={s.locationStatus}>
                <GpsIcon color={tokens.green} />
                <Text style={[s.locationStatusText, { color: tokens.green }]}>
                  Localização ativa
                </Text>
              </View>
            )}
            {!locationActive && local.dist !== "" && (
              <TouchableOpacity
                onPress={() => requestGPS(local.dist)}
                disabled={locationLoading}
                style={[s.gpsBtn, { borderColor: tokens.green + "66", backgroundColor: tokens.green + "0D" }]}
                accessibilityRole="button"
                accessibilityLabel="Usar minha localização"
              >
                {locationLoading
                  ? <ActivityIndicator size="small" color={tokens.green} />
                  : <GpsIcon color={tokens.green} />
                }
                <Text style={[s.gpsBtnText, { color: tokens.green }]}>
                  {locationLoading ? "Obtendo localização…" : "Usar minha localização"}
                </Text>
              </TouchableOpacity>
            )}

            {/* Nota: filtro aplicado nos resultados buscados (mesmo comportamento
                ARQ-ALTO-09 do site — haversine em JS, não no banco) */}
            {local.dist !== "" && !locationActive && !locationLoading && (
              <Text style={[s.distNote, { color: tokens.muted }]}>
                Necessita de permissão de localização para filtrar por distância.
              </Text>
            )}
          </View>

          {/* ── AVALIAÇÃO MÍNIMA ── _FilterForm.tsx linhas 131-156 ─────── */}
          <View style={[s.section, { borderBottomColor: tokens.border }]}>
            <Text style={[s.sectionLabel, { color: tokens.muted }]}>AVALIAÇÃO MÍNIMA</Text>
            {/* Nota: avaliação média não vem de /api/items — filtro aplicado
                client-side quando disponível (mesmo ARQ-ALTO-10 do site) */}
            {RATING_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={s.radioRow}
                onPress={() => setLocal((v) => ({ ...v, minRating: opt.value }))}
                accessibilityRole="radio"
                accessibilityState={{ checked: local.minRating === opt.value }}
              >
                <View style={[s.radioCircle, { borderColor: tokens.border }]}>
                  {local.minRating === opt.value && <View style={s.radioFill} />}
                </View>
                <Text style={[s.radioLabel, { color: tokens.text }]}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {/* Footer — "Ver resultados" — _FilterTrigger.tsx linhas 46-56 */}
        <View style={[s.footer, { borderTopColor: tokens.border, backgroundColor: tokens.surface }]}>
          <TouchableOpacity
            onPress={apply}
            style={[s.applyBtn, { backgroundColor: tokens.green }]}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel="Ver resultados com os filtros selecionados"
          >
            <Text style={s.applyBtnText}>Ver resultados</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  )
}

// ── Estilos — transcritos dos equivalentes Tailwind do site ──────────────────
const s = StyleSheet.create({
  // Overlay — "fixed inset-0 z-40 bg-black/30" (FilterBottomSheet.tsx do site)
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.30)",
  },
  // Sheet — "fixed bottom-0 left-0 right-0 z-50 ... rounded-t-2xl border-t border-border bg-surface"
  // borderTopColor removido — agora inline via tokens.border (já aplicado em SafeAreaView style)
  sheet: {
    position:     "absolute",
    bottom:       0,
    left:         0,
    right:        0,
    maxHeight:    "88%",
    borderTopLeftRadius:  20,
    borderTopRightRadius: 20,
    borderTopWidth:       1,
    shadowColor:          "#000",
    shadowOffset:         { width: 0, height: -4 },
    shadowOpacity:        0.08,
    shadowRadius:         12,
    elevation:            16,
  },
  // Alça de drag decorativa
  handle: {
    width:        40,
    height:       4,
    borderRadius: 2,
    alignSelf:    "center",
    marginTop:    12,
    marginBottom: 4,
  },
  // Header — "flex items-center justify-between px-5 py-4 border-b border-border"
  header: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 20,
    paddingVertical:   14,
    borderBottomWidth: 1,
  },
  headerTitle: {
    fontSize:   16,
    fontWeight: "700",
  },
  headerActions: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  clearBtn: {
    paddingHorizontal: 8,
    paddingVertical:   4,
    minHeight:         44,
    justifyContent:    "center",
  },
  clearText: {
    fontSize:   13,
    fontWeight: "600",
  },
  closeBtn: {
    width:          44,
    height:         44,
    alignItems:     "center",
    justifyContent: "center",
  },
  // Conteúdo do scroll
  content: {
    paddingHorizontal: 20,
    paddingBottom:     8,
  },
  // Seção — "space-y-5" entre seções; "mb-2 block text-[11px] font-semibold uppercase tracking-wider"
  // borderBottomColor removido — agora inline via tokens.border
  section: {
    paddingVertical: 16,
    borderBottomWidth: 1,
  },
  sectionLabel: {
    fontSize:      11,
    fontWeight:    "600",
    letterSpacing: 1,
    marginBottom:  8,
  },
  // Radio — "flex cursor-pointer items-center gap-2 py-1 text-sm text-foreground"
  radioRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    paddingVertical: 6,
    minHeight:     36,
  },
  radioCircle: {
    width:        18,
    height:       18,
    borderRadius: 9,
    borderWidth:  1.5,
    alignItems:   "center",
    justifyContent: "center",
  },
  radioFill: {
    width:           10,
    height:          10,
    borderRadius:    5,
    backgroundColor: "#007B3C",  // --brand
  },
  radioLabel: {
    fontSize:  14,
  },
  // Stepper de preço (adaptação do slider HTML)
  stepperRow: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    marginBottom:  8,
  },
  stepperBound: {
    fontSize: 11,
    minWidth: 30,
  },
  stepperControls: {
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    justifyContent: "center",
    gap:           12,
  },
  stepperBtn: {
    width:          36,
    height:         36,
    borderRadius:   8,
    borderWidth:    1,
    alignItems:     "center",
    justifyContent: "center",
  },
  stepperBtnText: {
    fontSize:   18,
    fontWeight: "600",
    lineHeight: 22,
  },
  stepperValue: {
    fontSize:   14,
    fontWeight: "700",
    minWidth:   56,
    textAlign:  "center",
  },
  // Barra de progresso de preço
  progressTrack: {
    height:       4,
    borderRadius: 2,
    overflow:     "hidden",
  },
  progressFill: {
    height:       4,
    borderRadius: 2,
  },
  // GPS
  locationStatus: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           4,
    marginTop:     8,
  },
  locationStatusText: {
    fontSize: 11,
  },
  gpsBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "center",
    gap:               6,
    marginTop:         8,
    paddingVertical:   8,
    paddingHorizontal: 12,
    borderRadius:      8,
    borderWidth:       1,
    minHeight:         36,
  },
  gpsBtnText: {
    fontSize:   12,
    fontWeight: "600",
  },
  distNote: {
    fontSize:  11,
    marginTop: 6,
    lineHeight: 16,
  },
  // Footer
  footer: {
    paddingHorizontal: 20,
    paddingVertical:   16,
    borderTopWidth:    1,
  },
  // "Ver resultados" — "w-full rounded-lg bg-brand py-3 text-sm font-bold text-white"
  applyBtn: {
    borderRadius:   10,
    paddingVertical: 14,
    alignItems:     "center",
    minHeight:      44,
  },
  applyBtnText: {
    fontSize:   14,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
  // Trigger button (used externally via FilterTriggerButton export)
  triggerBtn: {
    // "lg:hidden mb-5 flex w-full items-center justify-between rounded-xl border border-border bg-surface px-4 py-3 text-sm font-semibold text-foreground"
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    borderRadius:      12,
    borderWidth:       1,
    paddingHorizontal: 16,
    paddingVertical:   12,
    minHeight:         44,
    marginBottom:      12,
  },
  triggerLeft: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
  },
  triggerLabel: {
    fontSize:   13,
    fontWeight: "600",
  },
  // "Ativos" badge — "rounded-full bg-brand px-2 py-0.5 text-xs font-semibold text-white"
  activeBadge: {
    backgroundColor: "#007B3C",
    borderRadius:    999,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  activeBadgeText: {
    fontSize:   11,
    fontWeight: "700",
    color:      "#FFFFFF",
  },
})
