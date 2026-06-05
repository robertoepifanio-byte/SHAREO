import { z } from "zod"

const PIX_KEY_PATTERNS: Record<string, RegExp> = {
  CPF:    /^\d{3}\.?\d{3}\.?\d{3}-?\d{2}$/,
  CNPJ:   /^\d{2}\.?\d{3}\.?\d{3}\/?\d{4}-?\d{2}$/,
  EMAIL:  /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE:  /^\+55\d{10,11}$/,
  RANDOM: /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
}

export const PaymentAccountSchema = z
  .object({
    pixKeyType: z.enum(["CPF", "CNPJ", "EMAIL", "PHONE", "RANDOM"]),
    pixKey:     z.string().min(1, "Chave PIX obrigatória").max(150),
    holderName: z.string().min(2, "Nome do titular obrigatório").max(120),
    bankName:   z.string().max(80).optional(),
  })
  .superRefine((data, ctx) => {
    const pattern = PIX_KEY_PATTERNS[data.pixKeyType]
    if (pattern && !pattern.test(data.pixKey.trim())) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pixKey"],
        message: pixKeyLabel(data.pixKeyType) + " inválido",
      })
    }
  })

export type PaymentAccountInput = z.infer<typeof PaymentAccountSchema>

export function pixKeyLabel(type: string): string {
  const labels: Record<string, string> = {
    CPF:    "CPF",
    CNPJ:   "CNPJ",
    EMAIL:  "E-mail",
    PHONE:  "Telefone",
    RANDOM: "Chave aleatória",
  }
  return labels[type] ?? type
}

export function pixKeyPlaceholder(type: string): string {
  const ph: Record<string, string> = {
    CPF:    "000.000.000-00",
    CNPJ:   "00.000.000/0001-00",
    EMAIL:  "seu@email.com",
    PHONE:  "+5584999999999",
    RANDOM: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
  }
  return ph[type] ?? ""
}
