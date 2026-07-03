import { NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getPlatformFeeRate, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"

export const revalidate = 60

export async function GET() {
  const AVAILABLE = { status: "AVAILABLE" as const, isApproved: true, deletedAt: null }

  const [itemCount, ownerGroups, categoryCount, feeRate] = await Promise.all([
    prisma.item.count({ where: AVAILABLE }).catch(() => 0),
    prisma.item.groupBy({ by: ["ownerId"], where: AVAILABLE }).catch(() => [] as { ownerId: string }[]),
    prisma.category.count({ where: { parentId: null } }).catch(() => 0),
    getPlatformFeeRate().catch(() => 1500),
  ])

  return NextResponse.json({
    data: {
      itemCount,
      ownerCount: ownerGroups.length,
      categories: categoryCount,
      feeRate,
      checkoutMaxCents: CHECKOUT_MAX_CENTS,
    },
  })
}
