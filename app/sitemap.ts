import type { MetadataRoute } from "next"
import { prisma } from "@/lib/prisma"
import { PILOT_CITIES } from "@/lib/pilot-cities"
import { PRELAUNCH_ENABLED } from "@/lib/prelaunch"

export const dynamic = "force-dynamic"

const BASE = process.env.NEXT_PUBLIC_APP_URL ?? "https://shareo-rouge.vercel.app"

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  // No pré-lançamento só existem, do ponto de vista do crawler, a landing e as
  // páginas de cidade. Sai ANTES das queries: com `force-dynamic` elas rodariam
  // a cada visita de crawler só para produzir URLs que o gate redireciona.
  if (PRELAUNCH_ENABLED) {
    return [
      { url: BASE, lastModified: new Date(), changeFrequency: "daily", priority: 1.0 },
      ...PILOT_CITIES.map((c) => ({
        url:             `${BASE}/pilotos/${c.slug}`,
        lastModified:    new Date(),
        changeFrequency: "weekly" as const,
        priority:        0.9,
      })),
    ]
  }

  const [items, categories, lojas] = await Promise.all([
    prisma.item.findMany({
      where:   { status: "AVAILABLE", isApproved: true, deletedAt: null },
      select:  { id: true, updatedAt: true },
      orderBy: { updatedAt: "desc" },
      take:    1000,
    }),
    prisma.category.findMany({
      where:  { parentId: null },
      select: { id: true },
    }),
    prisma.user.findMany({
      where:   { slug: { not: null }, deletedAt: null },
      select:  { slug: true, updatedAt: true },
    }),
  ])

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: BASE,           lastModified: new Date(), changeFrequency: "daily",   priority: 1.0 },
    { url: `${BASE}/itens`, lastModified: new Date(), changeFrequency: "hourly",  priority: 0.9 },
    { url: `${BASE}/ganhar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  ]

  const categoryRoutes: MetadataRoute.Sitemap = categories.map((c) => ({
    url:             `${BASE}/itens?categoryId=${c.id}`,
    changeFrequency: "daily" as const,
    priority:        0.7,
  }))

  const itemRoutes: MetadataRoute.Sitemap = items.map((i) => ({
    url:             `${BASE}/itens/${i.id}`,
    lastModified:    i.updatedAt,
    changeFrequency: "weekly" as const,
    priority:        0.8,
  }))

  const lojaRoutes: MetadataRoute.Sitemap = lojas
    .filter((u) => u.slug)
    .map((u) => ({
      url:             `${BASE}/loja/${u.slug}`,
      lastModified:    u.updatedAt,
      changeFrequency: "weekly" as const,
      priority:        0.6,
    }))

  const pilotRoutes: MetadataRoute.Sitemap = PILOT_CITIES.map((c) => ({
    url:             `${BASE}/pilotos/${c.slug}`,
    lastModified:    new Date(),
    changeFrequency: "weekly" as const,
    priority:        0.7,
  }))

  return [...staticRoutes, ...categoryRoutes, ...itemRoutes, ...lojaRoutes, ...pilotRoutes]
}
