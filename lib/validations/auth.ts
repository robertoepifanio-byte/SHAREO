import { z } from "zod"
import { validateCPF } from "@/utils/cpf"
import { validateCNPJ } from "@/utils/cnpj"

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(3, "Nome precisa de ao menos 3 caracteres")
      .max(100, "Nome muito longo"),
    email: z.string().email("E-mail inválido"),
    password: z
      .string()
      .min(8, "Mínimo 8 caracteres")
      .max(72, "Senha muito longa")
      .regex(/[A-Z]/, "Precisa de ao menos uma letra maiúscula")
      .regex(/[0-9]/, "Precisa de ao menos um número"),
    phone: z
      .string()
      .regex(/^\+55\d{10,11}$/, "Telefone inválido")
      .optional()
      .or(z.literal("")),
    userType: z.enum(["PF", "PJ"]),
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    city: z.string().min(2, "Cidade obrigatória").max(100),
    state: z.string().length(2, "Use a sigla do estado (ex: RN)"),
    street: z.string().max(200).optional().or(z.literal("")),
    neighborhood: z.string().max(100).optional().or(z.literal("")),
    referralCode: z.string().max(20).optional().or(z.literal("")),
    consentVersion: z.string().min(1),
  })
  .refine((d) => (d.userType === "PF" ? !!d.cpf : !!d.cnpj), {
    message: "CPF obrigatório para Pessoa Física",
    path: ["cpf"],
  })
  .refine((d) => d.userType !== "PF" || (!!d.cpf && validateCPF(d.cpf)), {
    message: "CPF inválido",
    path: ["cpf"],
  })
  .refine((d) => d.userType !== "PJ" || (!!d.cnpj && validateCNPJ(d.cnpj)), {
    message: "CNPJ inválido",
    path: ["cnpj"],
  })

export type RegisterInput = z.infer<typeof RegisterSchema>

export const LoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})
