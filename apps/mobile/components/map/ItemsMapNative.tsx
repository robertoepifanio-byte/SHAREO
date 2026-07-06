// Fonte: components/items/ItemsMap.tsx — transcrição do mapa Mapbox do site
// pra @rnmapbox/maps (nativo). Mesmos estilos (streets-v12/dark-v11 por tema),
// mesmo pin (pin-shareo.png), mesmo popup (título+preço, sem thumbnail — o
// site também não tem). Clustering nativo via ShapeSource (o site não tem
// clustering — só ~20 pins por página lá; no app centralizamos "Ver todos"
// num só mapa com mais pins, então clustering evita poluição visual).
//
// Docs/plano-mapa-nativo-mobile.md — arquitetura completa e riscos conhecidos.

import React, { useEffect, useMemo, useRef, useState } from "react"
import { View, Text, StyleSheet } from "react-native"
import Mapbox, {
  MapView,
  Camera,
  ShapeSource,
  SymbolLayer,
  CircleLayer,
  Images,
} from "@rnmapbox/maps"
import * as Location from "expo-location"
import { useTheme } from "@/lib/theme"
import { MarkerPopupCard, type MapPin } from "./MarkerPopupCard"

// @rnmapbox/maps não reexporta OnPressEvent no entrypoint principal (só em
// lib/typescript/src/types/OnPressEvent — caminho interno, não estável entre
// versões) — tipo local equivalente ao que a lib usa internamente.
type OnPressEvent = {
  features:    GeoJSON.Feature[]
  coordinates: { latitude: number; longitude: number }
  point:       { x: number; y: number }
}

const MAPBOX_TOKEN = process.env.EXPO_PUBLIC_MAPBOX_TOKEN ?? ""
if (MAPBOX_TOKEN) Mapbox.setAccessToken(MAPBOX_TOKEN)

// Fallback numérico — mesmo default do site (lib/geocodeItem.ts / ItemsMap.tsx).
// Apenas coordenada de fallback quando sem GPS; não citar cidade na UI (regra
// do lançamento nacional, CLAUDE.md).
const DEFAULT_LAT  = -5.7945
const DEFAULT_LNG  = -35.211
const DEFAULT_ZOOM = 11

const PIN_IMAGE = require("../../assets/icons/pin-shareo.png")

export type MapItem = MapPin & {
  lat: number
  lng: number
}

interface Props {
  items:   MapItem[]
  onOpen:  (id: string) => void
}

export function ItemsMapNative({ items, onOpen }: Props) {
  const { mode, tokens } = useTheme()
  const cameraRef = useRef<Camera>(null)
  const shapeRef  = useRef<ShapeSource>(null)
  const [selected, setSelected] = useState<MapItem | null>(null)
  const [center, setCenter] = useState<{ lat: number; lng: number } | null>(null)

  // URLs literais (não Mapbox.StyleURL.* — o enum da lib usa versões antigas,
  // streets-v11/dark-v10) pra bater exatamente com o site (ItemsMap.tsx).
  const styleURL = mode === "dark"
    ? "mapbox://styles/mapbox/dark-v11"
    : "mapbox://styles/mapbox/streets-v12"

  // GPS — best-effort. Negado/erro cai pro fallback numérico sem travar o mapa
  // (risco #7 do plano: nunca crashar por causa de permissão).
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync()
        if (status !== "granted") return
        const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced })
        if (!cancelled) setCenter({ lat: loc.coords.latitude, lng: loc.coords.longitude })
      } catch {
        // silencioso — mantém fallback numérico
      }
    })()
    return () => { cancelled = true }
  }, [])

  // `Camera defaultSettings` é one-shot (só aplica no mount). Quando o GPS
  // resolve DEPOIS do mount, é preciso re-centrar imperativamente — senão o
  // mapa fica preso no fallback numérico mesmo com a localização disponível.
  // Achado revisão s41.
  useEffect(() => {
    if (!center) return
    cameraRef.current?.setCamera({
      centerCoordinate:  [center.lng, center.lat],
      zoomLevel:         DEFAULT_ZOOM,
      animationDuration: 600,
    })
  }, [center])

  const pins = useMemo(() => items.filter((i) => i.lat != null && i.lng != null), [items])

  const featureCollection = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: pins.map((item) => ({
        type:       "Feature" as const,
        id:         item.id,
        geometry:   { type: "Point" as const, coordinates: [item.lng, item.lat] },
        properties: { id: item.id, title: item.title, pricePerDay: item.pricePerDay },
      })),
    }),
    [pins],
  )

  async function handlePress(event: OnPressEvent) {
    const feature = event.features[0]
    if (!feature) return

    const clusterId = feature.properties?.cluster_id
    if (clusterId != null) {
      // Toca num cluster — expande o zoom até separar os pins (mesmo padrão
      // do exemplo oficial do @rnmapbox/maps para ShapeSource clusterizado).
      const zoom = await shapeRef.current?.getClusterExpansionZoom(clusterId)
      const [lng, lat] = (feature.geometry as GeoJSON.Point).coordinates
      cameraRef.current?.setCamera({
        centerCoordinate: [lng, lat],
        zoomLevel:         zoom ?? DEFAULT_ZOOM + 2,
        animationDuration:  400,
      })
      return
    }

    const { id, title, pricePerDay } = feature.properties as MapItem
    setSelected({ id, title, pricePerDay, lat: 0, lng: 0 })
  }

  if (!MAPBOX_TOKEN) {
    return (
      <View style={[s.fallback, { backgroundColor: tokens.border }]} accessibilityRole="image" accessibilityLabel="Mapa indisponível no momento">
        <Text style={{ fontSize: 48 }}>🗺️</Text>
      </View>
    )
  }

  return (
    <View style={s.root}>
      {/* Mapbox ToS §4.2: o wordmark e a atribuição são obrigatórios — logo e
          attribution ficam habilitados (default). Removidos os `={false}` que
          violavam o ToS (risco de revogação da key). Achado revisão s41. */}
      <MapView
        style={s.map}
        styleURL={styleURL}
        scaleBarEnabled={false}
        accessibilityLabel="Mapa de itens disponíveis para aluguel"
      >
        <Camera
          ref={cameraRef}
          defaultSettings={{
            centerCoordinate: [center?.lng ?? DEFAULT_LNG, center?.lat ?? DEFAULT_LAT],
            zoomLevel:         DEFAULT_ZOOM,
          }}
        />

        <Images images={{ "pin-shareo": PIN_IMAGE }} />

        <ShapeSource
          ref={shapeRef}
          id="items-source"
          shape={featureCollection}
          cluster
          clusterMaxZoomLevel={14}
          clusterRadius={40}
          onPress={handlePress}
        >
          {/* Clusters — círculo + contagem, mesmo padrão do exemplo oficial */}
          <CircleLayer
            id="clusters-circle"
            filter={["has", "point_count"]}
            style={{
              circleColor:        tokens.green,
              circleRadius:       ["step", ["get", "point_count"], 16, 10, 20, 25, 24],
              circleOpacity:      0.85,
              circleStrokeWidth:  2,
              circleStrokeColor:  "#FFFFFF",
            }}
          />
          <SymbolLayer
            id="clusters-count"
            filter={["has", "point_count"]}
            style={{
              textField:      ["get", "point_count"],
              textSize:       12,
              textColor:      "#FFFFFF",
              textFont:       ["Open Sans Bold", "Arial Unicode MS Bold"],
              textAllowOverlap: true,
            }}
          />

          {/* Pins individuais */}
          <SymbolLayer
            id="pins"
            filter={["!", ["has", "point_count"]]}
            style={{
              iconImage:            "pin-shareo",
              iconSize:             0.35,
              iconAnchor:           "bottom",
              iconAllowOverlap:     true,
              iconIgnorePlacement:  true,
            }}
          />
        </ShapeSource>
      </MapView>

      {selected && (
        <MarkerPopupCard
          pin={selected}
          onPress={() => { onOpen(selected.id); setSelected(null) }}
          onClose={() => setSelected(null)}
        />
      )}
    </View>
  )
}

const s = StyleSheet.create({
  root: { flex: 1 },
  map:  { flex: 1 },
  fallback: {
    flex:           1,
    alignItems:     "center",
    justifyContent: "center",
  },
})
