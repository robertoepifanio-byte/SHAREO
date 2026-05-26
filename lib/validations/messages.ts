import { z } from "zod"

export const SendMessageSchema = z.object({
  content: z.string().min(1, "Mensagem não pode ser vazia").max(2000, "Máximo 2000 caracteres"),
})

export type SendMessageInput = z.infer<typeof SendMessageSchema>
