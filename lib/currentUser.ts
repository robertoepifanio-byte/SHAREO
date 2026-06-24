import { cache } from "react"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

/**
 * getCurrentUser — fonte ÚNICA dos dados do usuário logado em Server Components.
 *
 * Lê do banco (não do JWT, que não carrega avatarUrl e ficaria desatualizado após
 * um upload) e é envolto em `cache()` do React: várias chamadas no MESMO request
 * (ex.: AppHeader + a página) são deduplicadas numa só query. Assim o avatar (e
 * cidade/estado/status do cadastro) ficam consistentes em todo lugar e refletem
 * uma alteração imediatamente após o `router.refresh()`.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth().catch(() => null)
  if (!session?.user?.id) return null
  return prisma.user
    .findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        name: true,
        avatarUrl: true,
        city: true,
        state: true,
        profileCompletedAt: true,
        role: true,
      },
    })
    .catch(() => null)
})
