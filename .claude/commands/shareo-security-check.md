# /shareo-security-check

Você é o Analista de Segurança do projeto **Shareo**. Execute uma verificação de segurança pré-deploy no código ou contexto fornecido pelo usuário.

**Como executar:** para varreduras amplas, delegue a investigação ao subagente `seguranca-shareo` (Agent tool) com este checklist no prompt e consolide o resultado aqui; para um diff pequeno, execute inline. Achados devem ter evidência `arquivo:linha` — sem especulação.

## Instrução de Raciocínio

Para cada item do checklist, classifique o resultado como:
- **PASS** — verificado e ok
- **FAIL** — problema encontrado (descreva o problema e o SLA de correção)
- **SKIP** — não aplicável a esta entrega (justifique)
- **MANUAL** — requer verificação humana fora do código

## Checklist de Segurança Pré-Deploy

### Autenticação e Sessão
- [ ] Access tokens com expiração ≤ 15 minutos
- [ ] Refresh token rotativo (invalida o anterior após uso)
- [ ] Logout revoga o token no servidor (não apenas no client)
- [ ] Rate limiting ativo nas rotas: `/api/auth/*`, `/api/users/validate-document`
- [ ] Bloqueio temporário após N tentativas de login falhas

### Controle de Acesso
- [ ] Middleware de autenticação protege todas as rotas `/dashboard/*` e `/api/*` (exceto auth)
- [ ] Respostas de API verificam que o recurso pertence ao usuário autenticado (anti-IDOR)
- [ ] Painel admin acessível apenas para role `admin` — não apenas para usuários autenticados

### Dados Sensíveis (LGPD)
- [ ] CPF/CNPJ: não aparecem em logs, response bodies de listagem, URLs ou localStorage
- [ ] E-mail/telefone: mascarados nos logs (`r***@gmail.com`)
- [ ] Fotos de documentos: URL com token assinado de curta duração (não URL pública permanente)
- [ ] Sentry configurado com filtros de PII antes de enviar eventos

### Infraestrutura
- [ ] Guards server-side de ownership em TODA rota que lê/escreve recurso de usuário (`if (resource.ownerId !== session.user.id) → 403`) — **RLS é desabilitado por design** (PgBouncer); a segurança é 100% nesses guards. Data API do Supabase sem `public` nos Exposed schemas.
- [ ] Rotas consumidas pelo app mobile (Bearer) usam `resolveUserId` — `auth()` cookie-only retorna 401 no app (padrão sistêmico, já corrigido 8×). Admin permanece cookie-only.
- [ ] Nenhuma chave de API no código ou `.env` commitado (nem em `.claude/settings*.json`)
- [ ] Headers de segurança configurados em `next.config.js`:
  - Content-Security-Policy
  - X-Frame-Options: DENY
  - Strict-Transport-Security
  - Permissions-Policy
- [ ] CORS restrito aos domínios autorizados (não `*`)

### Dependências
- [ ] `npm audit` sem vulnerabilidades críticas ou altas sem mitigação documentada
- [ ] Novas dependências adicionadas nesta entrega têm: manutenção ativa + histórico limpo

### Inputs e Validação
- [ ] Todos os inputs validados com Zod no servidor (não confiar na validação do frontend)
- [ ] Upload de arquivos: validação de tipo MIME + limite de tamanho + scan de conteúdo
- [ ] Sem `dangerouslySetInnerHTML` com conteúdo gerado pelo usuário

## Formato da Resposta

Liste os resultados agrupados por categoria. Para itens FAIL:

```
[FAIL] Categoria — descrição do problema
Risco: Alto / Médio / Baixo
SLA de correção: 24h / 7 dias / próxima sprint
Como corrigir: [instrução direta]
```

Ao final: **LIBERADO PARA DEPLOY** ou **BLOQUEADO — N itens críticos pendentes**.
