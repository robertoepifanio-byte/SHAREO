# Checklist de Validação Manual — ShareO Staging

**Ambiente:** https://shareo-rouge.vercel.app  
**Previsto para:** Julho/2026 (pré sign-off formal)  
**Executar em:** Dispositivo Android real (375px) + Desktop Chrome

---

## Fluxo do Locatário

### 1. Cadastro e Acesso
- [ ] Acessar `/cadastro` em mobile (375px)
- [ ] Preencher nome, e-mail, CPF, senha, cidade, UF
- [ ] Aceitar termos de privacidade e confirmação de idade
- [ ] Verificar mensagem de boas-vindas após cadastro
- [ ] Fazer login com as credenciais criadas
- [ ] Verificar redirecionamento para `/dashboard`

### 2. Busca de Itens
- [ ] Acessar homepage — verificar hero e CTAs visíveis
- [ ] Usar busca no hero: digitar "furadeira" e clicar Buscar
- [ ] Verificar URL `/itens?search=furadeira` e resultados na listagem
- [ ] Aplicar filtro de categoria (ex: Ferramentas)
- [ ] Verificar paginação (se houver mais de 6 itens)
- [ ] Clicar em um item — verificar página de detalhe completa

### 3. Favoritos
- [ ] Favoritar um item na listagem (ícone de coração)
- [ ] Acessar `/favoritos` e confirmar item presente
- [ ] Desfavoritar — verificar remoção da lista

### 4. Contato e Chat
- [ ] Na página de detalhe de um item, clicar em "Entrar em contato"
- [ ] Verificar abertura da conversa em `/mensagens`
- [ ] Enviar uma mensagem
- [ ] Verificar entrega em tempo real (Supabase Realtime)

### 5. Perfil
- [ ] Acessar `/perfil` e verificar dados exibidos
- [ ] Editar campo de cidade — salvar e confirmar persistência
- [ ] Verificar avatar e informações de verificação

---

## Fluxo do Proprietário

### 6. Cadastro de Anúncio
- [ ] Acessar `/itens/novo` (deve redirecionar para login se não autenticado)
- [ ] Após login, acessar `/itens/novo`
- [ ] Preencher: título, descrição, categoria, preço/dia, cidade, UF, bairro
- [ ] Adicionar ao menos 1 foto (upload para Supabase Storage)
- [ ] Submeter e verificar item criado em `/meus-anuncios`
- [ ] Verificar que item aparece como "aguardando aprovação"

### 7. Gestão de Anúncios
- [ ] Editar o item criado — alterar preço
- [ ] Verificar atualização na listagem
- [ ] Verificar que item pendente NÃO aparece em `/itens` público
- [ ] (Após aprovação admin) Verificar item em `/itens`

### 8. Recebimento de Mensagem
- [ ] Com outra conta (locatário), enviar mensagem sobre o item
- [ ] Verificar notificação em tempo real na conta do proprietário
- [ ] Responder e confirmar entrega

---

## Fluxo Admin

### 9. Moderação
- [ ] Logar com conta admin (role=ADMIN)
- [ ] Acessar `/admin`
- [ ] Aprovar o item criado no passo 6
- [ ] Verificar que item aparece em `/itens` público após aprovação
- [ ] Testar desativação de usuário de teste

---

## Validação iOS Safari (BrowserStack — Julho/2026)

> **Requisito:** conta BrowserStack ativa  
> **Dispositivo alvo:** iPhone 14 ou 15, Safari 17+

- [ ] Configurar BrowserStack Automate com credenciais em `.env.local`
- [ ] Executar spec cross-browser com capabilities de iOS Safari
- [ ] Verificar: homepage, busca, detalhe de item, login, cadastro
- [ ] Verificar gestos de swipe em mobile (BottomSheet, carrossel de fotos)
- [ ] Verificar que tap targets ≥ 44×44px funcionam corretamente

**Comando de referência:**
```bash
BROWSERSTACK_USERNAME=xxx BROWSERSTACK_ACCESS_KEY=yyy \
pnpm playwright test e2e/e2e-crossbrowser-plan.spec.ts \
  --config=playwright.browserstack.config.ts
```

---

## Critérios de Aceitação para Sign-off

| Critério | Meta | Validação |
|---|---|---|
| Fluxo Locatário completo | Sem bloqueios | Manual |
| Fluxo Proprietário completo | Sem bloqueios | Manual |
| iOS Safari — páginas críticas | 0 erros visuais | BrowserStack |
| Mensagens em tempo real | Entrega < 2s | Manual |
| Upload de imagem | Funcional | Manual |
| Notificações | Recebidas | Manual |
| LGPD: exportar dados | Link visível e funcional | Manual |
| LGPD: excluir conta | Fluxo operacional | Manual |

---

*Gerado em 2026-06-02. Executar antes do sign-off formal (julho/2026).*
