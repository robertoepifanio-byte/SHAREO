import { z } from "zod"
import { isValidSlug } from "@/lib/slugify"

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const

export const UpdateProfileSchema = z.object({
  name:         z.string().min(3, "Nome: mínimo 3 caracteres").max(100).optional(),
  bio:          z.string().max(500, "Bio: máximo 500 caracteres").nullable().optional(),
  phone:        z
    .string()
    .regex(/^\+55\d{10,11}$/, "Telefone inválido (ex: +5584999999999)")
    .nullable()
    .optional(),
  city:         z.string().min(2, "Cidade: mínimo 2 caracteres").max(100).optional(),
  state:        z.enum(BR_STATES, { errorMap: () => ({ message: "Estado inválido" }) }).nullable().optional(),
  neighborhood: z.string().max(100).nullable().optional(),
  avatarUrl:    z.string().url("URL de avatar inválida").max(500).nullable().optional(),
  slug:         z
    .string()
    .max(50, "Slug: máximo 50 caracteres")
    .refine((v) => isValidSlug(v), {
      message: "Slug inválido — use letras minúsculas, números e hífens (ex: minha-loja)",
    })
    .optional(),
})

export type UpdateProfileInput = z.infer<typeof UpdateProfileSchema>
