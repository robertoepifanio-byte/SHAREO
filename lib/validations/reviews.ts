import { z } from "zod"

const criterionScore = z.number().int().min(1).max(5)

export const CreateReviewSchema = z.object({
  reviewType:      z.enum(["ITEM", "BORROWER", "OWNER"]),
  rating:          z.number().int().min(1, "Nota mínima: 1").max(5, "Nota máxima: 5"),
  comment:         z.string().max(1000, "Comentário: máximo 1000 caracteres").optional(),
  // P3-68: emoji de satisfação
  sentiment:       criterionScore.optional(),
  // P3-67: critérios múltiplos
  itemAsDescribed: criterionScore.optional(),
  punctuality:     criterionScore.optional(),
  communication:   criterionScore.optional(),
  conservation:    criterionScore.optional(),
  // P3-69: foto do item em uso
  photoUrl:        z.string().url().optional(),
})

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
