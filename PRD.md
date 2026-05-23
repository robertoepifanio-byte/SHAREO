# PRD — ShareO MVP (H1)

**Versão**: 1.0  
**Data**: 2026-05-22  
**Status**: Draft  
**Owner**: Product Owner  

---

## 1. Problema e Oportunidade

A maioria das pessoas possui itens de uso esporádico (furadeiras, tendas, câmeras, geradores) que ficam parados enquanto outras precisam deles por dias ou semanas. Plataformas de aluguel entre pessoas físicas são inexistentes ou genéricas demais no Brasil, especialmente para o mercado local de cidades médias.

**ShareO** resolve isso com um marketplace de economia circular para aluguel de itens entre vizinhos e comunidades locais. Proposta de valor: quem tem item, monetiza. Quem precisa, economiza. Todos reduzem consumo.

**Slogan**: "Use Mais. Possua Menos."

---

## 2. Personas

### Locador (proprietário do item)
- Possui itens que usa raramente
- Quer gerar renda extra sem burocracia
- Pode ser PF (pessoa física) ou PJ (pessoa jurídica — ex.: loja de ferramentas)
- Preocupação principal: segurança do item e confiabilidade do locatário

### Locatário (quem aluga)
- Precisa de um item por dias ou semanas
- Não quer comprar por uso pontual
- Busca praticidade, preço justo e proximidade geográfica
- Preocupação principal: disponibilidade, condição do item e facilidade de contato

### Admin
- Equipe interna ShareO
- Modera anúncios, resolve disputas, aprova contas PJ
- Acessa dashboard com KPIs e ferramentas de gestão

---

## 3. Escopo do MVP (H1)

### 3.1 Dentro do Escopo

| # | Feature | Prioridade |
|---|---|---|
| F01 | Cadastro e login (PF com CPF / PJ com CNPJ) | Must Have |
| F02 | Perfil de usuário com foto, bio, cidade e avaliações | Must Have |
| F03 | Validação de CPF/CNPJ no cadastro (formato + dígito verificador) | Must Have |
| F04 | Cadastro de anúncio de item com fotos, descrição, preço e localização | Must Have |
| F05 | Busca geolocalizada de itens por raio (default: 10 km) | Must Have |
| F06 | Filtros: categoria, preço, distância, condição do item | Must Have |
| F07 | Página de detalhe do item (fotos, descrição, avaliações, mapa) | Must Have |
| F08 | Solicitação de aluguel (datas, mensagem inicial, confirmação do locador) | Must Have |
| F09 | Chat in-app entre locador e locatário (por anúncio/negociação) | Must Have |
| F10 | Sistema de avaliações bilateral (locador avalia locatário e vice-versa) | Must Have |
| F11 | Favoritos (salvar anúncios) | Should Have |
| F12 | Dashboard do usuário (meus anúncios, minhas locações, conversas) | Must Have |
| F13 | Dashboard admin básico (anúncios, usuários, moderação) | Must Have |
| F14 | Notificações in-app (nova mensagem, solicitação de aluguel, avaliação) | Should Have |

### 3.2 Fora do Escopo do MVP

- Pagamento integrado (combinação direta entre usuários no MVP)
- Seguro do item
- Assinatura PJ Premium (H2)
- App mobile nativo (H3)
- Verificação de identidade via serviço externo (KYC)
- Inventário sincronizado de loja (H2)

---

## 4. Fluxos Principais

### 4.1 Fluxo de Cadastro e Onboarding
```
Acessa /cadastro
→ Escolhe tipo: PF (CPF) ou PJ (CNPJ)
→ Preenche dados: nome, e-mail, telefone, senha, localização
→ Valida CPF/CNPJ (cliente + servidor)
→ Aceita termos e política de privacidade (consentimento LGPD registrado)
→ Confirmação por e-mail
→ Redirecionado ao dashboard
```

### 4.2 Fluxo de Publicar Anúncio
```
Dashboard → "Anunciar item"
→ Título, descrição, categoria, condição
→ Fotos (até 8, mínimo 1)
→ Preço por dia/semana/mês (ao menos preço por dia obrigatório)
→ Valor de caução (opcional)
→ Localização (endereço ou pin no mapa)
→ Publicado (visível imediatamente, sujeito a moderação reativa)
```

### 4.3 Fluxo de Solicitar Aluguel
```
Página do item → "Solicitar aluguel"
→ Locatário seleciona datas de início e fim
→ Locatário envia mensagem inicial
→ Locador recebe notificação e aceita/recusa
→ Se aceito: chat habilitado para combinar entrega/retirada
→ Aluguel confirmado (status: CONFIRMED)
→ No dia de início: status → ACTIVE (manual ou automático)
→ Devolução: locador registra devolução → status → RETURNED
→ Ambos recebem convite para avaliar
```

### 4.4 Máquina de Estados do Aluguel

```
PENDING → CONFIRMED (locador aceita)
PENDING → CANCELLED (locador recusa ou locatário cancela antes de 24h)
CONFIRMED → ACTIVE (data de início chegou)
CONFIRMED → CANCELLED (cancelamento antes do início)
ACTIVE → RETURNED (locador registra devolução)
ACTIVE → DISPUTED (qualquer parte abre disputa)
RETURNED → COMPLETED (após avaliações ou 7 dias sem ação)
DISPUTED → COMPLETED (admin resolve)
DISPUTED → CANCELLED (admin resolve)
```

---

## 5. Requisitos Não-Funcionais

| Requisito | Meta |
|---|---|
| LCP (Largest Contentful Paint) | < 2.5s |
| CLS (Cumulative Layout Shift) | < 0.1 |
| INP (Interaction to Next Paint) | < 200ms |
| Uptime | 99.9% |
| Cobertura de testes (domínios core) | ≥ 70% |
| CI pipeline | < 10 min |
| Setup local (novo dev) | < 30 min |
| LGPD | Conformidade total (consentimento, minimização, exclusão) |
| WCAG | 2.1 AA (contraste mínimo 4.5:1) |

---

## 6. Critérios de Aceite por Feature

### F01 — Cadastro e Login
- [ ] Usuário consegue criar conta PF informando CPF, nome, e-mail, senha e cidade
- [ ] Usuário consegue criar conta PJ informando CNPJ, razão social, e-mail, senha e cidade
- [ ] CPF/CNPJ inválido (dígito verificador errado) é rejeitado com mensagem clara
- [ ] E-mail duplicado exibe mensagem de erro específica
- [ ] Usuário consegue fazer login com e-mail + senha
- [ ] Logout encerra a sessão e redireciona para /
- [ ] Consentimento LGPD é registrado com timestamp e IP no banco

### F04 — Cadastro de Anúncio
- [ ] Anúncio com foto, título, descrição, categoria, preço/dia e localização é criado com sucesso
- [ ] Anúncio sem foto é rejeitado
- [ ] Anúncio aparece na busca geolocalizada após publicação
- [ ] Locador consegue editar e desativar o anúncio

### F05 — Busca Geolocalizada
- [ ] Usuário vê itens num raio de 10 km do centro informado
- [ ] Filtros de categoria, preço máximo e condição funcionam combinados
- [ ] Mapa exibe pins dos resultados
- [ ] Resultado vazio exibe mensagem e sugestão de ampliar raio

### F08 — Solicitação de Aluguel
- [ ] Locatário não pode solicitar aluguel do próprio item
- [ ] Datas inválidas (início no passado, fim antes do início) são rejeitadas
- [ ] Locador recebe notificação e pode aceitar/recusar com 1 clique
- [ ] Locatário é notificado da decisão do locador

### F09 — Chat
- [ ] Mensagens aparecem em tempo real sem recarregar a página
- [ ] Usuário não consegue ler conversas de terceiros
- [ ] Chat só é criado após solicitação de aluguel (não há mensagem fria)

### F10 — Avaliações
- [ ] Avaliação só pode ser feita após aluguel com status RETURNED ou COMPLETED
- [ ] Cada parte só avalia uma vez por aluguel
- [ ] Avaliação aparece no perfil público do avaliado
- [ ] Nota média do usuário é calculada e exibida no perfil

---

## 7. Mercado Inicial

**Cidade piloto**: Natal/RN  
**Hipótese**: usuários urbanos de 25–45 anos com itens ociosos em casa e familiaridade com marketplaces (OLX, Airbnb)

---

## 8. Métricas de Sucesso do MVP

| Métrica | Meta (90 dias pós-lançamento) |
|---|---|
| Usuários cadastrados | 500 |
| Anúncios ativos | 200 |
| Solicitações de aluguel enviadas | 100 |
| Aluguéis completados | 30 |
| NPS | ≥ 40 |

---

## 9. Dependências e Riscos

| Risco | Mitigação |
|---|---|
| Validação de CPF/CNPJ pode ser contornada com CPFs gerados | Hash único + verificação de consistência do dígito verificador no servidor |
| Fotos de item podem conter conteúdo inadequado | Moderação reativa no MVP, moderação automática (H2) |
| Geo-search com PostGIS exige extensão ativa no Supabase | Confirmar ativação da extensão `postgis` no projeto Supabase antes da Sprint 1 |
| Custo de API de mapas pode escalar além do esperado | Definir limite de requisições diárias; usar Mapbox free tier (50k loads/mês) no MVP |
| LGPD: dados de CPF/CNPJ precisam de proteção especial | Criptografia em repouso definida antes da criação das tabelas (ver ADR-001) |
