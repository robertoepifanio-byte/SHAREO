# Plano — Mapa nativo no app mobile (pesquisa e preparação, sem execução)

**Status:** pesquisa concluída (2026-07-04, agente `arquiteto-shareo`). Nenhum arquivo foi editado, nenhum build foi feito. Execução requer sessão supervisionada (novo build EAS), não autônoma — ver [[project-mobile-eas-build]] na memória.

**Correção factual importante:** o botão "Ver no mapa" que hoje abre o site via `Linking.openURL('/itens?view=map')` **ainda não existe no código** do app mobile (grep por `"mapa"`, `"view=map"`, `Linking.openURL` deu zero matches fora de `reservas/[id].tsx`). A decisão do fundador (fallback pro site) está registrada como orientação, mas nunca foi implementada. Isso simplifica o futuro PR #4 abaixo — não tem código de fallback pra remover, só adicionar o botão direto pro mapa nativo.

---

## 1. O que o site já faz (o que replicar)

**Componente-fonte:** `components/items/ItemsMap.tsx` (client-only, `next/dynamic ssr:false` via `components/items/ItemsMapLoader.tsx`).

Características a espelhar (regra de transcrição literal do CLAUDE.md):

- Biblioteca: `react-map-gl` + `mapbox-gl`, token `NEXT_PUBLIC_MAPBOX_TOKEN`.
- Estilos: `mapbox://styles/mapbox/streets-v12` (claro) / `dark-v11` (escuro), via `resolvedTheme` do `next-themes`.
- Center default: `NEXT_PUBLIC_DEFAULT_LAT/LNG`, fallback `[-5.7945, -35.211]` (Natal/RN — só default numérico, não citar como produto). Zoom default 11.
- Pin custom: `/icons/pin-shareo.png` (96×132, renderiza 36px), âncora `bottom`.
- Popup ao clicar: título (line-clamp-2, `text-primary`), preço `R$ X,XX/dia` (`text-brand`), link para `/itens/[id]`.
- CTA "Ver todos →" no canto inferior direito, aponta pra `/itens`.
- Sem clustering hoje (só ~20 pins por página).
- Fallback se faltar token/erro: gradiente + emoji 🗺️.
- Pin: `{ id, title, pricePerDay: centavos, lat, lng }`.

**Origem dos dados:** `GET /api/items` (`app/api/items/route.ts`) — já retorna `latitude`/`longitude` truncados a 3 casas decimais (~110m, por privacidade — **não mexer nisso**), `title`, `pricePerDay`, `id`. Sem endpoint `bbox` dedicado; distância calculada em JS (`lib/haversine.ts`) pós-fetch.

## 2. Estado atual do app mobile

- Tela Explorar real: `apps/mobile/app/(tabs)/index.tsx` (não `explorar.tsx`). `useQuery` em `/api/items?q=…&limit=20` → `FlatList` de `ItemCard`. Sem botão de mapa ainda.
- `app.json`: Expo SDK 54, RN 0.81.5, React 19.1, `newArchEnabled: true`, `expo-router 6`, reanimated 4.1.7+worklets 0.5.1. Permissões Android já declaradas: `ACCESS_COARSE_LOCATION`, `ACCESS_FINE_LOCATION`, `CAMERA`, `RECORD_AUDIO`. Plugin `expo-location` já configurado.
- `eas.json`: perfil `development` já usa `developmentClient: true` — **o app já não é Expo Go**, adicionar lib nativa só exige novo build do dev-client, não migração.
- Deps de mapa: nenhuma instalada ainda.

## 3. Biblioteca recomendada: `@rnmapbox/maps`

- Compatível com Expo prebuild/EAS build via config plugin oficial (sem eject).
- Aceita os MESMOS style URLs do site (`streets-v12`/`dark-v11`) — paridade visual de graça.
- Reusa o token público (`NEXT_PUBLIC_MAPBOX_TOKEN` → `EXPO_PUBLIC_MAPBOX_TOKEN`).
- Clustering nativo via `ShapeSource` (`cluster`, `clusterMaxZoomLevel`) + `SymbolLayer`.
- Mantida ativamente; v10.1.31+ suporta new architecture (Fabric/TurboModules) — necessário pois o app já roda `newArchEnabled: true`.
- Custo: precisa de `MAPBOX_DOWNLOADS_TOKEN` (secreto, escopo `Downloads:Read`) via EAS Secrets para o Gradle baixar o SDK nativo. ~5-10MB no APK.

**Rejeitadas:**
- `react-native-maps` — usa Google/Apple Maps por padrão, não aceita styles Mapbox; contradiz ADR-002 (Mapbox escolhido por custo/customização); traria assimetria visual site×app e exigiria conta Google Cloud nova.
- MapLibre (`@maplibre/maplibre-react-native`) — tokens Mapbox não funcionam; exigiria duplicar/migrar styles sem eliminar o custo do Mapbox no site.

**Gatilhos para reavaliar:** Mapbox mudar termos de licença de novo; uso passar do free tier de 50k map loads/mês (mesma revisão que ADR-002 já prevê a ~30k MAU); `@rnmapbox/maps` perder suporte a Fabric.

## 4. Mudanças exatas necessárias

**`apps/mobile/app.json`** — adicionar ao array `plugins`:
```json
[
  "@rnmapbox/maps",
  {
    "RNMapboxMapsImpl": "mapbox",
    "RNMapboxMapsDownloadToken": "${MAPBOX_DOWNLOADS_TOKEN}"
  }
]
```
Sem `RNMapboxMapsVersion` (default estável do plugin). Token secreto via `eas secret:create --scope project --name MAPBOX_DOWNLOADS_TOKEN --value sk.xxxx` (nunca commitado). Permissões Android já cobertas — nada a acrescentar.

**`package.json`:** `@rnmapbox/maps@^10.1.31` (checar changelog por versão mais recente compatível com RN 0.81 + new arch no momento da execução).

**`.env` mobile:** `EXPO_PUBLIC_MAPBOX_TOKEN=pk.xxxxx` (mesmo valor público do site, sem secret leak) + espelhar em EAS secret.

**Prebuild:** `npx expo prebuild --clean` ou deixar o EAS Build gerar tudo sem manter `android/` versionado (recomendado — padrão CNG atual).

**Sair do Expo Go?** Não força — já está fora. Só precisa de um novo `eas build --profile development --platform android`, reinstalar o APK no device (desinstalar o antigo primeiro — certs diferentes não sobrescrevem, isso apaga sessão/cache local, avisar testadores). Depois disso, JS/JSX recarrega via Fast Refresh normalmente; só mudanças de plugin/versão nativa exigem novo build.

## 5. Arquitetura de componente proposta

Tela dedicada (não modal — gestos do Mapbox conflitam com bottom sheet, mapa fullscreen precisa de espaço).

**Novos:**
- `apps/mobile/app/itens/mapa.tsx` — screen, query `/api/items?limit=100`, permissão de localização, renderiza `ItemsMapNative`.
- `apps/mobile/components/map/ItemsMapNative.tsx` — `// Fonte: components/items/ItemsMap.tsx`. `MapView` com styleURL por tema (`apps/mobile/lib/theme.tsx`), `Camera` centrada no GPS ou fallback Brasil, `Images` do pin, `ShapeSource` com clustering (`clusterMaxZoomLevel=14`, `clusterRadius=40`), duas `SymbolLayer` (clusters via `has("point_count")` / pins individuais), `onPress` zoom em cluster ou seleciona item.
- `apps/mobile/components/map/MarkerPopupCard.tsx` — card ao tocar pin (thumbnail+título+preço+"Ver detalhes").
- `apps/mobile/assets/pin-shareo.png` — cópia de `public/icons/pin-shareo.png`.

**Alterado:**
- `apps/mobile/app/(tabs)/index.tsx` — botão flutuante "Ver no mapa" → `router.push({pathname:"/itens/mapa", params:{q: search}})`.

## 6. Contrato de API — sem mudança obrigatória

`GET /api/items` já retorna tudo que precisa. Só aumentar `limit` na chamada do mapa (`?limit=100`). Truncagem de 3 casas decimais é decisão de privacidade do ADR — **não desfazer**, clustering nativo já mascara visualmente bem. Otimização futura opcional (fora de escopo): `?bbox=` no backend para reduzir carga em zoom-out.

## 7. Riscos/gotchas (Windows + Android + EAS)

1. `MAPBOX_DOWNLOADS_TOKEN` sem escopo `Downloads:Read` → Gradle falha com 401 (`Could not resolve com.mapbox.maps:android`) — criar secret ANTES do 1º build.
2. `@rnmapbox/maps` precisa ≥10.1.31 pra new architecture — versão menor crasha em RN 0.81 com `newArchEnabled: true`.
3. Build roda na nuvem (EAS) — path do projeto local (`C:\Users\Roberto\Documents\2026\ShareO`, sem espaço/acento) não deveria travar o Metro.
4. Fila do EAS free tier pode passar de 30min por build — planejar tempo de sessão.
5. Reinstalar dev-client apaga sessão/cache local do device — avisar testador antes.
6. Gesture handler nativo do Mapbox + Reanimated 4 — testar pinch-zoom em build release (dev build tem mais overhead); se der jank, envolver em `GestureHandlerRootView`.
7. `expo-location` — pedir permissão em runtime (`requestForegroundPermissionsAsync`), tratar `DENIED` caindo pro fallback Brasil sem crashar.
8. Ícone do pin precisa ser asset local (`require()`), não vem do backend.
9. Dark mode do app: fundação de tokens existe (`lib/theme.tsx`) mas gated D4 — mapa entra só com `streets-v12` até o toggle ligar de verdade.
10. Regra de transcrição do CLAUDE.md: todo arquivo novo precisa do comentário `// Fonte: ...`; PR precisa de tabela de auditoria; testes RNTL fixam rótulos exatos.
11. Google Play Data Safety: mapa é motivo novo de uso de localização — revalidar declaração antes de produção.
12. +5-10MB no APK dev-client, ~5MB no AAB de produção.

## 8. Esforço estimado — MÉDIO (2-4 dias supervisionados, 4 PRs incrementais)

| PR | Escopo | Esforço | Bloqueio |
|---|---|---|---|
| #1 — Fundação nativa | plugin no app.json, secrets EAS, instalar lib, novo build dev-client, rota sanity `/itens/_mapa-sanity` só com MapView do Brasil | 0.5 dia | fila EAS + reinstalar APK |
| #2 — Mapa com dados reais | `itens/mapa.tsx` + `ItemsMapNative` + query real + pins sem cluster + tap→card→navega pro item | 1 dia | precisa #1 mergeado |
| #3 — Polimento | clustering nativo, dark mode, botão recentralizar, permissão runtime com fallback, ícone custom, testes RNTL | 1 dia | precisa #2 |
| #4 — Integração no Explorar | botão "Ver no mapa" flutuante levando filtros atuais, atualizar `docs/design/mobile-app-handoff.md` | 0.5 dia | precisa #3 |

Incremental: cada PR é utilizável isolado; se `@rnmapbox/maps` der problema, só o PR #1 é revertido.

## 9. Definition of Done

1. Mapa exibe pins de `/api/items?limit=100`.
2. Tap no pin → card com thumbnail/título/preço + "Ver detalhes".
3. "Ver detalhes" navega nativamente para `/itens/[id]` (não abre o site).
4. Style alterna claro/escuro conforme tema do app.
5. Clustering visível com >20 pins no mesmo raio.
6. Centro inicial = GPS do usuário (se permitido) ou Brasil default.
7. Explorar (lista) continua funcional — mapa é adicional.
8. RNTL cobre rótulos exatos ("Mapa de itens", "Ver detalhes").
9. Nenhum arquivo fora de `apps/mobile/` alterado.
10. tsc + lint + jest (mobile e web) verdes antes/depois.
11. `// Fonte:` no header + tabela de auditoria no PR + `docs/design/mobile-app-handoff.md` atualizado.
12. Novo ADR registrando a decisão `@rnmapbox/maps` vs alternativas.

## 10. Fora de escopo desta entrega

- `bbox`/distância server-side em `/api/items` (otimização H2).
- Trocar Mapbox por MapLibre (só se a licença mudar de novo).
- Mapa dentro do detalhe do item mostrando localização aproximada (feature separada, pós-MVP do mapa geral).
- Busca dinâmica pela área visível do mapa (precisa do endpoint bbox acima).

---

**Arquivos-chave lidos nesta pesquisa:** `components/items/ItemsMap.tsx`, `components/items/ItemsMapLoader.tsx`, `app/itens/page.tsx`, `app/api/items/route.ts`, `docs/adr/ADR-002-mapas.md`, `docs/planos/meta-app-android-build.md`, `apps/mobile/app.json`, `apps/mobile/eas.json`, `apps/mobile/package.json`, `apps/mobile/app/(tabs)/index.tsx`, `apps/mobile/app/_layout.tsx`, `apps/mobile/app/itens/[id].tsx`.
