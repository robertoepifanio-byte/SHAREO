/**
 * seed-item-images.ts
 * Adiciona uma imagem a cada item do staging que ainda não tem nenhuma.
 * Uso: node --env-file=.env.staging-migrate --import tsx/esm scripts/seed-item-images.ts
 */

import { PrismaClient } from "@prisma/client"

const p = new PrismaClient()

// Mapa título → URL pública (Unsplash, fotos liberadas para uso)
const IMAGE_BY_TITLE: Record<string, string> = {
  "Furadeira de Impacto Bosch":
    "https://images.unsplash.com/photo-1504148455328-c376907d081c?w=800&q=80&auto=format&fit=crop",
  "Câmera Sony A7 III + Lente":
    "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=800&q=80&auto=format&fit=crop",
  "Barraca de Camping 6 pessoas":
    "https://images.unsplash.com/photo-1504280390367-361c6d9f38f4?w=800&q=80&auto=format&fit=crop",
  "Conjunto de Halteres 5-30kg":
    "https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=800&q=80&auto=format&fit=crop",
  "Projetor Epson Full HD 3500 lúmens":
    "https://images.unsplash.com/photo-1478720568477-152d9b164e26?w=800&q=80&auto=format&fit=crop",
  "Cadeiras para Evento (10 unidades)":
    "https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?w=800&q=80&auto=format&fit=crop",
  "Escada Telescópica 7m":
    "https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80&auto=format&fit=crop",
  "Kit de Jardinagem Completo":
    "https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=800&q=80&auto=format&fit=crop",
}

// Fallback para itens de fixture E2E (câmera genérica)
const FALLBACK_URL =
  "https://images.unsplash.com/photo-1502982720700-bfff97f2ecac?w=800&q=80&auto=format&fit=crop"

async function main() {
  const items = await p.item.findMany({
    where:   { deletedAt: null, images: { none: {} } },
    select:  { id: true, title: true, category: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  })

  if (items.length === 0) {
    console.log("Nenhum item sem imagem encontrado.")
    return
  }

  console.log(`${items.length} itens sem imagem. Adicionando...\n`)

  for (const item of items) {
    const url = IMAGE_BY_TITLE[item.title] ?? FALLBACK_URL
    await p.itemImage.create({ data: { itemId: item.id, url, order: 0 } })
    console.log(`✓ [${item.category.name}] ${item.title}`)
  }

  console.log("\nConcluído.")
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => p.$disconnect())
