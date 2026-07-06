# ADR-027 — Mapa nativo no app mobile (@rnmapbox/maps)

**Status**: Aceito (execução parcial — bloqueada em build EAS, ver "Itens em Aberto")
**Data**: 2026-07-06
**Decisores**: Arquiteto, fundador
**Contexto de execução**: `docs/plano-mapa-nativo-mobile.md` (pesquisa 2026-07-04)

---

## Contexto

O app mobile tinha o botão "Ver no mapa" (tela Explorar) e o item "Buscar no mapa"
(MobileMenu) abrindo `/itens?view=map` no navegador do site — decisão registrada
de adiar o mapa nativo enquanto o app ainda não existia de fato. Com o app já
maduro (redesign completo, dark mode, ~30 telas nativas), essa foi a última
funcionalidade grande do MVP mobile ainda "vazando" pro navegador.

## Decisão

**`@rnmapbox/maps`** para o mapa nativo do app Android, reusando os mesmos
estilos e token público Mapbox já usados no site (ADR-002).

## Justificativa

**Rejeitadas** (mesmo racional do plano de pesquisa):
- `react-native-maps` — usa Google/Apple Maps por padrão, não aceita estilos
  Mapbox; contradiz o ADR-002 (Mapbox escolhido por custo/customização); criaria
  assimetria visual site×app e exigiria conta Google Cloud nova.
- MapLibre (`@maplibre/maplibre-react-native`) — tokens Mapbox não funcionam;
  exigiria duplicar/migrar estilos sem eliminar o custo do Mapbox no site.

**Aceita**: `@rnmapbox/maps` — compatível com Expo prebuild/EAS Build via config
plugin oficial (sem eject), aceita os MESMOS style URLs do site
(`streets-v12`/`dark-v11` — paridade visual de graça), reusa o token público
(`NEXT_PUBLIC_MAPBOX_TOKEN` → `EXPO_PUBLIC_MAPBOX_TOKEN`), clustering nativo via
`ShapeSource`, suporta New Architecture (Fabric/TurboModules — o app já roda
`newArchEnabled: true`).

## Implementação (2026-07-06)

- `apps/mobile/app.json` — plugin `@rnmapbox/maps` (`RNMapboxMapsImpl: "mapbox"`).
- `apps/mobile/package.json` — `@rnmapbox/maps@^10.3.2`.
- `apps/mobile/.env` + `eas.json` (profiles development/preview) —
  `EXPO_PUBLIC_MAPBOX_TOKEN` (token público, mesmo valor do site).
- `apps/mobile/components/map/ItemsMapNative.tsx` — transcrição de
  `components/items/ItemsMap.tsx`: estilo por tema, GPS best-effort (fallback
  numérico se negado — nunca crasha), clustering (`clusterMaxZoomLevel=14`,
  `clusterRadius=40`), pin `pin-shareo.png`, popup título+preço (o site também
  não tem thumbnail no popup do mapa — mantido idêntico).
- `apps/mobile/components/map/MarkerPopupCard.tsx` — card do popup.
- `apps/mobile/app/itens/mapa.tsx` — tela dedicada (não modal — gestos do
  Mapbox conflitam com bottom sheet), busca `/api/items?limit=100`.
- `apps/mobile/app/(tabs)/explorar.tsx` — botão "Ver no mapa" agora navega
  nativamente (`router.push("/itens/mapa")`) em vez de abrir o navegador.
- `apps/mobile/components/layout/MobileMenu.tsx` — "Buscar no mapa" idem, via
  `ROUTE_ALIASES["/itens?view=map"] = "/itens/mapa"`.
- Teste RNTL cobrindo a navegação nativa do link do menu.

`tsc` + `jest` (26 suites, 593 testes) verdes com as mudanças acima.

## Consequências

**Positivas**:
- Zero telas do app mobile abrem o navegador pra funcionalidade de mapa.
- Paridade visual site×app mantida (mesmos estilos Mapbox).
- Clustering nativo evita poluição visual com >20 pins (o site não precisa —
  só ~20 itens por página lá; o app centraliza "Ver todos" num mapa só).

**Negativas / custos**:
- +5-10 MB no APK dev-client (~5 MB no AAB de produção).
- Depende de `MAPBOX_DOWNLOADS_TOKEN` (secret Mapbox, escopo `Downloads:Read`)
  configurado como env var `RNMAPBOX_MAPS_DOWNLOAD_TOKEN` no ambiente de build —
  **sem esse secret o Gradle falha com 401** ao resolver `com.mapbox.maps:android`.
- Precisa de um novo build EAS (dev-client) para entrar em vigor — mudança de
  dependência nativa, não recarrega via Fast Refresh.
- Reinstalar o dev-client no device apaga sessão/cache local — avisar testador.

## Itens em Aberto (bloqueadores de execução completa)

- [ ] **`MAPBOX_DOWNLOADS_TOKEN`** — não existe como EAS secret neste projeto
  (`eas secret:list` vazio). Precisa ser gerado em
  https://account.mapbox.com/access-tokens/ (token secreto, escopo mínimo
  `Downloads:Read`) e configurado via `eas env:create` / `eas secret:create`
  com o nome **`RNMAPBOX_MAPS_DOWNLOAD_TOKEN`** (nome novo da lib — o antigo
  `RNMapboxMapsDownloadToken` no `app.json` está deprecated e não funciona por
  interpolação de string, foi removido do config).
- [ ] Build EAS supervisionado (`eas build --profile development --platform android`)
  — consome fila do free tier, sessão de device física do fundador.
- [ ] Reinstalar o dev-client no device (desinstalar o antigo antes).
- [ ] Validar em device real: pins, clustering, popup, dark mode, permissão de
  GPS negada/concedida.
- [ ] Google Play Data Safety — mapa é motivo novo de uso de localização,
  revalidar declaração antes de produção.
- [ ] `apps/mobile/lib/__tests__/` — cobertura RNTL de `ItemsMapNative`/`mapa.tsx`
  requer mock de `@rnmapbox/maps` (padrão já usado pra `react-native-svg` em
  `jest.setup.js`) + mock de `expo-location`; não incluído nesta entrega por
  não ser testável sem um build real pra validar contra.
