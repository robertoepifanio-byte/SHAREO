import { NextResponse } from "next/server"
import { unstable_cache } from "next/cache"
import { prisma } from "@/lib/prisma"

export const revalidate = 300

const getStats = unstable_cache(
  async () => {
    try {
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
      const [total, thisWeek, converted] = await Promise.all([
        prisma.founderLead.count({ where: { deletedAt: null } }),
        prisma.founderLead.count({ where: { deletedAt: null, createdAt: { gte: weekAgo } } }),
        prisma.founderLead.count({ where: { status: "CONVERTED" } }),
      ])
      return { total, thisWeek, converted, updatedAt: new Date().toISOString() }
    } catch {
      return { total: 0, thisWeek: 0, converted: 0, updatedAt: new Date().toISOString() }
    }
  },
  ["founder-stats"],
  { revalidate: 300, tags: ["founders"] },
)

export async function GET() {
  const stats = await getStats()
  return NextResponse.json({ data: stats })
}
