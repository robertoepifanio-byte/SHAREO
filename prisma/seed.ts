import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const categories = [
  { slug: "ferramentas", name: "Ferramentas", icon: "Ferramentas.png" },
  { slug: "eletronicos", name: "Eletrônicos", icon: "Eletronicos.png" },
  { slug: "casa",        name: "Casa",        icon: "Casa.png"        },
  { slug: "construcao",  name: "Construção",  icon: "Construção.png"  },
  { slug: "esporte",     name: "Esporte",     icon: "Esporte.png"     },
  { slug: "moda",        name: "Moda",        icon: "Moda.png"        },
  { slug: "festas",      name: "Festas",      icon: "Festas.png"      },
  { slug: "jardim",      name: "Jardim",      icon: "jardim.png"      },
]

// Itens de exemplo para visualização no staging
// Localização: bairros de Natal/RN
const sampleItems = [
  {
    slug:        "furadeira-impacto-bosch-em-natal-rn-seed01",
    categorySlug: "ferramentas",
    title:        "Furadeira de Impacto Bosch",
    description:  "Furadeira de impacto Bosch 650W, ideal para furos em alvenaria, madeira e metal. Acompanha maleta, brocas e ponteiras.",
    condition:    "GOOD" as const,
    pricePerDay:  3500,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Tirol",
    latitude:     -5.7825,
    longitude:    -35.2046,
  },
  {
    slug:        "camera-sony-a7iii-lente-em-natal-rn-seed02",
    categorySlug: "eletronicos",
    title:        "Câmera Sony A7 III + Lente",
    description:  "Câmera mirrorless full-frame Sony A7 III com lente 28-70mm f/3.5-5.6. Ideal para ensaios, eventos e viagens. Bateria extra inclusa.",
    condition:    "EXCELLENT" as const,
    pricePerDay:  15000,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Ponta Negra",
    latitude:     -5.8823,
    longitude:    -35.1766,
  },
  {
    slug:        "barraca-camping-6-pessoas-em-natal-rn-seed03",
    categorySlug: "esporte",
    title:        "Barraca de Camping 6 pessoas",
    description:  "Barraca Coleman para 6 pessoas, impermeável, fácil de montar. Acompanha estacas e cordas. Ótima para praia e trilhas.",
    condition:    "GOOD" as const,
    pricePerDay:  6000,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Capim Macio",
    latitude:     -5.8520,
    longitude:    -35.2046,
  },
  {
    slug:        "conjunto-halteres-5-30kg-em-natal-rn-seed04",
    categorySlug: "esporte",
    title:        "Conjunto de Halteres 5-30kg",
    description:  "Conjunto com 8 pares de halteres de borracha (5, 8, 10, 12, 15, 20, 25 e 30kg) + suporte. Ideal para treinos em casa.",
    condition:    "GOOD" as const,
    pricePerDay:  2500,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Tirol",
    latitude:     -5.7830,
    longitude:    -35.2060,
  },
  {
    slug:        "projetor-epson-fullhd-em-natal-rn-seed05",
    categorySlug: "eletronicos",
    title:        "Projetor Epson Full HD 3500 lúmens",
    description:  "Projetor Epson EH-TW5705 Full HD 1080p, 3500 lúmens, HDMI + WiFi. Perfeito para apresentações, cinema em casa e eventos.",
    condition:    "EXCELLENT" as const,
    pricePerDay:  8000,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Petrópolis",
    latitude:     -5.7960,
    longitude:    -35.2060,
  },
  {
    slug:        "cadeiras-evento-10un-em-natal-rn-seed06",
    categorySlug: "festas",
    title:        "Cadeiras para Evento (10 unidades)",
    description:  "10 cadeiras plásticas brancas resistentes, ideais para festas, reuniões e eventos. Entrega e retirada combinados.",
    condition:    "GOOD" as const,
    pricePerDay:  4000,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Lagoa Nova",
    latitude:     -5.8010,
    longitude:    -35.2110,
  },
  {
    slug:        "escada-telescopica-7m-em-natal-rn-seed07",
    categorySlug: "construcao",
    title:        "Escada Telescópica 7m",
    description:  "Escada telescópica em alumínio até 7m, capacidade 150kg. Compacta para transporte, ideal para manutenção e pintura.",
    condition:    "GOOD" as const,
    pricePerDay:  4500,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Candelária",
    latitude:     -5.8240,
    longitude:    -35.2280,
  },
  {
    slug:        "kit-jardinagem-completo-em-natal-rn-seed08",
    categorySlug: "jardim",
    title:        "Kit de Jardinagem Completo",
    description:  "Kit com tesoura de poda, cavadeira, ancinho, regador 10L e luvas. Ideal para quem quer cuidar do jardim sem precisar comprar ferramentas.",
    condition:    "GOOD" as const,
    pricePerDay:  3000,
    city:         "Natal",
    state:        "RN",
    neighborhood: "Petrópolis",
    latitude:     -5.7970,
    longitude:    -35.2070,
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
      isVerified:     true,
      city:           "Natal",
      state:          "RN",
      consentAt:      new Date(),
      consentVersion: "v1.0",
    },
  })
  console.log(`✅ Admin criado: ${adminEmail} / ${adminPassword}`)
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
        slug:         item.slug,
        ownerId:      admin.id,
        categoryId:   category.id,
        title:        item.title,
        description:  item.description,
        condition:    item.condition,
        pricePerDay:  item.pricePerDay,
        city:         item.city,
        state:        item.state,
        neighborhood: item.neighborhood,
        latitude:     item.latitude,
        longitude:    item.longitude,
        isActive:     true,
        isApproved:   true,
        approvedAt:   new Date(),
        viewCount:    Math.floor(Math.random() * 50),
      },
    })
    itemCount++
  }
  console.log(`✅ ${itemCount} itens de exemplo criados`)
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
