import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

const categories = [
  { slug: "ferramentas",  name: "Ferramentas",  icon: "Ferramentas.png" },
  { slug: "eletronicos",  name: "Eletrônicos",  icon: "Eletronicos.png" },
  { slug: "casa",         name: "Casa",         icon: "Casa.png"        },
  { slug: "construcao",   name: "Construção",   icon: "Construção.png"  },
  { slug: "esporte",      name: "Esporte",      icon: "Esporte.png"     },
  { slug: "moda",         name: "Moda",         icon: "Moda.png"        },
  { slug: "festas",       name: "Festas",       icon: "Festas.png"      },
  { slug: "jardim",       name: "Jardim",       icon: "jardim.png"      },
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
    console.log("⏩ Pulando criação do admin em produção")
    return
  }

  const adminEmail = "admin@shareo.com.br"
  const adminPassword = "Admin@shareo2026"

  await prisma.user.upsert({
    where:  { email: adminEmail },
    update: {},
    create: {
      email:         adminEmail,
      passwordHash:  await bcrypt.hash(adminPassword, 12),
      name:          "Admin ShareO",
      userType:      "PF",
      role:          "ADMIN",
      isVerified:    true,
      city:          "Natal",
      state:         "RN",
      consentAt:     new Date(),
      consentVersion: "v1.0",
    },
  })
  console.log(`✅ Admin criado: ${adminEmail} / ${adminPassword}`)
  console.log("⚠️  Troque a senha do admin após o primeiro login!")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
