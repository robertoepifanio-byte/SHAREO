# Histórias de Usuário — ShareO MVP (H1)

> Geradas a partir do protótipo `shareo-prototipo.html` em 2026-05-24.  
> Seguem o padrão do agente Product Owner do projeto.

---

## US-01 — Busca Geral na Landing Page

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: S (1–2 dias)  
**Perfil**: Locatário

---

**Como** visitante não autenticado,  
**quero** digitar o que preciso na caixa de busca da home e ser direcionado para resultados,  
**para que** encontre rapidamente itens disponíveis perto de mim sem precisar navegar por menus.

---

### Critérios de Aceitação

**Cenário 1 – Busca pela hero search**
```gherkin
Dado que estou na home page
Quando digito "furadeira" no campo de busca e clico em "Buscar"
Então sou redirecionado para /busca com o termo pré-preenchido no campo de busca
E vejo os resultados filtrados pelo termo
```

**Cenário 2 – Busca pelo header (desktop)**
```gherkin
Dado que estou em qualquer tela no desktop
Quando clico no campo de busca do header e digito um termo
Então sou levado para a tela de busca
E o termo digitado aparece no campo de busca dos resultados
```

**Cenário 3 – Campo vazio**
```gherkin
Dado que estou na home
Quando clico em "Buscar" com o campo vazio
Então sou redirecionado para /busca mostrando todos os itens disponíveis próximos
```

---

### Notas Técnicas
- Rota `/busca?q=:termo` com query param; SSR para SEO inicial
- Campo de busca do header é `readonly` no protótipo — na implementação, deve aceitar input e aplicar `onSubmit` com push de rota

### Dependências
- US-03 (tela de busca com resultados)

### Riscos
- Latência de busca geolocalizada sem cache pode degradar LCP; usar ISR ou prefetch da listagem inicial

---

## US-02 — Explorar por Categoria

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: XS (< 1 dia)  
**Perfil**: Locatário

---

**Como** visitante,  
**quero** clicar em uma categoria (Ferramentas, Eletrônicos, Esporte etc.) na home,  
**para que** veja apenas os itens daquela categoria sem precisar digitar nada.

---

### Critérios de Aceitação

**Cenário 1 – Navegação por categoria**
```gherkin
Dado que estou na home, seção "Explorar por categoria"
Quando clico no chip "Eletrônicos"
Então sou levado para /busca?categoria=eletronicos
E o chip da categoria correspondente aparece ativo na tela de busca
```

**Cenário 2 – Scroll horizontal em mobile**
```gherkin
Dado que estou no mobile (375px)
Quando a lista de categorias excede a largura da tela
Então consigo deslizar horizontalmente para ver todas as categorias
E a faixa de gradiente lateral indica que há mais itens
```

**Cenário 3 – Keyboard navigation**
```gherkin
Dado que navego via teclado
Quando pressiono Tab até um chip de categoria e Enter
Então sou redirecionado da mesma forma que o clique com mouse
```

---

### Notas Técnicas
- 8 categorias no MVP: Ferramentas, Construção, Moda, Eletrônicos, Casa, Esporte, Jardim, Festas
- Ícones SVG em `icones/` — servir como `<img>` com `alt=""` (decorativo)

### Dependências
- US-03 (tela de busca)

### Riscos
- Nomes de categorias no DB precisam ser normalizados (slug) para evitar inconsistências de filtro

---

## US-03 — Busca com Filtros Avançados

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Locatário

---

**Como** locatário,  
**quero** filtrar os resultados de busca por categoria, faixa de preço, distância e avaliação, e ordenar por relevância,  
**para que** encontre itens que se encaixam no meu orçamento e localização.

---

### Critérios de Aceitação

**Cenário 1 – Filtro por distância**
```gherkin
Dado que estou na tela de busca com resultados
Quando seleciono "Até 2 km" no filtro de distância
Então apenas itens dentro de 2 km da minha localização aparecem
E o contador "X itens encontrados em Natal, RN" é atualizado
```

**Cenário 2 – Filtro de preço por range slider**
```gherkin
Dado que ajusto o slider de preço para R$100 máximo
Quando aplico os filtros
Então apenas itens com preço/dia ≤ R$100 aparecem nos resultados
```

**Cenário 3 – Ordenação**
```gherkin
Dado que há 48 itens na busca
Quando seleciono "Menor preço" no dropdown de ordenação
Então os itens são reordenados do menor para o maior preço/dia
```

**Cenário 4 – Sem resultados**
```gherkin
Dado que aplico filtros muito restritivos (ex.: 0,5 km + R$5 máx)
Quando não há itens correspondentes
Então vejo mensagem "Nenhum item encontrado com esses filtros" e sugestão para ampliar o raio
```

**Cenário 5 – Carregar mais**
```gherkin
Dado que há mais de uma página de resultados
Quando clico em "Carregar mais itens"
Então os próximos itens são anexados abaixo (infinite scroll ou paginação)
Sem recarregar a página
```

---

### Notas Técnicas
- Sidebar de filtros visível apenas em ≥1024px; em mobile, botão "Filtros" abre modal/sheet
- Geolocalização via `navigator.geolocation`; fallback: pede cidade manualmente
- Query params: `/busca?q=&cat=&dist=&priceMax=&rating=&sort=`
- SSR para permitir compartilhamento de URL com filtros

### Dependências
- Geolocalização do usuário (permissão do browser)
- US-01

### Riscos
- Permissão de geolocalização negada: precisar de fallback manual
- Performance: índice PostGIS no Supabase para busca geo-espacial

---

## US-04 — Ver Detalhes de um Item

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Locatário

---

**Como** locatário,  
**quero** ver todas as informações de um item (fotos, descrição, preços, avaliações e perfil do proprietário) em uma página dedicada,  
**para que** tome uma decisão informada antes de solicitar a locação.

---

### Critérios de Aceitação

**Cenário 1 – Fluxo feliz**
```gherkin
Dado que clico em um item nos resultados de busca
Então sou levado para /item/:id
E vejo a galeria de fotos com thumbnails clicáveis
E vejo preço por dia, semana e mês
E vejo nome, nota média e número de avaliações
E vejo mini-perfil do proprietário (nome, estrelas, total de locações, bairro)
```

**Cenário 2 – Troca de foto na galeria**
```gherkin
Dado que estou na página de detalhe
Quando clico em um thumbnail diferente
Então a foto principal é atualizada para a foto selecionada
E o thumbnail clicado fica marcado como ativo com borda laranja
```

**Cenário 3 – Avaliações**
```gherkin
Dado que o item tem avaliações
Quando acesso a página de detalhe
Então vejo as avaliações exibidas abaixo da galeria
Com nome do avaliador, nota em estrelas, texto e data relativa
```

**Cenário 4 – Item indisponível**
```gherkin
Dado que o item está alugado no período
Quando acesso o detalhe
Então o badge mostra "Alugado" em vez de "Disponível"
E o botão "Solicitar locação" está desabilitado com mensagem informativa
```

---

### Notas Técnicas
- Rota `/item/[id]` com SSR (dados sempre frescos para disponibilidade)
- Card lateral (`detail-info`) fixo no desktop via `position: sticky`
- Avaliações: buscar separado via React Query com paginação

### Dependências
- US-03 (origem do clique), US-05 (cálculo de preço), US-06 (solicitar locação)

### Riscos
- SEO: título e og:image gerados dinamicamente no SSR para cada item

---

## US-05 — Calcular Preço por Período

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: XS (< 1 dia)  
**Perfil**: Locatário

---

**Como** locatário,  
**quero** selecionar as datas de retirada e devolução e ver o custo total calculado automaticamente,  
**para que** saiba exatamente quanto pagarei antes de fazer a solicitação.

---

### Critérios de Aceitação

**Cenário 1 – Seleção válida de datas**
```gherkin
Dado que estou no detalhe de um item com preço R$35/dia
Quando seleciono retirada em 25/mai e devolução em 28/mai (3 dias)
Então o resumo de preço exibe:
  "3 dias × R$ 35,00 = R$ 105,00"
  "Taxa Shareo (10%) = R$ 10,50"
  "Total = R$ 115,50"
```

**Cenário 2 – Data de devolução anterior à retirada**
```gherkin
Dado que seleciono uma data de devolução igual ou anterior à retirada
Então o campo de devolução rejeita a data com mensagem "⚠️ Data de devolução inválida"
E o campo `min` da devolução é atualizado para o dia seguinte à retirada
```

**Cenário 3 – Datas não selecionadas**
```gherkin
Dado que nenhuma data foi selecionada
Então o resumo exibe "Selecione as datas acima" e nenhum valor
```

---

### Notas Técnicas
- Lógica client-side pura; sem chamada de API
- `DAILY_PRICE` e `COMMISSION` (10%) como constantes configuráveis por item
- `date-start.min = today`; `date-end.min = date-start + 1 dia`

### Dependências
- US-04 (tela de detalhe)

### Riscos
- Preços variáveis por período (ex: semana < 7×dia) requerem lógica adicional em H2

---

## US-06 — Solicitar Locação

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Locatário

---

**Como** locatário autenticado,  
**quero** clicar em "Solicitar locação" e enviar um pedido ao proprietário,  
**para que** inicie o processo de aluguel e entre em contato via chat.

---

### Critérios de Aceitação

**Cenário 1 – Solicitação com datas selecionadas**
```gherkin
Dado que estou logado, com datas válidas selecionadas
Quando clico em "Solicitar locação"
Então é criada uma solicitação no sistema com status "Aguardando"
E sou redirecionado para o chat com o proprietário
E o proprietário recebe notificação da solicitação
```

**Cenário 2 – Usuário não autenticado**
```gherkin
Dado que não estou logado
Quando clico em "Solicitar locação"
Então sou redirecionado para /login com mensagem "Faça login para continuar 🔒"
E após login, retorno ao item com as datas preservadas
```

**Cenário 3 – Sem datas selecionadas**
```gherkin
Dado que estou logado mas não selecionei datas
Quando clico em "Solicitar locação"
Então os campos de data ficam com borda de erro
E vejo mensagem "Selecione as datas de retirada e devolução"
```

**Cenário 4 – Item indisponível no período**
```gherkin
Dado que o item já está reservado para o período selecionado
Quando clico em "Solicitar locação"
Então vejo mensagem de erro "Item não disponível nesse período"
```

---

### Notas Técnicas
- API: `POST /api/bookings` com `itemId`, `startDate`, `endDate`, `userId`
- Status do booking: `pending → accepted → active → returned → completed`
- Notificação ao proprietário: Supabase Realtime ou email

### Dependências
- US-08/09 (autenticação), US-04 (detalhe), US-16 (chat)

### Riscos
- Race condition: dois locatários solicitando o mesmo item no mesmo período — precisa de locking transacional no DB

---

## US-07 — Salvar Item nos Favoritos

**Fase**: H1  
**Prioridade MoSCoW**: Should  
**Estimativa**: XS (< 1 dia)  
**Perfil**: Locatário

---

**Como** locatário,  
**quero** clicar no ícone de coração em um item para salvá-lo nos meus favoritos,  
**para que** encontre facilmente itens que me interessam sem precisar buscá-los novamente.

---

### Critérios de Aceitação

**Cenário 1 – Favoritar item autenticado**
```gherkin
Dado que estou logado e vendo um card de item com ícone "🤍"
Quando clico no coração
Então o ícone muda para "❤️"
E aparece toast "Salvo nos favoritos ❤️"
E o item aparece em "❤️ Favoritos" no dashboard
```

**Cenário 2 – Desfavoritar**
```gherkin
Dado que o item já está favoritado (❤️)
Quando clico novamente no coração
Então o ícone volta para "🤍"
E o item é removido da lista de favoritos
```

**Cenário 3 – Usuário não autenticado**
```gherkin
Dado que não estou logado
Quando clico no coração de um item
Então sou redirecionado para /login
```

---

### Notas Técnicas
- API: `POST /api/favorites` e `DELETE /api/favorites/:itemId`
- Estado local otimista (toggle imediato, reverte em caso de erro)
- `aria-pressed` e `aria-label` dinâmicos para acessibilidade

### Dependências
- US-08/09 (autenticação)

### Riscos
- Sem login: estado do coração se perde ao navegar — considerar persistência em `localStorage` para não-logados em H2

---

## US-08 — Login com E-mail e Senha

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: S (1–2 dias)  
**Perfil**: Ambos

---

**Como** usuário cadastrado,  
**quero** fazer login com meu e-mail e senha,  
**para que** acesse meu painel, anúncios e mensagens.

---

### Critérios de Aceitação

**Cenário 1 – Login válido**
```gherkin
Dado que preencho e-mail e senha corretos
Quando clico em "Entrar"
Então sou autenticado e redirecionado para a home
E o botão "Entrar" no header some e o avatar aparece
E vejo toast "Login realizado com sucesso! 🎉"
```

**Cenário 2 – Credenciais inválidas**
```gherkin
Dado que informo senha incorreta
Quando clico em "Entrar"
Então vejo mensagem de erro abaixo do campo senha
E permaneço na tela de login sem o campo ser limpo
```

**Cenário 3 – Campos vazios**
```gherkin
Dado que deixo o campo e-mail ou senha vazio
Quando clico em "Entrar"
Então vejo validação inline nos campos obrigatórios
E o formulário não é enviado
```

**Cenário 4 – Recuperação de senha**
```gherkin
Dado que clico em "Esqueci minha senha"
Então sou levado para o fluxo de recuperação por e-mail
```

---

### Notas Técnicas
- NextAuth.js com provider `Credentials`
- Senha armazenada com bcrypt (cost factor ≥ 12)
- Rate limiting: max 5 tentativas por IP/10 min (referência ao ADR de segurança)

### Dependências
- Tabela `users` no Supabase com Prisma

### Riscos
- Ataques de credential stuffing: rate limiting obrigatório no endpoint de login

---

## US-09 — Login com Google (OAuth)

**Fase**: H1  
**Prioridade MoSCoW**: Should  
**Estimativa**: S (1–2 dias)  
**Perfil**: Ambos

---

**Como** usuário,  
**quero** fazer login com minha conta Google em um único clique,  
**para que** não precise criar e lembrar de mais uma senha.

---

### Critérios de Aceitação

**Cenário 1 – Login OAuth bem-sucedido**
```gherkin
Dado que clico em "Continuar com Google"
Quando completo o fluxo OAuth do Google
Então sou autenticado e redirecionado para a home
E se for o primeiro acesso, uma conta é criada automaticamente
```

**Cenário 2 – E-mail já cadastrado com senha**
```gherkin
Dado que já tenho conta com e-mail/senha usando o mesmo e-mail do Google
Quando faço login com Google
Então as contas são vinculadas e o login é realizado normalmente
```

**Cenário 3 – Cancelamento do fluxo OAuth**
```gherkin
Dado que clico em "Continuar com Google" mas cancelo no popup do Google
Então retorno para a tela de login sem erro
```

---

### Notas Técnicas
- NextAuth.js com Google Provider; callback de criação de usuário no DB
- CPF não é coletado no OAuth — solicitar em etapa separada de onboarding pós-login

### Dependências
- US-08 (fluxo de login base)

### Riscos
- Usuários OAuth sem CPF não podem anunciar até completar o perfil — bloquear acesso a `add-item` sem CPF verificado

---

## US-10 — Cadastro de Pessoa Física

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Ambos

---

**Como** novo usuário pessoa física,  
**quero** criar uma conta informando nome, e-mail, telefone, senha e CPF,  
**para que** possa alugar e anunciar itens na plataforma com identidade verificada.

---

### Critérios de Aceitação

**Cenário 1 – Cadastro completo válido**
```gherkin
Dado que preencho todos os campos obrigatórios com dados válidos
Quando clico em "Criar minha conta"
Então minha conta é criada
E sou logado automaticamente e redirecionado para a home
E vejo toast de boas-vindas
```

**Cenário 2 – E-mail já cadastrado**
```gherkin
Dado que informo um e-mail já existente no sistema
Quando clico em "Criar minha conta"
Então vejo mensagem "E-mail já cadastrado. Faça login." com link para /login
```

**Cenário 3 – CPF inválido**
```gherkin
Dado que informo um CPF com dígitos verificadores incorretos
Quando clico em "Criar minha conta"
Então vejo erro inline "CPF inválido" abaixo do campo
E o formulário não é enviado
```

**Cenário 4 – Senhas não coincidem**
```gherkin
Dado que os campos "Senha" e "Confirmar senha" são diferentes
Quando clico em "Criar minha conta"
Então vejo erro "As senhas não coincidem" no campo de confirmação
```

**Cenário 5 – Consentimento obrigatório (LGPD)**
```gherkin
Dado que a página exibe os Termos de Uso e Política de Privacidade
Quando o usuário clica em "Criar minha conta"
Então o sistema registra o consentimento explícito com timestamp
```

---

### Notas Técnicas
- CPF validado via algoritmo de dígito verificador (client-side) + unicidade (server-side)
- CPF armazenado criptografado (AES-256); nunca exposto em logs ou responses
- Telefone: formato `(XX) 9 XXXX-XXXX` com máscara e validação
- LGPD: registrar `consent_timestamp` e `consent_version` na tabela `users`

### Dependências
- Tabela `users` + campo `cpf_encrypted` no schema Prisma

### Riscos
- LGPD: consentimento deve ser armazenado e auditável; sem opt-in implícito

---

## US-11 — Cadastro de Pessoa Jurídica

**Fase**: H1  
**Prioridade MoSCoW**: Should  
**Estimativa**: S (1–2 dias)  
**Perfil**: Proprietário (empresa)

---

**Como** representante de empresa,  
**quero** selecionar "Empresa (PJ)" no cadastro e informar CNPJ em vez de CPF,  
**para que** anuncie itens em nome da minha empresa com as informações corretas.

---

### Critérios de Aceitação

**Cenário 1 – Troca para aba PJ**
```gherkin
Dado que estou na tela de cadastro
Quando clico na aba "🏢 Empresa (PJ)"
Então o campo "CPF" é substituído por "CNPJ"
E o campo de nome muda para "Razão Social"
```

**Cenário 2 – CNPJ inválido**
```gherkin
Dado que informo um CNPJ com dígitos verificadores incorretos
Quando clico em "Criar minha conta"
Então vejo erro inline "CNPJ inválido"
```

---

### Notas Técnicas
- Campo condicional: CPF ↔ CNPJ baseado na aba ativa
- CNPJ criptografado como CPF
- Conta PJ habilita features premium em H2 (vitrine personalizada, analytics)

### Dependências
- US-10 (base do cadastro)

### Riscos
- Validação de CNPJ ativo na Receita Federal: integração com API pública em H2

---

## US-12 — Cadastrar Item para Alugar

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Proprietário

---

**Como** proprietário autenticado,  
**quero** preencher um formulário com fotos, informações e preços do meu item e publicar o anúncio,  
**para que** locatários próximos possam encontrar e alugar meu item.

---

### Critérios de Aceitação

**Cenário 1 – Publicação bem-sucedida**
```gherkin
Dado que preencho categoria, título, descrição, preço/dia e local de retirada
E faço upload de ao menos 1 foto
Quando clico em "Publicar anúncio"
Então o item é criado com status "Em análise"
E vejo toast "Item publicado com sucesso! 🎉"
E sou redirecionado para o dashboard com o item listado
```

**Cenário 2 – Upload de fotos**
```gherkin
Dado que arrasto ou seleciono fotos no campo de upload
Então as fotos aparecem como thumbnails
E aceita JPG, PNG e WEBP com mínimo 800×600px e máx. 10 fotos
```

**Cenário 3 – Campos obrigatórios faltando**
```gherkin
Dado que deixo o título ou categoria vazios
Quando clico em "Publicar anúncio"
Então os campos com erro ficam com borda vermelha
E vejo mensagem de validação inline
```

**Cenário 4 – Salvar rascunho**
```gherkin
Dado que preenchi parte do formulário mas não quero publicar ainda
Quando clico em "Salvar rascunho"
Então o item é salvo com status "Rascunho"
E posso continuar editando depois pelo dashboard
```

**Cenário 5 – Preços por período**
```gherkin
Dado que preencho preço/dia como R$35
Então os campos de preço/semana e preço/mês são opcionais
E podem ter valores diferentes de 7× e 30× o diário (desconto por período)
```

**Cenário 6 – Dias de disponibilidade**
```gherkin
Dado que seleciono os dias da semana disponíveis
Quando um locatário tenta reservar em dia não selecionado
Então o sistema bloqueia a data de retirada naquele dia
```

---

### Notas Técnicas
- Upload de fotos via Supabase Storage; URLs públicas armazenadas no item
- Status do item: `draft → pending_review → available → rented`
- Campos obrigatórios: categoria, título, preço/dia, local, ≥1 foto
- Local de retirada: geocodificar para lat/lng no momento de salvar (Google Geocoding API)

### Dependências
- US-08/09 (autenticação), US-13 (dashboard)

### Riscos
- Moderação de conteúdo: itens em `pending_review` antes de ficarem públicos — criar fila de moderação (admin dashboard H1)

---

## US-13 — Dashboard: Visão Geral com KPIs

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: S (1–2 dias)  
**Perfil**: Proprietário

---

**Como** proprietário,  
**quero** ver um painel com minha receita mensal, locações ativas, quantidade de itens anunciados e avaliação média,  
**para que** acompanhe rapidamente o desempenho dos meus anúncios.

---

### Critérios de Aceitação

**Cenário 1 – KPIs exibidos**
```gherkin
Dado que estou logado e acesso o dashboard
Então vejo 4 cards: Receita (mês), Locações ativas, Itens anunciados, Avaliação média
E cada card exibe o delta percentual vs. período anterior
```

**Cenário 2 – Sem locações ainda**
```gherkin
Dado que sou um novo proprietário sem histórico
Então os KPIs mostram 0 ou "—" com CTA para cadastrar o primeiro item
```

**Cenário 3 – Navegação entre seções**
```gherkin
Dado que estou no dashboard no mobile
Quando deslizo as tabs horizontais (Visão Geral, Anúncios, Locações, Receita, Mensagens, Avaliações)
Então cada tab exibe o conteúdo correspondente
```

---

### Notas Técnicas
- CSR com React Query: dados frescos sem SSR para evitar exposição de dados privados
- Receita: soma dos bookings `completed` do mês corrente
- Delta: comparar com mês anterior (ou semana anterior para locações)

### Dependências
- US-12 (itens cadastrados), US-06 (bookings existentes)

### Riscos
- Dashboard desktop: sidebar visível em ≥768px; mobile usa tabs horizontais — garantir paridade de conteúdo

---

## US-14 — Gerenciar Meus Anúncios

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: S (1–2 dias)  
**Perfil**: Proprietário

---

**Como** proprietário,  
**quero** ver, editar e acompanhar o status de todos os meus itens anunciados,  
**para que** mantenha meu catálogo atualizado e saiba quais itens estão disponíveis ou alugados.

---

### Critérios de Aceitação

**Cenário 1 – Lista de itens**
```gherkin
Dado que estou no dashboard, aba "Anúncios"
Então vejo cards com foto, nome, preço, status (Disponível/Alugado/Em análise) e avaliação
```

**Cenário 2 – Editar item**
```gherkin
Quando clico em "✏️ Editar" em um item
Então sou levado para o formulário de edição pré-preenchido
E posso alterar qualquer campo e salvar
```

**Cenário 3 – Ver estatísticas**
```gherkin
Quando clico em "📊 Stats" em um item
Então vejo total de visualizações, locações e receita gerada por aquele item
```

**Cenário 4 – Item em análise**
```gherkin
Dado que um item está com status "Em análise"
Então vejo apenas o botão "✏️ Editar" (sem "Stats")
E uma mensagem "Aguardando aprovação Shareo" está visível
```

---

### Notas Técnicas
- Rota para edição: `/item/[id]/edit` — reusa o formulário de cadastro com dados pré-carregados
- Status badge: cores semânticas (verde=disponível, laranja=alugado, azul=análise)

### Dependências
- US-12 (cadastro de item)

### Riscos
- Edição de item alugado: campos críticos (preço, local) devem ser bloqueados até a devolução

---

## US-15 — Acompanhar Locações Ativas

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: S (1–2 dias)  
**Perfil**: Proprietário

---

**Como** proprietário,  
**quero** ver as locações em andamento com nome do locatário, período, valor e comissão,  
**para que** acompanhe minhas obrigações e receita esperada.

---

### Critérios de Aceitação

**Cenário 1 – Locação ativa**
```gherkin
Dado que há uma locação em andamento
Então vejo card com: item, nome do locatário, período (datas), valor total e comissão Shareo (10%)
E botões "💬 Mensagem" e "📋 Contrato"
```

**Cenário 2 – Sem locações ativas**
```gherkin
Dado que não há locações em andamento
Então vejo mensagem vazia com CTA "Ver meus anúncios"
```

**Cenário 3 – Abrir chat a partir da locação**
```gherkin
Quando clico em "💬 Mensagem" em uma locação ativa
Então sou levado diretamente para o thread do chat com aquele locatário
```

---

### Notas Técnicas
- Comissão Shareo: 10% fixo no MVP (configurável por categoria em H2)
- "Contrato": PDF gerado com os termos da locação — em H1 pode ser modal simples com os dados

### Dependências
- US-06 (booking), US-16 (chat)

### Riscos
- Exibir comissão separada da receita bruta é crítico para transparência fiscal com proprietários PJ

---

## US-16 — Inbox de Mensagens

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: S (1–2 dias)  
**Perfil**: Ambos

---

**Como** usuário autenticado,  
**quero** ver uma lista de todas as minhas conversas com preview da última mensagem e badge de não-lidas,  
**para que** acompanhe comunicações pendentes com proprietários ou locatários.

---

### Critérios de Aceitação

**Cenário 1 – Lista de conversas**
```gherkin
Dado que acesso a tela de mensagens
Então vejo conversas ordenadas por mais recente
Com avatar, nome, preview da última mensagem e horário
```

**Cenário 2 – Mensagens não lidas**
```gherkin
Dado que há mensagens não lidas em uma conversa
Então o preview aparece em negrito
E um badge com o número de não-lidas aparece no lado direito
```

**Cenário 3 – Sem conversas**
```gherkin
Dado que é meu primeiro acesso sem nenhuma locação iniciada
Então vejo mensagem "Você ainda não tem conversas"
E CTA "Explorar itens" para iniciar uma locação
```

---

### Notas Técnicas
- Supabase Realtime para atualização em tempo real do inbox
- Cada conversa é vinculada a um `booking_id` (não ao item genérico)
- Badge de não-lidas também aparece no ícone da bottom nav

### Dependências
- US-06 (booking que inicia o chat), US-17 (thread)

### Riscos
- Conversar fora do contexto de uma locação (ex.: perguntas antes de solicitar): definir se será suportado em H1 ou H2

---

## US-17 — Trocar Mensagens em Tempo Real

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Ambos

---

**Como** locatário ou proprietário,  
**quero** enviar e receber mensagens de texto em um chat vinculado a uma locação específica,  
**para que** combine detalhes de retirada, devolução e esclareça dúvidas sem sair da plataforma.

---

### Critérios de Aceitação

**Cenário 1 – Envio de mensagem**
```gherkin
Dado que estou em um thread de chat
Quando digito uma mensagem e clico em Enviar (ou pressiono Enter)
Então a mensagem aparece imediatamente no lado direito (bolha laranja)
E o campo de input é limpo
E o foco retorna para o input
```

**Cenário 2 – Recebimento em tempo real**
```gherkin
Dado que a outra parte envia uma mensagem
Então ela aparece no lado esquerdo (bolha branca) sem precisar recarregar a página
E o scroll desce automaticamente para a mensagem mais recente
```

**Cenário 3 – Header do thread**
```gherkin
Dado que abro um thread
Então o header mostra o nome do interlocutor, avatar e o nome do item da locação
```

**Cenário 4 – Voltar para o inbox**
```gherkin
Quando clico em "← Voltar"
Então retorno para a lista de conversas (inbox)
Sem perder o estado das mensagens já carregadas
```

**Cenário 5 – Mensagem vazia**
```gherkin
Dado que o input está vazio
Quando clico em Enviar
Então nada acontece (sem envio, sem erro)
```

---

### Notas Técnicas
- Supabase Realtime (channel por `booking_id`)
- Sanitização de HTML no conteúdo da mensagem (prevenir XSS)
- Histórico paginado: carregar últimas 50 mensagens, scroll-up carrega mais
- `aria-live="polite"` na área de mensagens para acessibilidade

### Dependências
- US-16 (inbox), US-06 (booking)

### Riscos
- Conteúdo inadequado: sem moderação automática em H1; considerar reportar mensagem em H2

---

## US-18 — Avaliar uma Locação

**Fase**: H1  
**Prioridade MoSCoW**: Must  
**Estimativa**: M (3–5 dias)  
**Perfil**: Ambos

---

**Como** locatário ou proprietário após uma locação concluída,  
**quero** deixar uma avaliação com nota de 1–5 estrelas e comentário,  
**para que** a plataforma mantenha confiança e outros usuários tomem melhores decisões.

---

### Critérios de Aceitação

**Cenário 1 – Avaliação do locatário pelo proprietário**
```gherkin
Dado que uma locação foi marcada como devolvida
Quando o proprietário acessa a seção "⭐ Avaliações" no dashboard
Então vê a locação concluída com botão "Avaliar"
E pode dar nota de 1–5 estrelas e texto opcional
E após enviar, a avaliação aparece no perfil do locatário
```

**Cenário 2 – Avaliação do proprietário pelo locatário**
```gherkin
Dado que o período de locação encerrou
Quando o locatário acessa o item ou histórico
Então vê botão "Avaliar experiência"
E pode avaliar o proprietário e o item separadamente
```

**Cenário 3 – Avaliação já enviada**
```gherkin
Dado que já avaliei uma locação
Quando acesso novamente
Então vejo minha avaliação exibida (read-only)
E não há botão de nova avaliação
```

**Cenário 4 – Prazo de avaliação**
```gherkin
Dado que a locação foi concluída há mais de 14 dias
Então o botão "Avaliar" não está mais disponível
E vejo "Prazo de avaliação encerrado"
```

---

### Notas Técnicas
- Avaliações são duplas: locatário → proprietário e proprietário → locatário
- Avaliação do item é separada da avaliação do proprietário
- Nota média do proprietário: média ponderada de todas as avaliações recebidas
- Prazo: 14 dias após `booking.returned_at`; job agendado para marcar expiradas

### Dependências
- US-06 (booking concluído), US-13/14 (dashboard para acessar avaliações)

### Riscos
- Avaliações fraudulentas: um proprietário não pode avaliar a si mesmo; validação server-side obrigatória

---

## Resumo Geral

| # | História | Fase | MoSCoW | Estimativa | Perfil |
|---|---|---|---|---|---|
| US-01 | Busca na landing page | H1 | Must | S | Locatário |
| US-02 | Explorar por categoria | H1 | Must | XS | Locatário |
| US-03 | Busca com filtros | H1 | Must | M | Locatário |
| US-04 | Detalhe do item | H1 | Must | M | Locatário |
| US-05 | Calcular preço por período | H1 | Must | XS | Locatário |
| US-06 | Solicitar locação | H1 | Must | M | Locatário |
| US-07 | Salvar favoritos | H1 | Should | XS | Locatário |
| US-08 | Login email/senha | H1 | Must | S | Ambos |
| US-09 | Login Google OAuth | H1 | Should | S | Ambos |
| US-10 | Cadastro PF | H1 | Must | M | Ambos |
| US-11 | Cadastro PJ | H1 | Should | S | Proprietário |
| US-12 | Cadastrar item | H1 | Must | M | Proprietário |
| US-13 | Dashboard KPIs | H1 | Must | S | Proprietário |
| US-14 | Gerenciar anúncios | H1 | Must | S | Proprietário |
| US-15 | Locações ativas | H1 | Must | S | Proprietário |
| US-16 | Inbox de mensagens | H1 | Must | S | Ambos |
| US-17 | Chat em tempo real | H1 | Must | M | Ambos |
| US-18 | Avaliar locação | H1 | Must | M | Ambos |

**Must**: 14 histórias · **Should**: 4 histórias  
**Estimativa total H1**: ~35–55 dias/dev (solo) · ~18–28 dias em dupla
