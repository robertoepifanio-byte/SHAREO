import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()

async function main() {
  const images = [
    {
      itemId: "cmpj2z4ir0001n82s58henqg7",
      url: "/imagens/furadeira de impacto Bosch.webp",
      order: 0,
    },
    {
      itemId: "cmpj3fxdo0003n82slegz6zze",
      url: "/imagens/camera sony a7.webp",
      order: 0,
    },
    {
      itemId: "cmpj3ueso0005n82s4zur6xnf",
      url: "/imagens/camera sony a7.webp",
      order: 0,
    },
  ]

  for (const img of images) {
    const exists = await prisma.itemImage.findFirst({ where: { itemId: img.itemId } })
    if (!exists) {
      await prisma.itemImage.create({ data: img })
      console.log(`Created image for item ${img.itemId}`)
    } else {
      console.log(`Image already exists for item ${img.itemId} — skipping`)
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
