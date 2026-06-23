import { Prisma } from "@prisma/client"

/**
 * Select mínimo de usuário para joins (autor, dono, locatário, avaliador).
 *
 * FONTE ÚNICA — evita que cada query escolha um shape ligeiramente diferente
 * (foi a causa-raiz do bug histórico do avatar, em que um lugar trazia
 * `avatarUrl` e outro não). Use sempre em `owner`/`borrower`/`reviewer`/`user`:
 *
 *   include: { owner: { select: userMiniSelect } }
 */
export const userMiniSelect = {
  id:        true,
  name:      true,
  avatarUrl: true,
} satisfies Prisma.UserSelect

/** Como `userMiniSelect`, mais o selo de verificado — cards e vitrines públicas. */
export const userPublicSelect = {
  ...userMiniSelect,
  isVerified: true,
} satisfies Prisma.UserSelect

export type UserMini   = Prisma.UserGetPayload<{ select: typeof userMiniSelect }>
export type UserPublic = Prisma.UserGetPayload<{ select: typeof userPublicSelect }>
