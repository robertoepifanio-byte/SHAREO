# ADR-001 — Framework de Autenticação

**Status**: Aceito  
**Data**: 2026-05-22  
**Decisores**: Arquiteto, Full Stack Dev  
**Revisores**: Analista de Segurança  

---

## Contexto

O ShareO precisa de um sistema de autenticação para o MVP H1 que suporte:
- Cadastro com e-mail + senha
- Sessões persistentes (remember me)
- Rotas protegidas no Next.js App Router
- Integração com Supabase (PostgreSQL) para persistência de usuário
- Suporte futuro a providers OAuth (Google) na H2
- LGPD: registro de consentimento, IP e versão de política no momento do cadastro

As opções consideradas foram:
1. **NextAuth.js v5** (Auth.js)
2. **Supabase Auth** (nativo)
3. **JWT próprio** com cookies httpOnly

---

## Decisão

**NextAuth.js v5 (Auth.js)** com adapter do Prisma.

---

## Justificativa

### Por NextAuth.js v5

| Critério | NextAuth.js v5 | Supabase Auth | JWT próprio |
|---|---|---|---|
| Integração App Router | Nativa (middleware + Server Components) | Requer wrapper manual | Manual |
| Providers OAuth | 50+ prontos para H2 | Poucos providers nativos | Manual |
| Adapter Prisma | Oficial, mantido | Não se aplica | Não se aplica |
| Controle do schema de usuário | Total (via Prisma) | Limitado (tabela auth.users separada) | Total |
| Complexidade de manutenção | Baixa | Média (dois schemas) | Alta |
| Curva de aprendizado | Baixa | Média | Alta |
| Segurança (CSRF, session rotation) | Tratada pela lib | Tratada pela lib | Responsabilidade nossa |

### Contra Supabase Auth
O Supabase Auth mantém usuários em um schema separado (`auth.users`), tornando joins e extensões do modelo de usuário mais complexos. Como o ShareO tem campos específicos de domínio (CPF, CNPJ, tipo de usuário, consentimento LGPD), o controle total via Prisma é essencial.

### Contra JWT próprio
JWT próprio só se justifica em cenários de múltiplos clientes (API pública, mobile nativo, parceiros terceiros). Para o MVP, a complexidade adicional de gerenciar refresh tokens, rotação, revogação e CSRF protection não se justifica.

---

## Configuração

```typescript
// auth.config.ts
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "@/lib/prisma"
import Credentials from "next-auth/providers/credentials"

export const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },  // JWT (não database sessions) para edge runtime
  providers: [
    Credentials({
      // validação via bcrypt + zod
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
        token.userType = user.userType
      }
      return token
    },
    session({ session, token }) {
      session.user.id = token.id as string
      session.user.role = token.role as string
      return session
    },
  },
}
```

### Middleware de proteção de rotas

```typescript
// middleware.ts
import { auth } from "@/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const isLoggedIn = !!req.auth
  const isProtected = req.nextUrl.pathname.startsWith("/dashboard")

  if (isProtected && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.url))
  }
})

export const config = {
  matcher: ["/dashboard/:path*", "/api/items/:path*", "/api/bookings/:path*"],
}
```

---

## Consequências

**Positivas**:
- Fácil adição de Google OAuth na H2 (1 linha de código)
- Schema de usuário 100% controlado via Prisma
- Proteção de rotas via middleware no edge
- Sessões JWT com claims customizados (role, userType) sem round-trip ao banco

**Negativas**:
- NextAuth.js v5 ainda em beta (RC) — acompanhar changelogs
- Necessário adaptar o schema Prisma para incluir as tabelas de sessão/verificação do NextAuth (Account, Session, VerificationToken) — **já incluídas no schema.prisma v0.1**

---

## Itens em Aberto

- [ ] Definir estratégia de hash de senha (bcrypt cost factor — default 12 para MVP)
- [ ] Verificação de e-mail: obrigatória antes de anunciar? (recomendação: sim)
- [ ] Rate limiting no endpoint `/api/auth/callback/credentials` (ver ADR de segurança)
- [ ] Criptografia de CPF/CNPJ em repouso — separar em ADR-004
