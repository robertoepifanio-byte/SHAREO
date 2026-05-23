# ADR-004 — Criptografia de Documentos Sensíveis (CPF/CNPJ)

**Status**: Aceito  
**Data**: 2026-05-22  
**Decisores**: Arquiteto, Analista de Segurança  
**Referência**: ADR-001 (autenticação), `docs/api/auth.md`

---

## Contexto

O ShareO coleta CPF (usuários PF) e CNPJ (usuários PJ) no cadastro. Esses dados são considerados **dados pessoais sensíveis** sob a LGPD e exigem:

1. **Proteção em repouso**: criptografia no banco — acesso ao banco não deve expor documentos legíveis
2. **Verificação de unicidade**: impedir dois cadastros com o mesmo CPF/CNPJ sem armazenar o valor em texto claro
3. **Exibição mascarada**: mostrar ao próprio usuário apenas parte do documento (`•••.456.789-••`)
4. **Exclusão definitiva**: ao deletar conta, garantir que o documento não possa ser recuperado, mas impedir recadastro com o mesmo documento

Dois requisitos são conflitantes: criptografia simétrica (AES) permite descriptografar → mascarar, mas hash unidirecional (bcrypt) não permite mascarar. Precisamos de ambos.

---

## Opções Consideradas

### Opção A: Hash único (bcrypt) — sem criptografia
- **Prós**: simples, sem chave de criptografia para gerenciar
- **Contras**: não permite exibição mascarada; violação de LGPD se interpretada como dado pessoal sem possibilidade de acesso pelo titular

### Opção B: Criptografia simétrica apenas (AES-256-GCM)
- **Prós**: permite mascaramento e verificação de unicidade (descriptografar e comparar)
- **Contras**: verificação de unicidade exige descriptografar todos os registros ou manter índice em texto claro — ambos inaceitáveis em escala

### Opção C: Hash (bcrypt) + Criptografia (AES-256-GCM) — dois campos por documento ✅
- **Prós**: unicidade via hash (O(1)), mascaramento via descriptografia, chave única gerenciada via env var
- **Contras**: dois campos por documento no banco; complexidade ligeiramente maior

### Opção D: Supabase Vault
- **Prós**: gerenciamento de chave pelo Supabase, integração nativa com PostgreSQL
- **Contras**: dependência de feature específica do Supabase (portabilidade reduzida), requer configuração adicional por ambiente, ainda Beta no Supabase free tier

---

## Decisão

**Opção C**: dois campos por documento — `[doc]Hash` (bcrypt) e `[doc]Encrypted` (AES-256-GCM).

**Campos no schema (já implementados em `prisma/schema.prisma`):**
```prisma
cpfHash       String?  @unique  // bcrypt — verifica unicidade e bloqueio pós-exclusão
cpfEncrypted  String?           // AES-256-GCM — descriptografa para exibição mascarada
cnpjHash      String?  @unique
cnpjEncrypted String?
```

---

## Implementação (`lib/crypto.ts`)

```typescript
import crypto from "crypto"
import bcrypt from "bcryptjs"

const ALGORITHM = "aes-256-gcm"
const KEY = Buffer.from(process.env.ENCRYPTION_KEY!, "hex")  // 32 bytes
const IV_LENGTH = 12  // bytes — recomendado para GCM

export function hashDocument(doc: string): string {
  // Remove formatação (pontos, traços, barras) antes de hashear
  return bcrypt.hashSync(doc.replace(/\D/g, ""), 10)
}

export function verifyDocument(doc: string, hash: string): boolean {
  return bcrypt.compareSync(doc.replace(/\D/g, ""), hash)
}

export function encryptDocument(doc: string): string {
  const iv = crypto.randomBytes(IV_LENGTH)
  const cipher = crypto.createCipheriv(ALGORITHM, KEY, iv)
  const encrypted = Buffer.concat([
    cipher.update(doc.replace(/\D/g, ""), "utf8"),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()
  // Formato: iv:tag:ciphertext (tudo hex)
  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`
}

export function decryptDocument(stored: string): string {
  const [ivHex, tagHex, cipherHex] = stored.split(":")
  const iv = Buffer.from(ivHex, "hex")
  const tag = Buffer.from(tagHex, "hex")
  const ciphertext = Buffer.from(cipherHex, "hex")
  const decipher = crypto.createDecipheriv(ALGORITHM, KEY, iv)
  decipher.setAuthTag(tag)
  return decipher.update(ciphertext).toString("utf8") + decipher.final("utf8")
}

export function maskCPF(cpf: string): string {
  // "12345678909" → "•••.456.789-09"
  return cpf.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "•••.$2.$3-$4")
}

export function maskCNPJ(cnpj: string): string {
  // "11222333000181" → "••.222.333/0001-81"
  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "••.$2.$3/$4-$5")
}
```

---

## Fluxo no cadastro

```
Input: "123.456.789-09"
         │
         ├─ hashDocument()     → cpfHash  (bcrypt, armazenado no banco)
         └─ encryptDocument()  → cpfEncrypted (AES-GCM, armazenado no banco)

Na exibição ao usuário:
  decryptDocument(cpfEncrypted) → "12345678909"
  maskCPF("12345678909")        → "•••.456.789-09"

Na exclusão da conta (LGPD):
  cpfEncrypted = null   ← dado pessoal removido
  cpfHash mantido       ← impede recadastro com mesmo CPF
```

---

## Consequências

**Positivas**:
- LGPD: dado pessoal removível na exclusão (cpfEncrypted = null)
- Unicidade garantida sem texto claro no banco
- Chave única gerenciada via variável de ambiente (`ENCRYPTION_KEY`)
- Portável: não depende de feature específica do Supabase

**Negativas**:
- Dois campos por documento no schema
- `ENCRYPTION_KEY` precisa ser rotacionada periodicamente (processo não automatizado no MVP)
- Perda da `ENCRYPTION_KEY` = dados inacessíveis (mitigação: backup seguro da chave)

---

## Itens em Aberto

- [ ] Processo de rotação da `ENCRYPTION_KEY` (re-criptografar todos os documentos) — P2, H2
- [ ] Auditoria de acesso: registrar quando dados de documento são descriptografados — P2
- [ ] Avaliar migração para Supabase Vault quando sair de Beta — H2
