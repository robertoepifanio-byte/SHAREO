/**
 * ShareO — Catálogo curado para o seed de demonstração de staging
 * ---------------------------------------------------------------
 * ~30 produtos reais distribuídos nas 7 categorias existentes.
 * Cada produto tem EXATAMENTE 3 URLs Unsplash verificadas (HTTP 200)
 * que mostram aquele produto específico.
 *
 * URLs foram verificadas em 2026-06-17. Formato:
 *   https://images.unsplash.com/photo-<id>?w=1200&q=80&auto=format&fit=crop
 */

// ─────────────────────────────────────────────────────────────────────────────
// Tipos
// ─────────────────────────────────────────────────────────────────────────────

export type ItemCondition = "NEW" | "EXCELLENT" | "GOOD" | "FAIR"

export interface CatalogItem {
  categorySlug: string
  title: string
  description: string
  condition: ItemCondition
  estimatedRetailReais: number
  pricePerDayReais: number
  // pricePerWeek = 3× diária, pricePerMonth = 15× diária (derivados no seed)
  images: [string, string, string] // exatamente 3 URLs Unsplash verificadas
}

export interface City {
  city: string
  state: string // 2 letras
  lat: number
  lng: number
  bairros: string[]
}

// ─────────────────────────────────────────────────────────────────────────────
// Catálogo de produtos (~30 itens, 7 categorias)
// ─────────────────────────────────────────────────────────────────────────────

export const CATALOG: CatalogItem[] = [
  // ── ferramentas (5 itens, diária R$30–50) ──────────────────────────────────
  {
    categorySlug: "ferramentas",
    title: "Furadeira de Impacto Bosch 20V",
    description:
      "Furadeira parafusadeira de impacto sem fio, bateria 20V, maleta com 2 baterias e carregador. Torque 65 Nm. Ideal para marcenaria, gesso e alvenaria leve.",
    condition: "EXCELLENT",
    estimatedRetailReais: 650,
    pricePerDayReais: 35,
    images: [
      "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "ferramentas",
    title: "Serra Circular Makita 7¼\"",
    description:
      "Serra circular profissional 1800W, disco de 185 mm incluso. Guia paralela e coletor de pó. Ótima para cortes em madeira e compensado.",
    condition: "GOOD",
    estimatedRetailReais: 800,
    pricePerDayReais: 40,
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "ferramentas",
    title: "Lixadeira Orbital Bosch 300W",
    description:
      "Lixadeira orbital 300W com sistema anti-vibração. Acompanha folhas de lixa de grão 60/80/120/180. Perfeita para acabamento em móveis e pisos.",
    condition: "EXCELLENT",
    estimatedRetailReais: 450,
    pricePerDayReais: 30,
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "ferramentas",
    title: "Esmerilhadeira Angular 9\" DeWalt",
    description:
      "Esmerilhadeira de 9 polegadas 2400W, disco de corte e desbaste inclusos. Protetor ajustável. Para metais, pedra e concreto.",
    condition: "GOOD",
    estimatedRetailReais: 750,
    pricePerDayReais: 38,
    images: [
      "https://images.unsplash.com/photo-1618090584176-7132b9911657?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1590959651373-a3db0f38a961?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "ferramentas",
    title: "Nível a Laser com Tripé Bosch",
    description:
      "Nível a laser autonivelante 30m de alcance, 3 linhas (horizontal + vertical). Tripé ajustável incluso. Indispensável para instalações e reformas.",
    condition: "NEW",
    estimatedRetailReais: 1200,
    pricePerDayReais: 50,
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80&auto=format&fit=crop",
    ],
  },

  // ── eletronicos (5 itens, diária R$80–150) ─────────────────────────────────
  {
    categorySlug: "eletronicos",
    title: "Projetor Epson Full HD 3500 lúmens",
    description:
      "Projetor Full HD 1080p, 3500 lúmens, HDMI e USB. Ótimo para apresentações, home theater e eventos. Cabo HDMI 5m incluso.",
    condition: "EXCELLENT",
    estimatedRetailReais: 4500,
    pricePerDayReais: 100,
    images: [
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1605106702842-01a887a31122?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "eletronicos",
    title: "Câmera Sony Alpha A6400 + Lente 16-50mm",
    description:
      "Câmera mirrorless 24MP, vídeo 4K, foco automático por rastreamento de olhos. Lente kit 16-50mm, 2 baterias, cartão 64GB e bolsa inclusa.",
    condition: "EXCELLENT",
    estimatedRetailReais: 7000,
    pricePerDayReais: 130,
    images: [
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1522338242992-e1a54906a8da?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "eletronicos",
    title: "Drone DJI Mini 3 Pro",
    description:
      "Drone DJI Mini 3 Pro com câmera 4K HDR, 3 sensores de obstáculos. Bateria Plus: 47min de voo. Controle RC-N1 incluso. Perfeito para fotografia aérea.",
    condition: "EXCELLENT",
    estimatedRetailReais: 8000,
    pricePerDayReais: 150,
    images: [
      "https://images.unsplash.com/photo-1473968512647-3e447244af8f?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "eletronicos",
    title: "GoPro Hero 12 Black + Acessórios",
    description:
      "GoPro Hero 12 Black 5.3K, à prova d'água até 10m. Kit completo: case, suporte capacete, peito, monopod e 2 baterias. Ideal para esportes e viagens.",
    condition: "EXCELLENT",
    estimatedRetailReais: 3000,
    pricePerDayReais: 85,
    images: [
      "https://images.unsplash.com/photo-1512499617640-c74ae3a79d37?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "eletronicos",
    title: "Caixa de Som JBL Xtreme 3",
    description:
      "Caixa de som portátil JBL Xtreme 3, 100W, à prova d'água IPX7, 15h de bateria, Bluetooth 5.1. Perfeita para eventos ao ar livre e festas intimistas.",
    condition: "GOOD",
    estimatedRetailReais: 2800,
    pricePerDayReais: 80,
    images: [
      "https://images.unsplash.com/photo-1608043152269-423dbba4e7e1?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1547394765-185e1e68f34e?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1545454675-3531b543be5d?w=1200&q=80&auto=format&fit=crop",
    ],
  },

  // ── casa-jardim (4 itens, diária R$25–40) ──────────────────────────────────
  {
    categorySlug: "casa-jardim",
    title: "Lavadora de Alta Pressão Kärcher K5",
    description:
      "Lavadora de pressão Kärcher K5, 500lb/pol², 2000W, mangueira 8m, bico regulável e lança Vario Power. Ideal para lavar carros, calçadas e fachadas.",
    condition: "GOOD",
    estimatedRetailReais: 1800,
    pricePerDayReais: 40,
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1469719847081-4757697d117a?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "casa-jardim",
    title: "Cortador de Grama a Bateria Ego",
    description:
      "Cortador de grama a bateria 56V sem emissões, silencioso. Largura de corte 42cm, 6 alturas (25–90mm). Bateria 2.5Ah e carregador incluso.",
    condition: "EXCELLENT",
    estimatedRetailReais: 2500,
    pricePerDayReais: 35,
    images: [
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "casa-jardim",
    title: "Aspirador de Pó e Água Electrolux 20L",
    description:
      "Aspirador 20 litros, 1600W, função sopro, filtro HEPA, 3m de mangueira. Aspira sólidos e líquidos. Bivolt.",
    condition: "GOOD",
    estimatedRetailReais: 900,
    pricePerDayReais: 28,
    images: [
      "https://images.unsplash.com/photo-1563453392212-326f5e854473?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1585659722983-3a675dabf23d?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "casa-jardim",
    title: "Aparador de Grama e Bordas Black+Decker",
    description:
      "Aparador de grama elétrico 550W, fio nylon duplo, cabo telescópico. Cabeçote pivotante 90° para bordas. Perfeito para jardins residenciais.",
    condition: "GOOD",
    estimatedRetailReais: 500,
    pricePerDayReais: 25,
    images: [
      "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80&auto=format&fit=crop",
    ],
  },

  // ── construcao (4 itens, diária R$40–90) ───────────────────────────────────
  {
    categorySlug: "construcao",
    title: "Betoneira Elétrica 120L Menegotti",
    description:
      "Betoneira 120 litros, motor 0.5CV, basculante manual. Ideal para obras residenciais, calçadas e alvenaria. Roda 220V.",
    condition: "GOOD",
    estimatedRetailReais: 2200,
    pricePerDayReais: 65,
    images: [
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "construcao",
    title: "Escada Extensível Alumínio 7m",
    description:
      "Escada extensível de alumínio, 7m, suporta 150kg. Travas de segurança automáticas em cada degrau. Pés antiderrapantes. Fácil transporte.",
    condition: "GOOD",
    estimatedRetailReais: 1500,
    pricePerDayReais: 45,
    images: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1494891848038-7bd202a2afeb?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "construcao",
    title: "Martelete Demolidor SDS-Plus Bosch",
    description:
      "Martelete demolidor Bosch 800W, SDS-Plus, função rotopercussão e cinzel. Acompanha broca 16mm e cinzel plano. Para concreto e alvenaria.",
    condition: "GOOD",
    estimatedRetailReais: 1800,
    pricePerDayReais: 60,
    images: [
      "https://images.unsplash.com/photo-1562157873-818bc0726f68?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1572981779307-38b8cabb2407?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "construcao",
    title: "Andaime Metálico Tubular 1,5m × 1m",
    description:
      "Andaime metálico tubular, 1,5m × 1,0m, capacidade 300kg. Inclui plataforma, rodas com trava e guarda-corpo. Fácil montagem sem ferramentas.",
    condition: "GOOD",
    estimatedRetailReais: 1200,
    pricePerDayReais: 55,
    images: [
      "https://images.unsplash.com/photo-1503387762-592deb58ef4e?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1581094794329-c8112a89af12?w=1200&q=80&auto=format&fit=crop",
    ],
  },

  // ── esporte (4 itens, diária R$45–110) ─────────────────────────────────────
  {
    categorySlug: "esporte",
    title: "Bicicleta MTB Aro 29 Shimano 21v",
    description:
      "Mountain bike aro 29, quadro alumínio, câmbio Shimano 21v, freios a disco mecânicos. Suspensão dianteira. Tamanho M. Capacidade 120kg.",
    condition: "GOOD",
    estimatedRetailReais: 2000,
    pricePerDayReais: 60,
    images: [
      "https://images.unsplash.com/photo-1485965120184-e220f721d03e?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1571068316344-75bc76f77890?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1532298229144-0ec0c57515c7?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "esporte",
    title: "Barraca de Camping 4 Pessoas Coleman",
    description:
      "Barraca para 4 pessoas, 2 quartos + sala, proteção UV50+, impermeável 1500mm. Montagem em 10min. Acompanha estacas, corda e bolsa.",
    condition: "EXCELLENT",
    estimatedRetailReais: 1200,
    pricePerDayReais: 55,
    images: [
      "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1537225228614-56cc3556d7ed?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "esporte",
    title: "Prancha de SUP Inflável 10'6\"",
    description:
      "Stand-up paddle inflável 10'6\", 320 × 76 × 15cm, 180kg de carga. Inclui remo ajustável alumínio, bomba, bolsa e leash. Ótima estabilidade.",
    condition: "EXCELLENT",
    estimatedRetailReais: 3000,
    pricePerDayReais: 90,
    images: [
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1499914485622-a88fac536970?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "esporte",
    title: "Caiaque Individual Rígido 3m Kayak",
    description:
      "Caiaque individual polietileno, 3m, 20kg, capacidade 100kg. Banco acolchoado ajustável, porta-bagagem, dreno. Ideal para rios calmos e represas.",
    condition: "GOOD",
    estimatedRetailReais: 2800,
    pricePerDayReais: 95,
    images: [
      "https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1574158622682-e40e69881006?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530053969600-caed2596d242?w=1200&q=80&auto=format&fit=crop",
    ],
  },

  // ── festas (4 itens, diária R$60–130) ──────────────────────────────────────
  {
    categorySlug: "festas",
    title: "Kit Som Profissional — Colunas + Mesa + Mic",
    description:
      "Kit completo: 2 colunas ativas 500W + mesa de som 8 canais + 2 microfones sem fio UHF. Cabos e suporte de microfone incluso. Até 200 pessoas.",
    condition: "GOOD",
    estimatedRetailReais: 8000,
    pricePerDayReais: 130,
    images: [
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1598488035139-bdbb2231ce04?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1470229722913-7c0e2dbbafd3?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "festas",
    title: "Tenda Gazebo 3×3m Impermeável",
    description:
      "Tenda tipo gazebo 3×3m, estrutura alumínio, cobertura poliéster 240g/m² impermeável, proteção UV50+. Montagem em 15min. 4 paredes laterais opcionais.",
    condition: "GOOD",
    estimatedRetailReais: 1500,
    pricePerDayReais: 75,
    images: [
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "festas",
    title: "Conjunto 10 Mesas + 80 Cadeiras Plástico",
    description:
      "10 mesas redondas 1,5m diâmetro + 80 cadeiras plástico brancas empilháveis. Para até 80 convidados. Entrega e retirada negociável na região.",
    condition: "GOOD",
    estimatedRetailReais: 4000,
    pricePerDayReais: 120,
    images: [
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=1200&q=80&auto=format&fit=crop",
    ],
  },
  {
    categorySlug: "festas",
    title: "Painel de LED 2×3m — Arco Personalizado",
    description:
      "Painel de LED flexível 2×3m, com controle remoto RGB, 16 cores e efeitos. Estrutura de arco inclusa. Instala em 20min. Ótimo para festas e ensaios fotográficos.",
    condition: "EXCELLENT",
    estimatedRetailReais: 2500,
    pricePerDayReais: 90,
    images: [
      "https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&q=80&auto=format&fit=crop",
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=1200&q=80&auto=format&fit=crop",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Cidades (12 maiores capitais brasileiras)
// ─────────────────────────────────────────────────────────────────────────────

export const CITIES: City[] = [
  {
    city: "São Paulo",
    state: "SP",
    lat: -23.5505,
    lng: -46.6333,
    bairros: [
      "Pinheiros", "Vila Mariana", "Moema", "Itaim Bibi", "Tatuapé",
      "Santana", "Butantã", "Perdizes", "Lapa", "Brooklin",
    ],
  },
  {
    city: "Rio de Janeiro",
    state: "RJ",
    lat: -22.9068,
    lng: -43.1729,
    bairros: [
      "Botafogo", "Copacabana", "Ipanema", "Barra da Tijuca", "Tijuca",
      "Méier", "Niterói", "Santa Teresa", "Flamengo", "Lapa",
    ],
  },
  {
    city: "Brasília",
    state: "DF",
    lat: -15.7801,
    lng: -47.9292,
    bairros: [
      "Asa Norte", "Asa Sul", "Sudoeste", "Noroeste", "Lago Norte",
      "Lago Sul", "Guará", "Taguatinga", "Ceilândia", "Samambaia",
    ],
  },
  {
    city: "Salvador",
    state: "BA",
    lat: -12.9714,
    lng: -38.5014,
    bairros: [
      "Barra", "Vitória", "Pelourinho", "Pituba", "Ondina",
      "Rio Vermelho", "Itaigara", "Caminho das Árvores", "Brotas", "Liberdade",
    ],
  },
  {
    city: "Fortaleza",
    state: "CE",
    lat: -3.7319,
    lng: -38.5267,
    bairros: [
      "Meireles", "Aldeota", "Varjota", "Cocó", "Benfica",
      "Centro", "Fátima", "Parquelândia", "Maraponga", "Messejana",
    ],
  },
  {
    city: "Belo Horizonte",
    state: "MG",
    lat: -19.9167,
    lng: -43.9345,
    bairros: [
      "Savassi", "Lourdes", "Funcionários", "Gutierrez", "Santa Efigênia",
      "Pampulha", "Buritis", "Belvedere", "Mangabeiras", "Cidade Nova",
    ],
  },
  {
    city: "Manaus",
    state: "AM",
    lat: -3.1019,
    lng: -60.025,
    bairros: [
      "Centro", "Adrianópolis", "Ponta Negra", "Chapada", "Vieiralves",
      "Flores", "Parque 10", "Cachoeirinha", "Aleixo", "São Geraldo",
    ],
  },
  {
    city: "Curitiba",
    state: "PR",
    lat: -25.4284,
    lng: -49.2733,
    bairros: [
      "Batel", "Água Verde", "Bigorrilho", "Centro", "Mercês",
      "Portão", "Santa Felicidade", "Bacacheri", "Cristo Rei", "Rebouças",
    ],
  },
  {
    city: "Recife",
    state: "PE",
    lat: -8.0576,
    lng: -34.8829,
    bairros: [
      "Boa Viagem", "Boa Vista", "Casa Forte", "Espinheiro", "Graças",
      "Aflitos", "Torre", "Parnamirim", "Madalena", "Encruzilhada",
    ],
  },
  {
    city: "Porto Alegre",
    state: "RS",
    lat: -30.0346,
    lng: -51.2177,
    bairros: [
      "Moinhos de Vento", "Auxiliadora", "Bela Vista", "Bom Fim", "Cidade Baixa",
      "Petrópolis", "Menino Deus", "Jardim Botânico", "Boa Vista", "Santana",
    ],
  },
  {
    city: "Goiânia",
    state: "GO",
    lat: -16.6864,
    lng: -49.2643,
    bairros: [
      "Setor Bueno", "Jardim Goiás", "Setor Sul", "Marista", "Jardim América",
      "Setor Oeste", "Setor Universitário", "Alto da Glória", "Jardim Europa", "Campinas",
    ],
  },
  {
    city: "Belém",
    state: "PA",
    lat: -1.4558,
    lng: -48.4902,
    bairros: [
      "Batista Campos", "Nazaré", "Umarizal", "Marco", "Pedreira",
      "Cremação", "Fátima", "Sacramenta", "Guamá", "São Brás",
    ],
  },
]

// ─────────────────────────────────────────────────────────────────────────────
// Pool de nomes
// ─────────────────────────────────────────────────────────────────────────────

export const PF_FIRST_NAMES = [
  "Ana", "Bruno", "Carla", "Diego", "Eduarda", "Felipe", "Gabriela",
  "Henrique", "Isabela", "João", "Larissa", "Marcelo", "Natália", "Otávio",
  "Patrícia", "Rafael", "Sofia", "Thiago", "Vanessa", "William", "Amanda",
  "Carlos", "Daniela", "Eduardo", "Fernanda", "Gustavo", "Helena", "Igor",
  "Juliana", "Lucas", "Mariana", "Nicolas", "Olivia", "Pedro", "Rafaela",
  "Samuel", "Tatiana", "Vinícius", "Wesley", "Yasmin",
]

export const PF_LAST_NAMES = [
  "Silva", "Souza", "Oliveira", "Santos", "Pereira", "Lima", "Costa",
  "Ferreira", "Almeida", "Gomes", "Ribeiro", "Carvalho", "Araújo", "Barbosa",
  "Rocha", "Martins", "Rodrigues", "Nascimento", "Correia", "Mendes",
]

export const PJ_NAMES = [
  "Ferramentas Silva ME",
  "Eventos Premium Ltda",
  "Locadora Norte EIRELI",
  "Tech Aluguel Soluções ME",
  "Som e Luz Produções Ltda",
  "Construções Araújo EIRELI",
  "Outdoor Aventuras ME",
  "Estilo Feminino Aluguel Ltda",
  "Equipamentos Machado ME",
  "Festas & Cia Produções Ltda",
]

// ─────────────────────────────────────────────────────────────────────────────
// Helpers de guard e derivação de preços
// ─────────────────────────────────────────────────────────────────────────────

/** Preço/semana = 3× diária; preço/mês = 15× diária (em centavos). */
export function derivePrices(pricePerDayReais: number) {
  const pricePerDay = Math.round(pricePerDayReais) * 100
  return {
    pricePerDay,
    pricePerWeek: pricePerDay * 3,
    pricePerMonth: pricePerDay * 15,
  }
}

/**
 * Escolhe a quantidade de dias garantindo que totalPrice <= CHECKOUT_MAX_CENTS (R$500).
 * Retorna 1 se nem 1 dia couber (item muito caro para o teto).
 */
export function pickRentalDays(dailyPriceCents: number, rnd: () => number): number {
  const CHECKOUT_MAX_CENTS = 50000 // R$500
  const maxDays = Math.floor(CHECKOUT_MAX_CENTS / dailyPriceCents)
  if (maxDays <= 0) return 1
  const cap = Math.min(maxDays, 5) // máximo 5 dias para variar os desfechos
  return Math.max(1, Math.floor(rnd() * cap) + 1)
}
