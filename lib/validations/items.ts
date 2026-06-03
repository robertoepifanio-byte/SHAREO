import { z } from "zod"

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
] as const

export const CreateItemSchema = z.object({
  title:         z.string().min(5, "Título: mínimo 5 caracteres").max(120, "Título muito longo"),
  description:   z.string().min(20, "Descrição: mínimo 20 caracteres").max(2000, "Descrição muito longa"),
  categoryId:    z.string().min(1, "Selecione uma categoria"),
  condition:     z.enum(["NEW", "EXCELLENT", "GOOD", "FAIR"], {
    errorMap: () => ({ message: "Estado de conservação inválido" }),
  }),
  pricePerDay:   z.number().int().min(100, "Preço mínimo: R$ 1,00/dia"),
  pricePerWeek:  z.number().int().min(0).nullable().optional(),
  pricePerMonth: z.number().int().min(0).nullable().optional(),
  depositAmount:        z.number().int().min(0).nullable().optional(),
  estimatedRetailPrice: z.number().int().min(0).nullable().optional(),
  address:       z.string().max(200).optional().or(z.literal("")).transform(v => v || undefined),
  city:          z.string().min(2, "Cidade obrigatória").max(100),
  state:         z.enum(BR_STATES, { errorMap: () => ({ message: "Estado inválido" }) }),
  neighborhood:  z.string().max(100).optional().or(z.literal("")).transform(v => v || undefined),
  latitude:      z.number().min(-90).max(90),
  longitude:     z.number().min(-180).max(180),
  voltage:       z.enum(["110V", "220V", "Bivolt"]).nullable().optional(),
  requireIdVerification: z.boolean().optional().default(false),
  requirePhone:          z.boolean().optional().default(false),
})

export type CreateItemInput = z.infer<typeof CreateItemSchema>

export const UpdateItemSchema = CreateItemSchema.partial().extend({
  // isActive mantido por retrocompatibilidade — mapeado para status na API
  isActive: z.boolean().optional(),
  status: z.enum(["AVAILABLE", "PAUSED"]).optional(),
})

export type UpdateItemInput = z.infer<typeof UpdateItemSchema>

export const ListItemsQuerySchema = z.object({
  page:       z.coerce.number().int().min(1).default(1),
  limit:      z.coerce.number().int().min(1).max(50).default(20),
  search:     z.string().max(100).optional(),
  categoryId: z.string().optional(),
  city:       z.string().max(100).optional(),
  state:      z.string().max(2).optional(),
  minPrice:   z.coerce.number().int().min(0).optional(),
  maxPrice:   z.coerce.number().int().optional(),
  ownerId:    z.string().optional(),
})

export type ListItemsQuery = z.infer<typeof ListItemsQuerySchema>
