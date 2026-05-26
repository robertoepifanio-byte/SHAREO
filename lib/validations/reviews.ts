import { z } from "zod"

export const CreateReviewSchema = z.object({
  reviewType: z.enum(["ITEM", "BORROWER", "OWNER"]),
  rating:     z.number().int().min(1, "Nota mínima: 1").max(5, "Nota máxima: 5"),
  comment:    z.string().max(1000, "Comentário: máximo 1000 caracteres").optional(),
})

export type CreateReviewInput = z.infer<typeof CreateReviewSchema>
