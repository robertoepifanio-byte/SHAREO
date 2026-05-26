import { z } from "zod"

function tomorrow() {
  const d = new Date()
  d.setDate(d.getDate() + 1)
  d.setHours(0, 0, 0, 0)
  return d
}

export const CreateBookingSchema = z
  .object({
    itemId:      z.string().cuid("itemId inválido"),
    startDate:   z.string().datetime({ message: "startDate inválida" }),
    endDate:     z.string().datetime({ message: "endDate inválida" }),
    borrowerNote: z.string().max(500, "Nota: máximo 500 caracteres").optional(),
  })
  .refine((d) => new Date(d.startDate) >= tomorrow(), {
    message: "A data de início deve ser a partir de amanhã",
    path: ["startDate"],
  })
  .refine((d) => new Date(d.endDate) > new Date(d.startDate), {
    message: "A data de devolução deve ser posterior à de retirada",
    path: ["endDate"],
  })

export type CreateBookingInput = z.infer<typeof CreateBookingSchema>

export const ListBookingsQuerySchema = z.object({
  role:   z.enum(["borrower", "owner", "all"]).default("all"),
  status: z
    .enum(["PENDING", "CONFIRMED", "ACTIVE", "RETURNED", "COMPLETED", "CANCELLED", "DISPUTED"])
    .optional(),
  page:  z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

export type ListBookingsQuery = z.infer<typeof ListBookingsQuerySchema>

export const PatchBookingSchema = z.object({
  action: z.enum(["confirm", "cancel", "mark_active", "mark_returned", "open_dispute"]),
  reason: z.string().max(500).optional(),
})

export type PatchBookingInput = z.infer<typeof PatchBookingSchema>
