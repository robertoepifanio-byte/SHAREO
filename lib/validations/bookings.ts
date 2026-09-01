import { z } from "zod"

// Início do dia CORRENTE no fuso do Brasil (America/Fortaleza, UTC-3 sem DST),
// expresso como instante UTC. Permite locação no MESMO dia e bloqueia datas
// passadas — sem o bug de "virar o dia" quando o servidor (UTC) já passou da
// meia-noite enquanto no Brasil ainda é hoje. O cliente envia startDate ao
// meio-dia local, então qualquer horário de "hoje" passa.
function startOfTodayBR() {
  const BR_OFFSET_MS = 3 * 60 * 60 * 1000 // UTC-3
  const nowBR = new Date(Date.now() - BR_OFFSET_MS) // "agora" em componentes BRT
  nowBR.setUTCHours(0, 0, 0, 0)                      // meia-noite BRT
  return new Date(nowBR.getTime() + BR_OFFSET_MS)    // de volta a UTC
}

export const CreateBookingSchema = z
  .object({
    itemId:      z.string().cuid("itemId inválido"),
    // Story B — itens adicionais do MESMO proprietário, no MESMO período (locação multi-item).
    // Vazio/ausente = locação de item único (comportamento legado).
    additionalItemIds: z.array(z.string().cuid("itemId inválido")).max(9, "Máximo 10 itens por locação").optional(),
    startDate:   z.string().datetime({ message: "startDate inválida" }),
    endDate:     z.string().datetime({ message: "endDate inválida" }),
    borrowerNote: z.string().max(500, "Nota: máximo 500 caracteres").optional(),
    couponCode:   z.string().trim().min(4).max(30).optional(),
    // Aceite eletrônico do contrato de locação (D4 Jurídico — Questão #6).
    // Obrigatório quando a feature flag rentalContractAcceptanceEnabled=true.
    // Ignorado pelo servidor quando a flag estiver OFF — comportamento legado inalterado.
    contractAccepted:        z.boolean().optional(),
    // Versão do contrato exibido ao locatário no cliente.
    // Validada no servidor contra RENTAL_CONTRACT_VERSION vigente quando a flag está ON.
    contractAcceptedVersion: z.string().max(50).optional(),
  })
  .refine((d) => new Date(d.startDate) >= startOfTodayBR(), {
    message: "A data de início não pode ser no passado.",
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

export const PatchBookingSchema = z
  .object({
    action:      z.enum(["confirm", "cancel", "mark_active", "mark_returned", "confirm_return", "open_dispute", "cancel_dispute"]),
    reason:      z.string().max(500).optional(),
    // Horário real de retirada (mark_active) ou devolução (mark_returned/confirm_return)
    actualTime:  z.string().datetime({ message: "actualTime inválido" }).optional(),
    // Token de segurança obrigatório no mark_active
    pickupToken: z.string().length(6).regex(/^\d{6}$/, "Token deve ter 6 dígitos numéricos").optional(),
  })
  .superRefine((data, ctx) => {
    if (
      (data.action === "cancel" || data.action === "open_dispute") &&
      !data.reason?.trim()
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Motivo obrigatório para esta ação.",
        path: ["reason"],
      })
    }
    if (data.actualTime && new Date(data.actualTime) > new Date()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "O horário informado não pode ser no futuro.",
        path: ["actualTime"],
      })
    }
  })

export type PatchBookingInput = z.infer<typeof PatchBookingSchema>
