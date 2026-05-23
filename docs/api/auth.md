# Contratos de API — Domínio Auth

**Base path**: `/api/auth`  
**Autenticação**: NextAuth.js v5 (ver ADR-001)

---

## Tipos compartilhados

```typescript
// Resposta pública de usuário — nunca expor campos sensíveis
type UserPublic = {
  id:           string
  name:         string
  email:        string
  userType:     "PF" | "PJ"
  role:         "USER" | "ADMIN"
  avatarUrl:    string | null
  bio:          string | null
  city:         string | null
  state:        string | null
  isVerified:   boolean
  createdAt:    string  // ISO 8601
}

// Campos retornados apenas para o próprio usuário (dashboard)
type UserPrivate = UserPublic & {
  phone:        string | null
  cpfMasked:    string | null  // ex: "•••.456.789-••"
  cnpjMasked:   string | null  // ex: "••.345.678/0001-••"
  neighborhood: string | null
  latitude:     number | null
  longitude:    number | null
  consentAt:    string | null
}
```

---

## Endpoints

### `POST /api/auth/register`

Cria uma nova conta. Registra consentimento LGPD.

**Autenticação**: não requerida  
**Rate limit**: 5 req/min por IP

#### Request body

```typescript
// Schema Zod — lib/validations/auth.ts
const RegisterSchema = z.object({
  name:            z.string().min(3).max(100),
  email:           z.string().email(),
  password:        z.string().min(8).max(72)
                    .regex(/[A-Z]/, "Precisa de ao menos uma letra maiúscula")
                    .regex(/[0-9]/, "Precisa de ao menos um número"),
  phone:           z.string().regex(/^\+55\d{10,11}$/).optional(),
  userType:        z.enum(["PF", "PJ"]),
  cpf:             z.string().optional(),   // obrigatório se userType === "PF"
  cnpj:            z.string().optional(),   // obrigatório se userType === "PJ"
  city:            z.string().min(2).max(100),
  state:           z.string().length(2),
  neighborhood:    z.string().max(100).optional(),
  consentVersion:  z.string(),              // ex: "v1.0" — versão da política aceita
})
.refine(
  (d) => d.userType === "PF" ? !!d.cpf : !!d.cnpj,
  { message: "CPF obrigatório para PF, CNPJ obrigatório para PJ" }
)
```

**Exemplo — PF:**
```json
{
  "name": "Ana Souza",
  "email": "ana@exemplo.com",
  "password": "Senha@123",
  "phone": "+5584999990000",
  "userType": "PF",
  "cpf": "123.456.789-09",
  "city": "Natal",
  "state": "RN",
  "neighborhood": "Ponta Negra",
  "consentVersion": "v1.0"
}
```

**Exemplo — PJ:**
```json
{
  "name": "Ferramentas Nordeste Ltda",
  "email": "contato@ferramentasnordeste.com.br",
  "password": "Senha@123",
  "userType": "PJ",
  "cnpj": "11.222.333/0001-81",
  "city": "Natal",
  "state": "RN",
  "consentVersion": "v1.0"
}
```

#### Resposta de sucesso — `201 Created`

```json
{
  "data": {
    "id": "clx1a2b3c4d5e6f7g",
    "name": "Ana Souza",
    "email": "ana@exemplo.com",
    "userType": "PF",
    "role": "USER",
    "avatarUrl": null,
    "bio": null,
    "city": "Natal",
    "state": "RN",
    "isVerified": false,
    "createdAt": "2026-05-22T14:30:00.000Z"
  }
}
```

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Body inválido (detalhes em `error.details`) |
| `400` | `INVALID_CPF` | CPF com dígito verificador inválido |
| `400` | `INVALID_CNPJ` | CNPJ com dígito verificador inválido |
| `409` | `EMAIL_ALREADY_EXISTS` | E-mail já cadastrado |
| `409` | `CPF_ALREADY_EXISTS` | CPF já cadastrado (não revelar a quem pertence) |
| `409` | `CNPJ_ALREADY_EXISTS` | CNPJ já cadastrado |
| `429` | `RATE_LIMIT_EXCEEDED` | Muitas tentativas de cadastro |

```json
// Exemplo 400 — validação múltiplos campos
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos. Corrija os campos indicados.",
    "details": {
      "password": ["Precisa de ao menos uma letra maiúscula"],
      "cpf": ["CPF é obrigatório para pessoa física"]
    }
  }
}
```

---

### `POST /api/auth/[...nextauth]` — Login

Gerenciado pelo NextAuth.js. O cliente usa `signIn("credentials", {...})`.

**Internamente chama**:
1. Busca o usuário por e-mail no banco via Prisma
2. Verifica `bcrypt.compare(password, user.passwordHash)`
3. Verifica `user.isActive` (conta não deletada)
4. Cria sessão JWT com claims: `{ id, email, name, role, userType }`

**Credenciais enviadas:**
```json
{
  "email": "ana@exemplo.com",
  "password": "Senha@123"
}
```

**Rate limit**: 5 tentativas/min por IP (bloqueia por 15 min após exceder)

**Erros mapeados pelo NextAuth:**
- `CredentialsSignin` → "E-mail ou senha incorretos" (não diferenciar qual está errado)
- Conta deletada (`deletedAt != null`) → "Conta não encontrada"
- Conta inativa (`isActive: false`) → "Conta suspensa. Entre em contato com o suporte."

---

### `POST /api/auth/forgot-password`

Envia e-mail com link para redefinição de senha.

**Autenticação**: não requerida  
**Rate limit**: 3 req/10min por IP

#### Request body

```typescript
const ForgotPasswordSchema = z.object({
  email: z.string().email(),
})
```

#### Resposta — `204 No Content` (sempre, mesmo se e-mail não existir)

> **Por que sempre 204?** Revelar se um e-mail está cadastrado é uma vulnerabilidade de enumeração (OWASP). O usuário sempre vê "Se o e-mail estiver cadastrado, você receberá um link em breve."

**Comportamento interno:**
1. Busca usuário pelo e-mail
2. Se existir: gera token criptograficamente seguro (`crypto.randomBytes(32)`) com expiração de 1 hora, salva hash do token na tabela `VerificationToken` do NextAuth, envia e-mail via Resend com link `${APP_URL}/redefinir-senha?token=<token>`
3. Se não existir: retorna 204 sem ação (sem side-effects observáveis)

---

### `POST /api/auth/reset-password`

Redefine a senha usando o token recebido por e-mail.

**Autenticação**: não requerida  
**Rate limit**: 5 req/10min por IP

#### Request body

```typescript
const ResetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8).max(72)
              .regex(/[A-Z]/)
              .regex(/[0-9]/),
})
```

#### Resposta de sucesso — `204 No Content`

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Senha não atende aos requisitos |
| `400` | `INVALID_OR_EXPIRED_TOKEN` | Token inválido ou expirado (> 1 hora) |

---

### `PATCH /api/auth/change-password`

Altera a senha do usuário autenticado.

**Autenticação**: requerida

#### Request body

```typescript
const ChangePasswordSchema = z.object({
  currentPassword: z.string(),
  newPassword:     z.string().min(8).max(72)
                     .regex(/[A-Z]/)
                     .regex(/[0-9]/),
})
```

#### Resposta de sucesso — `204 No Content`

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `VALIDATION_ERROR` | Nova senha não atende aos requisitos |
| `400` | `WRONG_CURRENT_PASSWORD` | Senha atual incorreta |
| `401` | `UNAUTHORIZED` | Sessão inválida ou expirada |

---

### `DELETE /api/auth/account`

Exclui a conta do usuário conforme LGPD (direito ao esquecimento).

**Autenticação**: requerida  
**Ação**: soft-delete + anonimização de dados pessoais

#### Request body

```typescript
const DeleteAccountSchema = z.object({
  password: z.string(),         // confirmação de identidade
  reason:   z.string().optional(),
})
```

#### Resposta de sucesso — `204 No Content`

**Comportamento interno:**
1. Verifica `bcrypt.compare(password, user.passwordHash)`
2. Define `user.deletedAt = now()`, `user.isActive = false`
3. Anonimiza: `name = "Usuário removido"`, `email = "<id>@removed.shareo"`, `phone = null`, `avatarUrl = null`, `bio = null`, `cpfEncrypted = null`, `cnpjEncrypted = null`
4. Mantém `cpfHash` e `cnpjHash` para impedir recadastro com mesmo documento
5. Encerra todas as sessões ativas do usuário

#### Respostas de erro

| Código | `error.code` | Quando |
|---|---|---|
| `400` | `WRONG_PASSWORD` | Senha incorreta |
| `401` | `UNAUTHORIZED` | Sessão inválida |
| `422` | `ACTIVE_BOOKINGS_EXIST` | Usuário tem aluguéis ativos — não pode deletar |

---

### `GET /api/auth/session`

Retorna os dados da sessão atual. Usado pelo cliente para hidratar o estado de auth.

**Autenticação**: não requerida (retorna `null` se não autenticado)

#### Resposta — `200 OK`

```json
// Autenticado
{
  "data": {
    "user": {
      "id": "clx1a2b3c4d5e6f7g",
      "email": "ana@exemplo.com",
      "name": "Ana Souza",
      "role": "USER",
      "userType": "PF",
      "avatarUrl": null
    },
    "expires": "2026-06-22T14:30:00.000Z"
  }
}

// Não autenticado
{
  "data": null
}
```

---

## Implementação — notas para o FullStack Dev

### Validação de CPF (utils/cpf.ts)

```typescript
export function isValidCPF(cpf: string): boolean {
  const digits = cpf.replace(/\D/g, "")
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false

  const calc = (len: number) => {
    let sum = 0
    for (let i = 0; i < len; i++) sum += parseInt(digits[i]) * (len + 1 - i)
    const rem = (sum * 10) % 11
    return rem === 10 || rem === 11 ? 0 : rem
  }
  return calc(9) === parseInt(digits[9]) && calc(10) === parseInt(digits[10])
}
```

### Armazenamento de CPF/CNPJ (lib/crypto.ts)

```typescript
// Dois campos por documento:
// - Hash (bcrypt) → verificar unicidade sem descriptografar
// - Encrypted (AES-256-GCM) → descriptografar para exibir mascarado

export function hashDocument(doc: string): string {
  // bcrypt com cost factor 10 (mais lento que 12 — CPF não precisa de login speed)
  return bcrypt.hashSync(doc.replace(/\D/g, ""), 10)
}

export function encryptDocument(doc: string): string {
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(
    "aes-256-gcm",
    Buffer.from(process.env.ENCRYPTION_KEY!, "hex"),
    iv
  )
  const encrypted = Buffer.concat([cipher.update(doc, "utf8"), cipher.final()])
  const tag = cipher.getAuthTag()
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function maskDocument(type: "CPF" | "CNPJ", doc: string): string {
  if (type === "CPF") return doc.replace(/(\d{3})\.(\d{3})\.(\d{3})-(\d{2})/, "•••.$2.$3-••")
  return doc.replace(/(\d{2})\.(\d{3})\.(\d{3})\/(\d{4})-(\d{2})/, "••.$2.$3/$4-••")
}
```

### Rate limiting — middleware

```typescript
// middleware.ts — usando upstash/ratelimit ou implementação simples em memória no dev
import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(5, "1 m"),  // 5 req/min
})

// Aplicar em: /api/auth/register, /api/auth/callback/credentials
```
