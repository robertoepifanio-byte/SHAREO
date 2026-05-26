import { z } from "zod"
import { validateCPF } from "./cpf"
import { validateCNPJ } from "./cnpj"

export const cpfSchema = z.string().refine(validateCPF, { message: "CPF inválido" })
export const cnpjSchema = z.string().refine(validateCNPJ, { message: "CNPJ inválido" })

export const phoneSchema = z
  .string()
  .regex(/^\(\d{2}\)\s?\d{4,5}-\d{4}$/, "Telefone inválido")

export const cepSchema = z
  .string()
  .regex(/^\d{5}-?\d{3}$/, "CEP inválido")

export const passwordSchema = z
  .string()
  .min(8, "Mínimo 8 caracteres")
  .regex(/[A-Z]/, "Deve conter letra maiúscula")
  .regex(/[0-9]/, "Deve conter número")
