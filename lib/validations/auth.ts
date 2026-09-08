import { z } from "zod"
import { validateCPF } from "@/utils/cpf"
import { validateCNPJ } from "@/utils/cnpj"

/**
 * E-mail normalizado na FRONTEIRA do servidor.
 *
 * 🪤 Sem isto, gravação e leitura discordavam: o cadastro guardava o endereço
 * como veio (`app/api/auth/register/route.ts` → `email: d.email`) enquanto o
 * `authorize()` do NextAuth busca com `.toLowerCase()` (`lib/auth.ts`). Uma
 * conta criada como `Roberto@Gmail.com` nunca seria encontrada no login — a
 * pessoa receberia "credencial inválida" para uma senha correta.
 *
 * Hoje nenhum usuário real cai nisso porque os dois clientes normalizam antes
 * de enviar (`app/(auth)/cadastro/RegisterForm.tsx` e
 * `apps/mobile/app/(auth)/register.tsx`). Mas a garantia estava do lado errado:
 * dependia de todo cliente lembrar. Qualquer integração, script ou tela nova
 * que esquecesse criaria uma conta na qual não se consegue entrar, sem erro
 * nenhum no caminho.
 *
 * 🪤 Isso vale para linhas NOVAS. `users.email` é `String @unique` — índice
 * btree case-sensitive, sem `citext` — e este PR não faz backfill. Se houver
 * uma linha legada `A@x.com`, a checagem de unicidade do cadastro procura só a
 * forma minúscula, não acha, e cria a SEGUNDA linha. Medir antes de afirmar que
 * não há duplicata: `SELECT id, email FROM users WHERE email <> lower(email)`.
 *
 * Exportado de propósito: é a fronteira, e toda rota que aceita e-mail deve
 * usá-la. Deixá-la privada recriaria a dependência de "todo mundo lembrar" que
 * ela existe para eliminar.
 */
export const emailField = () =>
  z
    .string()
    // 🪤 `.trim()` ANTES do `.email()`: os checks do zod correm na ordem da
    // cadeia, e " a@b.com " com espaços REPROVA na validação de formato. Com o
    // trim depois, um e-mail colado do gerenciador de senhas seria recusado em
    // vez de normalizado — pego pelo teste, não por leitura.
    .trim()
    .email("E-mail inválido")
    .toLowerCase()

export const RegisterSchema = z
  .object({
    name: z
      .string()
      .min(3, "Nome precisa de ao menos 3 caracteres")
      .max(100, "Nome muito longo"),
    email: emailField(),
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
    zipCode: z.string().regex(/^\d{8}$/, "CEP inválido").optional().or(z.literal("")),
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

// ─── Cadastro progressivo ─────────────────────────────────────────────────────

/**
 * Signup mínimo (apenas para navegar): nome, e-mail, senha + localização (cidade/estado).
 * CPF/CNPJ, telefone e endereço detalhado migram para o cadastro completo, exigido só ao
 * Anunciar/Alugar.
 */
export const RegisterMinimalSchema = z.object({
  name: z
    .string()
    .min(3, "Nome precisa de ao menos 3 caracteres")
    .max(100, "Nome muito longo"),
  email: emailField(),
  password: z
    .string()
    .min(8, "Mínimo 8 caracteres")
    .max(72, "Senha muito longa")
    .regex(/[A-Z]/, "Precisa de ao menos uma letra maiúscula")
    .regex(/[0-9]/, "Precisa de ao menos um número"),
  city: z.string().min(2, "Cidade obrigatória").max(100),
  state: z.string().length(2, "Use a sigla do estado (ex: RN)"),
  referralCode: z.string().max(20).optional().or(z.literal("")),
  consentVersion: z.string().min(1),
})

export type RegisterMinimalInput = z.infer<typeof RegisterMinimalSchema>

/**
 * Cadastro completo (concluído ao Anunciar/Alugar): documento + endereço.
 * Cidade/estado já vêm do signup mínimo, mas são aceitos para edição.
 */
export const CompleteRegistrationSchema = z
  .object({
    userType: z.enum(["PF", "PJ"]),
    cpf: z.string().optional(),
    cnpj: z.string().optional(),
    // KYB leve PJ (ADR-024 / M4): ao completar cadastro como PJ, exigir o CPF e o nome
    // do responsável legal + declaração de vínculo. O CPF vai para cpfHash/cpfEncrypted —
    // toda conta PJ passa a ter uma pessoa física identificada por trás.
    cpfResponsavel: z.string().optional(),
    responsavelLegal: z.string().max(150).optional(),
    declaracaoVinculoPJ: z.boolean().optional(),
    phone: z
      .string()
      .regex(/^\+55\d{10,11}$/, "Telefone inválido")
      .optional()
      .or(z.literal("")),
    city: z.string().min(2, "Cidade obrigatória").max(100),
    state: z.string().length(2, "Use a sigla do estado (ex: RN)"),
    zipCode: z.string().regex(/^\d{8}$/, "CEP inválido").optional().or(z.literal("")),
    street: z.string().max(200).optional().or(z.literal("")),
    neighborhood: z.string().max(100).optional().or(z.literal("")),
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
  .refine((d) => d.userType !== "PJ" || (!!d.cpfResponsavel && validateCPF(d.cpfResponsavel)), {
    message: "CPF do responsável legal inválido",
    path: ["cpfResponsavel"],
  })
  .refine((d) => d.userType !== "PJ" || (!!d.responsavelLegal && d.responsavelLegal.trim().length >= 3), {
    message: "Informe o nome do responsável legal",
    path: ["responsavelLegal"],
  })
  .refine((d) => d.userType !== "PJ" || d.declaracaoVinculoPJ === true, {
    message: "É necessário aceitar a declaração de responsável legal.",
    path: ["declaracaoVinculoPJ"],
  })

export type CompleteRegistrationInput = z.infer<typeof CompleteRegistrationSchema>

/**
 * Upgrade de conta PF existente para PJ (POST /api/users/me/upgrade-pj).
 * KYB leve (ADR-024): CNPJ válido + nome do responsável legal + declaração de vínculo.
 */
export const UpgradePjSchema = z.object({
  cnpj: z
    .string()
    .min(14, "CNPJ inválido")
    .refine((v) => validateCNPJ(v), "CNPJ inválido"),
  responsavelLegal: z
    .string()
    .trim()
    .min(3, "Informe o nome do responsável legal")
    .max(150, "Nome muito longo"),
  declaracaoVinculo: z.literal(true, {
    errorMap: () => ({ message: "É necessário aceitar a declaração de responsável legal." }),
  }),
})

export type UpgradePjInput = z.infer<typeof UpgradePjSchema>

export const LoginSchema = z.object({
  email: emailField(),
  password: z.string().min(1),
})
