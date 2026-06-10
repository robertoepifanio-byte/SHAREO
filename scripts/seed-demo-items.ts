/**
 * seed-demo-items.ts
 *
 * Cria ~21 itens de demonstração (3 por categoria) com fotos reais do Unsplash
 * no banco de staging, para que listagem, busca, mapa e cards tenham conteúdo
 * visual real em demos e validações de design.
 *
 * - Dono: proprietário fixture (proprietario.fixture@shareo-test.com)
 * - Idempotente: pula itens cujo título já existe
 * - Valida cada URL de imagem (HEAD) antes de inserir — nunca insere foto quebrada
 * - Preços seguem a tabela de referência (diária ≈ 3–5% do valor do bem;
 *   semana = 3× diária; mês = 15× diária)
 * - Coordenadas espalhadas por bairros reais de Natal/RN
 *
 * Uso:
 *   pnpm exec tsx --env-file=.env.staging-migrate scripts/seed-demo-items.ts
 */

import { PrismaClient } from '@prisma/client'
import { FIXTURE_PROPRIETARIO } from '../e2e/fixtures/test-credentials'

const STAGING_PROJECT_ID = 'fflpuoluiqmhpvcxubqi'
const prisma = new PrismaClient()

function assertStagingDb() {
  const url = process.env.DATABASE_URL ?? ''
  if (!url.includes(STAGING_PROJECT_ID)) {
    console.error('❌ DATABASE_URL não aponta para o banco de staging.')
    console.error('   Execute com: pnpm exec tsx --env-file=.env.staging-migrate scripts/seed-demo-items.ts')
    process.exit(1)
  }
}

// Bairros de Natal/RN com coordenadas aproximadas — espalha os itens no mapa
const NATAL_SPOTS = [
  { neighborhood: 'Ponta Negra',    latitude: -5.8814, longitude: -35.1700 },
  { neighborhood: 'Tirol',          latitude: -5.7900, longitude: -35.2030 },
  { neighborhood: 'Petrópolis',     latitude: -5.7800, longitude: -35.1980 },
  { neighborhood: 'Lagoa Nova',     latitude: -5.8200, longitude: -35.2150 },
  { neighborhood: 'Capim Macio',    latitude: -5.8580, longitude: -35.2000 },
  { neighborhood: 'Candelária',     latitude: -5.8380, longitude: -35.2200 },
  { neighborhood: 'Neópolis',       latitude: -5.8700, longitude: -35.2050 },
]

type DemoItem = {
  category: string
  title: string
  description: string
  condition: 'NEW' | 'EXCELLENT' | 'GOOD' | 'FAIR'
  pricePerDay: number // centavos
  voltage?: string
  imageUrls: string[]
}

const u = (id: string) => `https://images.unsplash.com/${id}?w=800&q=80&fit=crop`

const DEMO_ITEMS: DemoItem[] = [
  // ── Ferramentas (diária ref. R$35) ──
  {
    category: 'ferramentas',
    title: 'Furadeira de Impacto Bosch GSB 550W',
    description: 'Furadeira de impacto profissional 550W com maleta e jogo de brocas para concreto, madeira e metal. Ideal para instalações domésticas, montagem de móveis e pequenas reformas. Mandril de 13mm, velocidade variável e reversível.',
    condition: 'EXCELLENT', pricePerDay: 3500, voltage: '220V',
    imageUrls: [u('photo-1504148455328-c376907d081c')],
  },
  {
    category: 'ferramentas',
    title: 'Parafusadeira sem Fio DeWalt 20V + 2 Baterias',
    description: 'Parafusadeira/furadeira sem fio com duas baterias de lítio 20V, carregador rápido e maleta. Perfeita para montagem de móveis e serviços onde não há tomada por perto. Torque ajustável em 15 posições.',
    condition: 'EXCELLENT', pricePerDay: 4000,
    imageUrls: [u('photo-1572981779307-38b8cabb2407')],
  },
  {
    category: 'ferramentas',
    title: 'Lavadora de Alta Pressão Kärcher K3',
    description: 'Lavadora de alta pressão 1800 psi para limpeza de calçadas, muros, carros e fachadas. Acompanha mangueira de 6m, bico turbo e aplicador de detergente. Economia de água comparada à mangueira comum.',
    condition: 'GOOD', pricePerDay: 4500, voltage: '220V',
    imageUrls: [u('photo-1558618666-fcd25c85cd64')],
  },

  // ── Eletrônicos (diária ref. R$100) ──
  {
    category: 'eletronicos',
    title: 'Câmera Mirrorless Sony A7 III + Lente 28-70mm',
    description: 'Câmera full-frame de 24MP com lente kit 28-70mm, duas baterias, carregador e cartão SD 128GB. Excelente para ensaios, casamentos, vídeos em 4K e projetos profissionais. Entrego com bolsa de proteção.',
    condition: 'EXCELLENT', pricePerDay: 12000,
    imageUrls: [u('photo-1516035069371-29a1b244cc32')],
  },
  {
    category: 'eletronicos',
    title: 'Projetor Full HD Epson 3600 lumens + Tela 100"',
    description: 'Projetor Full HD com 3600 lumens de brilho, ideal para sessões de cinema em casa, festas, apresentações e eventos. Acompanha tela retrátil de 100 polegadas, cabo HDMI de 5m e controle remoto.',
    condition: 'GOOD', pricePerDay: 9000, voltage: 'Bivolt',
    imageUrls: [u('photo-1478720568477-152d9b164e26')],
  },
  {
    category: 'eletronicos',
    title: 'Drone DJI Mini 3 Pro com 3 Baterias',
    description: 'Drone compacto com câmera 4K, sensor de obstáculos e 34 minutos de voo por bateria (3 inclusas). Menos de 250g — dispensa registro para uso recreativo. Perfeito para filmagens aéreas de eventos e imóveis.',
    condition: 'EXCELLENT', pricePerDay: 15000,
    imageUrls: [u('photo-1473968512647-3e447244af8f')],
  },

  // ── Casa e Cozinha (diária ref. R$30) ──
  {
    category: 'casa-jardim',
    title: 'Batedeira Planetária KitchenAid Vermelha',
    description: 'Batedeira planetária profissional de 300W com tigela de inox 4,8L, batedor raso, globo e gancho para massas pesadas. Ideal para confeitaria, pães artesanais e produções para festas.',
    condition: 'EXCELLENT', pricePerDay: 4000, voltage: '110V',
    imageUrls: [u('photo-1594385208974-2e75f8d7bb48')],
  },
  {
    category: 'casa-jardim',
    title: 'Aspirador Robô com Mapeamento Inteligente',
    description: 'Aspirador robô com mapeamento a laser, retorno automático à base e controle por aplicativo. Funciona em piso frio, madeira e tapetes baixos. Ótimo para experimentar antes de comprar o seu.',
    condition: 'GOOD', pricePerDay: 3000, voltage: 'Bivolt',
    imageUrls: [u('photo-1558317374-067fb5f30001')],
  },
  {
    category: 'casa-jardim',
    title: 'Churrasqueira a Carvão Portátil em Inox',
    description: 'Churrasqueira portátil em aço inox para 6–8 pessoas, com grelha dupla e bandeja coletora. Fácil de transportar para praia, sítio ou área de lazer do prédio. Entrego limpa e pronta para uso.',
    condition: 'GOOD', pricePerDay: 2500,
    imageUrls: [u('photo-1555396273-367ea4eb4db5')],
  },

  // ── Construção (diária ref. R$45) ──
  {
    category: 'construcao',
    title: 'Betoneira 150L para Obras Residenciais',
    description: 'Betoneira de 150 litros, ideal para obras residenciais de pequeno e médio porte — contrapisos, calçadas e fundações. Motor monofásico, fácil de operar. Retirada com veículo de carroceria ou utilitário.',
    condition: 'GOOD', pricePerDay: 4500, voltage: '220V',
    imageUrls: [u('photo-1581094794329-c8112a89af12')],
  },
  {
    category: 'construcao',
    title: 'Andaime Tubular 4m com Plataforma e Rodízios',
    description: 'Conjunto de andaime tubular com 4 metros de altura, plataforma metálica e rodízios com trava. Para pintura, instalação de forro e serviços em fachada. Acompanha manual de montagem.',
    condition: 'GOOD', pricePerDay: 4000,
    imageUrls: [u('photo-1504307651254-35680f356dfd')],
  },
  {
    category: 'construcao',
    title: 'Martelete Rompedor SDS Plus 800W',
    description: 'Martelete rompedor e perfurador com encaixe SDS Plus, 800W, com ponteiro, talhadeira e 3 brocas para concreto. Para demolições leves, abertura de canaletas e furos em concreto armado.',
    condition: 'EXCELLENT', pricePerDay: 5500, voltage: '220V',
    imageUrls: [u('photo-1426927308491-6380b6a9936f')],
  },

  // ── Esporte (diária ref. R$60) ──
  {
    category: 'esporte',
    title: 'Bicicleta MTB Aro 29 Shimano 21v',
    description: 'Mountain bike aro 29 com câmbio Shimano de 21 velocidades, freios a disco e suspensão dianteira. Revisada, pneus novos. Acompanha capacete e cadeado. Ideal para trilhas leves e passeios urbanos.',
    condition: 'GOOD', pricePerDay: 6000,
    imageUrls: [u('photo-1532298229144-0ec0c57515c7')],
  },
  {
    category: 'esporte',
    title: 'Prancha de Stand Up Paddle Inflável Completa',
    description: 'SUP inflável 10\'6" com remo ajustável, bomba de alta pressão, leash e mochila de transporte. Estável para iniciantes. Perfeita para a lagoa de Pitangui, Pirangi e dias calmos em Ponta Negra.',
    condition: 'EXCELLENT', pricePerDay: 7000,
    imageUrls: [u('photo-1502680390469-be75c86b636f')],
  },
  {
    category: 'esporte',
    title: 'Kit Camping Completo — Barraca 4P + 2 Colchonetes',
    description: 'Barraca para 4 pessoas com coluna d\'água 2000mm, dois colchonetes infláveis, lampião LED recarregável e fogareiro portátil. Tudo revisado e impermeabilizado. Ideal para fins de semana fora.',
    condition: 'GOOD', pricePerDay: 5500,
    imageUrls: [u('photo-1504851149312-7a075b496cc7')],
  },

  // ── Moda (diária ref. R$50) ──
  {
    category: 'moda',
    title: 'Vestido de Festa Longo Verde Esmeralda — Tam. M',
    description: 'Vestido longo de festa em crepe verde esmeralda, tamanho M (38–40), usado uma única vez. Perfeito para casamentos e formaturas. Entrego lavado, passado e em capa protetora.',
    condition: 'EXCELLENT', pricePerDay: 5000,
    imageUrls: [u('photo-1566174053879-31528523f8ae')],
  },
  {
    category: 'moda',
    title: 'Terno Slim Azul Marinho Completo — Tam. 48',
    description: 'Terno slim fit azul marinho (paletó + calça), tamanho 48, com camisa branca e gravata inclusas. Ideal para entrevistas, casamentos e eventos corporativos. Higienizado a seco após cada locação.',
    condition: 'EXCELLENT', pricePerDay: 6000,
    imageUrls: [u('photo-1594938298603-c8148c4dae35')],
  },
  {
    category: 'moda',
    title: 'Bolsa de Festa Clutch Dourada + Acessórios',
    description: 'Clutch dourada de festa com corrente removível, acompanha brincos e pulseira combinando. Complemento perfeito para look de madrinha ou formanda sem precisar comprar peças que serão usadas uma vez.',
    condition: 'EXCELLENT', pricePerDay: 3000,
    imageUrls: [u('photo-1584917865442-de89df76afd3')],
  },

  // ── Festas (diária ref. R$80) ──
  {
    category: 'festas',
    title: 'Kit Som Profissional — 2 Caixas 500W + Mesa',
    description: 'Par de caixas ativas de 500W RMS cada, mesa de som de 8 canais, 2 microfones com fio e cabeamento completo. Cobre festas de até 150 pessoas. Posso orientar a montagem na entrega.',
    condition: 'GOOD', pricePerDay: 10000, voltage: 'Bivolt',
    imageUrls: [u('photo-1470225620780-dba8ba36b745')],
  },
  {
    category: 'festas',
    title: 'Conjunto 10 Mesas + 40 Cadeiras Plásticas',
    description: 'Dez mesas quadradas desmontáveis com quarenta cadeiras plásticas reforçadas (suportam até 140kg). Para aniversários, confraternizações e eventos de rua. Entrego empilhadas, fácil de transportar.',
    condition: 'GOOD', pricePerDay: 7000,
    imageUrls: [u('photo-1519671482749-fd09be7ccebf')],
  },
  {
    category: 'festas',
    title: 'Máquina de Algodão Doce Profissional',
    description: 'Máquina de algodão doce profissional com cuba de inox e proteção acrílica. Produz um algodão a cada 30 segundos. Acompanha 1kg de açúcar colorido e 100 palitos. Sucesso garantido em festa infantil.',
    condition: 'EXCELLENT', pricePerDay: 8000, voltage: '110V',
    imageUrls: [u('photo-1576618148400-f54bed99fcfd')],
  },
]

async function validateImage(url: string): Promise<boolean> {
  try {
    const res = await fetch(url, { method: 'HEAD' })
    return res.ok
  } catch {
    return false
  }
}

async function main() {
  assertStagingDb()
  console.log(`\n🌱 seed-demo-items — ${DEMO_ITEMS.length} itens de demonstração\n`)

  const owner = await prisma.user.findUniqueOrThrow({
    where:  { email: FIXTURE_PROPRIETARIO.email },
    select: { id: true },
  })

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } })
  const catBySlug = Object.fromEntries(categories.map((c) => [c.slug, c.id]))

  let created = 0, skipped = 0, failed = 0

  for (const [i, demo] of DEMO_ITEMS.entries()) {
    const categoryId = catBySlug[demo.category]
    if (!categoryId) {
      console.error(`  ❌ Categoria não encontrada: ${demo.category} (${demo.title})`)
      failed++
      continue
    }

    const existing = await prisma.item.findFirst({
      where: { title: demo.title, deletedAt: null },
      select: { id: true },
    })
    if (existing) {
      console.log(`  ℹ️  Já existe: ${demo.title}`)
      skipped++
      continue
    }

    // Valida imagens ANTES de inserir — nunca deixar foto quebrada na listagem
    const validUrls: string[] = []
    for (const url of demo.imageUrls) {
      if (await validateImage(url)) validUrls.push(url)
      else console.warn(`  ⚠️  Imagem inválida (pulada): ${url}`)
    }
    if (validUrls.length === 0) {
      console.error(`  ❌ Sem imagem válida — item pulado: ${demo.title}`)
      failed++
      continue
    }

    const spot = NATAL_SPOTS[i % NATAL_SPOTS.length]
    // Jitter de ~300m para não empilhar pins no mapa
    const jitter = () => (Math.random() - 0.5) * 0.006

    await prisma.item.create({
      data: {
        ownerId:     owner.id,
        categoryId,
        title:       demo.title,
        description: demo.description,
        condition:   demo.condition,
        pricePerDay:   demo.pricePerDay,
        pricePerWeek:  demo.pricePerDay * 3,  // semana = 3× diária
        pricePerMonth: demo.pricePerDay * 15, // mês = 15× diária
        estimatedRetailPrice: Math.round(demo.pricePerDay / 0.04), // diária ≈ 4% do valor do bem
        voltage:      demo.voltage,
        city:         'Natal',
        state:        'RN',
        neighborhood: spot.neighborhood,
        latitude:     spot.latitude + jitter(),
        longitude:    spot.longitude + jitter(),
        status:       'AVAILABLE',
        isApproved:   true,
        approvedAt:   new Date(),
        images: { create: validUrls.map((url, order) => ({ url, order })) },
      },
    })
    console.log(`  ✅ [${demo.category}] ${demo.title}`)
    created++
  }

  console.log(`\n✨ Concluído: ${created} criados · ${skipped} já existiam · ${failed} falharam\n`)
  if (failed > 0) process.exit(1)
}

main()
  .catch((err) => { console.error('\n❌', err instanceof Error ? err.message : err); process.exit(1) })
  .finally(() => prisma.$disconnect())
