import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const categories = [
  { slug: "ferramentas", name: "Ferramentas", icon: "Ferramentas.png" },
  { slug: "eletronicos", name: "Eletrônicos", icon: "Eletronicos.png" },
  { slug: "casa-jardim", name: "Casa e Cozinha", icon: "casa-jardim.jpeg" },
  { slug: "construcao",  name: "Construção",   icon: "Construção.png"  },
  { slug: "esporte",     name: "Esporte",      icon: "Esporte.png"     },
  { slug: "moda",        name: "Moda",         icon: "Moda.png"        },
  { slug: "festas",      name: "Festas",       icon: "Festas.png"      },
]

// Itens de exemplo para visualização no staging
// Localização: espalhados por capitais brasileiras (lançamento nacional)
// Preços baseados em referência de mercado: diária ≈ 5% do valor do produto
// pricePerWeek = pricePerDay × 4  |  pricePerMonth = pricePerDay × 12
const sampleItems = [
  {
    slug:          "furadeira-impacto-bosch-em-sao-paulo-sp-seed01",
    categorySlug:   "ferramentas",
    title:          "Furadeira de Impacto Bosch",
    description:    "Furadeira de impacto Bosch 650W, ideal para furos em alvenaria, madeira e metal. Acompanha maleta, brocas e ponteiras.",
    condition:      "GOOD" as const,
    pricePerDay:    3500,    // R$35/dia   (produto ~R$700)
    pricePerWeek:   14000,   // R$140/sem  (4×)
    pricePerMonth:  42000,   // R$420/mês  (12×)
    city:           "São Paulo",
    state:          "SP",
    neighborhood:   "Pinheiros",
    latitude:       -23.5614,
    longitude:      -46.7020,
  },
  {
    slug:          "camera-sony-a7iii-lente-em-rio-de-janeiro-rj-seed02",
    categorySlug:   "eletronicos",
    title:          "Câmera Sony A7 III + Lente",
    description:    "Câmera mirrorless full-frame Sony A7 III com lente 28-70mm f/3.5-5.6. Ideal para ensaios, eventos e viagens. Bateria extra inclusa.",
    condition:      "EXCELLENT" as const,
    pricePerDay:    15000,   // R$150/dia  (produto ~R$10.000)
    pricePerWeek:   60000,   // R$600/sem  (4×)
    pricePerMonth:  180000,  // R$1.800/mês (12×)
    city:           "Rio de Janeiro",
    state:          "RJ",
    neighborhood:   "Copacabana",
    latitude:       -22.9711,
    longitude:      -43.1822,
  },
  {
    slug:          "barraca-camping-6-pessoas-em-curitiba-pr-seed03",
    categorySlug:   "esporte",
    title:          "Barraca de Camping 6 pessoas",
    description:    "Barraca Coleman para 6 pessoas, impermeável, fácil de montar. Acompanha estacas e cordas. Ótima para praia e trilhas.",
    condition:      "GOOD" as const,
    pricePerDay:    6000,    // R$60/dia   (produto ~R$1.200)
    pricePerWeek:   24000,   // R$240/sem  (4×)
    pricePerMonth:  72000,   // R$720/mês  (12×)
    city:           "Curitiba",
    state:          "PR",
    neighborhood:   "Batel",
    latitude:       -25.4411,
    longitude:      -49.2860,
  },
  {
    slug:          "conjunto-halteres-5-30kg-em-belo-horizonte-mg-seed04",
    categorySlug:   "esporte",
    title:          "Conjunto de Halteres 5-30kg",
    description:    "Conjunto com 8 pares de halteres de borracha (5, 8, 10, 12, 15, 20, 25 e 30kg) + suporte. Ideal para treinos em casa.",
    condition:      "GOOD" as const,
    pricePerDay:    2500,    // R$25/dia   (produto ~R$500)
    pricePerWeek:   10000,   // R$100/sem  (4×)
    pricePerMonth:  30000,   // R$300/mês  (12×)
    city:           "Belo Horizonte",
    state:          "MG",
    neighborhood:   "Savassi",
    latitude:       -19.9386,
    longitude:      -43.9332,
  },
  {
    slug:          "projetor-epson-fullhd-em-porto-alegre-rs-seed05",
    categorySlug:   "eletronicos",
    title:          "Projetor Epson Full HD 3500 lúmens",
    description:    "Projetor Epson EH-TW5705 Full HD 1080p, 3500 lúmens, HDMI + WiFi. Perfeito para apresentações, cinema em casa e eventos.",
    condition:      "EXCELLENT" as const,
    pricePerDay:    10000,   // R$100/dia  (produto ~R$2.000)
    pricePerWeek:   40000,   // R$400/sem  (4×)
    pricePerMonth:  120000,  // R$1.200/mês (12×)
    city:           "Porto Alegre",
    state:          "RS",
    neighborhood:   "Moinhos de Vento",
    latitude:       -30.0240,
    longitude:      -51.2030,
  },
  {
    slug:          "cadeiras-evento-10un-em-salvador-ba-seed06",
    categorySlug:   "festas",
    title:          "Cadeiras para Evento (10 unidades)",
    description:    "10 cadeiras plásticas brancas resistentes, ideais para festas, reuniões e eventos. Entrega e retirada combinados.",
    condition:      "GOOD" as const,
    pricePerDay:    4000,    // R$40/dia   (conjunto ~R$800)
    pricePerWeek:   16000,   // R$160/sem  (4×)
    pricePerMonth:  48000,   // R$480/mês  (12×)
    city:           "Salvador",
    state:          "BA",
    neighborhood:   "Pituba",
    latitude:       -12.9911,
    longitude:      -38.4580,
  },
  {
    slug:          "escada-telescopica-7m-em-brasilia-df-seed07",
    categorySlug:   "construcao",
    title:          "Escada Telescópica 7m",
    description:    "Escada telescópica em alumínio até 7m, capacidade 150kg. Compacta para transporte, ideal para manutenção e pintura.",
    condition:      "GOOD" as const,
    pricePerDay:    4500,    // R$45/dia   (produto ~R$900)
    pricePerWeek:   18000,   // R$180/sem  (4×)
    pricePerMonth:  54000,   // R$540/mês  (12×)
    city:           "Brasília",
    state:          "DF",
    neighborhood:   "Asa Norte",
    latitude:       -15.7650,
    longitude:      -47.8780,
  },
  {
    slug:          "kit-jardinagem-completo-em-recife-pe-seed08",
    categorySlug:   "casa-jardim",
    title:          "Kit de Jardinagem Completo",
    description:    "Kit com tesoura de poda, cavadeira, ancinho, regador 10L e luvas. Ideal para quem quer cuidar do jardim sem precisar comprar ferramentas.",
    condition:      "GOOD" as const,
    pricePerDay:    3000,    // R$30/dia   (kit ~R$500)
    pricePerWeek:   12000,   // R$120/sem  (4×)
    pricePerMonth:  36000,   // R$360/mês  (12×)
    city:           "Recife",
    state:          "PE",
    neighborhood:   "Boa Viagem",
    latitude:       -8.1265,
    longitude:      -34.9009,
  },
]

async function main() {
  console.log("🌱 Iniciando seed...")

  // Categorias
  for (const cat of categories) {
    await prisma.category.upsert({
      where:  { slug: cat.slug },
      update: { name: cat.name, icon: cat.icon },
      create: cat,
    })
  }
  console.log(`✅ ${categories.length} categorias criadas`)

  // Usuário admin (apenas em dev/staging — nunca em produção com senha fixa)
  if (process.env.NODE_ENV === "production") {
    console.log("⏩ Pulando criação do admin e itens de exemplo em produção")
    return
  }

  const adminEmail = "admin@shareo.com.br"
  const adminPassword = "Admin@shareo2026"

  const admin = await prisma.user.upsert({
    where:  { email: adminEmail },
    update: {},
    create: {
      email:          adminEmail,
      passwordHash:   await bcrypt.hash(adminPassword, 12),
      name:           "Admin ShareO",
      userType:       "PF",
      role:           "ADMIN",
      adminRole:      "ADMIN_SUPERADMIN",
      isVerified:     true,
      city:           "São Paulo",
      state:          "SP",
      consentAt:      new Date(),
      consentVersion: "v1.0",
    },
  })
  console.log(`✅ Admin criado: ${adminEmail} (senha definida via env/seed)`)
  console.log("⚠️  Troque a senha do admin após o primeiro login!")

  // Itens de exemplo para staging/dev
  let itemCount = 0
  for (const item of sampleItems) {
    const category = await prisma.category.findUnique({ where: { slug: item.categorySlug } })
    if (!category) {
      console.warn(`⚠️  Categoria "${item.categorySlug}" não encontrada, pulando item "${item.title}"`)
      continue
    }

    await prisma.item.upsert({
      where:  { slug: item.slug },
      update: {},
      create: {
        slug:          item.slug,
        ownerId:       admin.id,
        categoryId:    category.id,
        title:         item.title,
        description:   item.description,
        condition:     item.condition,
        pricePerDay:   item.pricePerDay,
        pricePerWeek:  item.pricePerWeek,
        pricePerMonth: item.pricePerMonth,
        city:          item.city,
        state:         item.state,
        neighborhood:  item.neighborhood,
        latitude:      item.latitude,
        longitude:     item.longitude,
        status:        "AVAILABLE" as const,
        isApproved:    true,
        approvedAt:    new Date(),
        viewCount:     Math.floor(Math.random() * 50),
      },
    })
    itemCount++
  }
  console.log(`✅ ${itemCount} itens de exemplo criados`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
