# ADR-002 — API de Mapas e Geolocalização

**Status**: Aceito  
**Data**: 2026-05-22  
**Decisores**: Arquiteto, PO  
**Revisores**: DevOps (custo)  

---

## Contexto

O ShareO precisa de geolocalização em três contextos:
1. **Busca por proximidade**: encontrar itens dentro de N km de um ponto
2. **Exibição de mapa**: pins dos resultados de busca + detalhe do item
3. **Geocodificação**: converter endereço digitado → coordenadas (lat/lng)

Opções avaliadas: Google Maps Platform, Mapbox, OpenStreetMap + Nominatim (auto-hospedado).

---

## Decisão

**Mapbox** para exibição de mapa e geocodificação no MVP.  
**PostGIS** no Supabase para queries de proximidade (sem API externa).

---

## Justificativa

### Mapbox vs. Google Maps

| Critério | Mapbox | Google Maps |
|---|---|---|
| Free tier | 50.000 map loads/mês | Crédito de US$200/mês (~28k loads) |
| Geocodificação free | 100.000 requests/mês | Limitado ao crédito mensal |
| Preço após free tier | US$0,50/1.000 loads | US$7,00/1.000 loads |
| Cobertura no Brasil | Boa (OpenStreetMap base) | Excelente |
| Integração React | `react-map-gl` (excelente) | `@react-google-maps/api` (ok) |
| Customização visual | Alta (tokens do Design System) | Limitada no free tier |
| Bundle size | ~250 KB (mapbox-gl) | ~200 KB |

**Decisão de custo**: Para o MVP com mercado inicial em Natal/RN, o free tier do Mapbox (50k loads/mês) é suficiente. Google Maps se torna mais vantajoso acima de ~30k usuários ativos/mês — revisar na H2.

> **Atualização (12/06/2026):** por decisão dos fundadores, o lançamento será nacional (não mais restrito a Natal/RN). A análise de custo do free tier permanece válida — o gatilho de revisão continua sendo ~30k usuários ativos/mês, independentemente da geografia.

### PostGIS para queries de proximidade

Queries de proximidade (`ST_DWithin`, `ST_Distance`) executadas diretamente no Supabase/PostgreSQL com a extensão PostGIS. Isso evita round-trips a APIs externas para o caso de uso mais frequente (busca de items próximos).

```sql
-- Exemplo: itens num raio de 10 km de (-5.7945, -35.2110)
SELECT id, title, ST_Distance(
  geom::geography,
  ST_MakePoint(-35.2110, -5.7945)::geography
) AS distance_meters
FROM items
WHERE ST_DWithin(
  geom::geography,
  ST_MakePoint(-35.2110, -5.7945)::geography,
  10000  -- 10 km em metros
)
AND is_active = true
ORDER BY distance_meters;
```

**Nota**: até o Prisma suportar tipos PostGIS nativamente, armazenar lat/lng como `Float` e criar a coluna `geom` via migration SQL raw:
```sql
ALTER TABLE items ADD COLUMN geom geometry(Point, 4326);
UPDATE items SET geom = ST_MakePoint(longitude, latitude);
CREATE INDEX items_geom_idx ON items USING GIST (geom);
```

---

## Configuração

```typescript
// lib/mapbox.ts
export const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN!

// components/Map/ItemsMap.tsx
import Map, { Marker } from "react-map-gl"
import "mapbox-gl/dist/mapbox-gl.css"

// Geocodificação (server-side)
export async function geocodeAddress(address: string) {
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${
    encodeURIComponent(address)
  }.json?country=BR&language=pt&access_token=${MAPBOX_TOKEN}`
  const res = await fetch(url)
  const data = await res.json()
  return data.features[0]?.center // [lng, lat]
}
```

---

## Consequências

**Positivas**:
- Free tier generoso para o MVP
- Customização visual alinhada ao Design System (cores, fontes)
- PostGIS elimina custo de API para busca de proximidade

**Negativas**:
- Cobertura de endereços brasileiros ligeiramente inferior ao Google Maps (aceitável para cidades grandes)
- `mapbox-gl` adiciona ~250 KB ao bundle — mitigar com lazy load do componente de mapa

---

## Itens em Aberto

- [ ] Confirmar que a extensão `postgis` está ativa no projeto Supabase (Settings → Database → Extensions)
- [ ] Definir raio máximo de busca (sugestão: 50 km) e raio default (10 km)
- [ ] Implementar fallback de localização: se usuário não conceder GPS, usar cidade do perfil
- [ ] Revisar custo quando DAU ultrapassar 5.000 (possível migração para Google Maps)
