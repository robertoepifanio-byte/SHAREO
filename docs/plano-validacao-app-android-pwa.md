# Plano de Validação Rigorosa — App Android × PWA Site Mobile

**Criado:** 2026-07-03, s41 — após uma sessão de testes ao vivo em device real (Moto G56
5G) encontrar 14 bugs reais que nenhum gate automatizado (tsc/jest/build) pegou. Este
documento formaliza o processo pra retomar a validação com rigor, em vez do ciclo
reativo "acha bug → conserta → acha o próximo" desta sessão.

## Por que isso existe

Testes automatizados (tsc, jest, `expo export:embed`) confirmam que o código **compila e
roda**. Eles NÃO confirmam que o app **parece e se comporta como o site**. Hoje, com o
app rodando de verdade num device físico, achamos:

| # | Bug | Categoria | Gate que deveria ter pego (e não pegou) |
|---|---|---|---|
| 1 | `accessibilityRole="tabbar"` — crash nativo ao logar | Valor de tipo aceito pelo RN mas não pelo Android | Nenhum — só teste em device |
| 2 | `metro.config.js` sem config de monorepo | Infra | Nenhum — só bundle real |
| 3 | 5 dependências fantasma nunca declaradas | Infra | Nenhum — tsc/jest não sentem falta |
| 4 | Hooks depois de `return` condicional (`itens/[id].tsx`) | Lógica | tsc não pega Rules of Hooks |
| 5 | Ícones de categoria: SVG inventado em vez de PNG real do site | Visual | Nenhum — precisa comparar visualmente |
| 6 | Filtro/busca: nome de parâmetro de API errado | Contrato de API | Nenhum — só teste funcional |
| 7 | Home: só o hero, 6 seções inteiras faltando | Completude | Nenhum — precisa contar seções contra o site |
| 8 | `/sobre` sem rota nativa | Navegação | Grep pego DEPOIS, não antes |
| 9 | Tela "Anunciar" com metade dos campos do site | Completude | Nenhum — precisa comparar campo a campo |
| 10 | Mock de teste (`useAuth`) quebrado | Teste | jest acusou, mas só depois de rodar de verdade |
| 11 | `<ellipse>` minúsculo sem import — crash | Sintaxe JSX | tsc não valida nome de tag host component |
| 12 | 27 de 34 links do menu lateral quebrados | Navegação | Grep pego DEPOIS, escopo errado na 1ª vez |
| 13 | Campo de data pedia digitação em vez de calendário nativo | Paridade de UX | Nenhum — precisa comparar interação |
| 14 | `addDays` crashava com data inválida | Robustez | Nenhum — só reproduzindo a interação real |

**Conclusão:** só o teste manual, tela por tela, comparando cada elemento e cada
interação contra o site renderizado, pega esse tipo de bug. Este documento estrutura
esse teste pra ser sistemático — não aleatório.

---

## Como retomar a sessão (quando o celular voltar)

1. Conectar o celular via USB.
2. `adb devices -l` — confirmar `device` (não `unauthorized`; se pedir, tocar Permitir no popup do celular).
3. `adb reverse tcp:8081 tcp:8081`
4. `cd apps/mobile && npx expo start --dev-client --clear`
5. Abrir o app "ShareO" (dev-client) já instalado no celular — deve reconectar sozinho.
6. Se o app não conectar em ~30s: fechar completamente o app e reabrir; se persistir,
   sacudir o celular → menu dev → "Reload".

Build de dev-client instalado é de **2026-07-03, commit `361b9ee8`** — só precisa de novo
build se alguma dependência **nativa** for adicionada (`npx expo install <pkg>` que
mexe em `app.json` plugins ou tenha código nativo). Mudanças de JS puro (a imensa
maioria dos fixes de hoje) recarregam via Metro, sem novo build.

---

## Como reportar um bug encontrado (pra acelerar o próximo round)

Print sozinho força uma investigação de código às cegas. Junto ao print, informar:

1. **Qual tela** (nome do menu/aba, não só "a tela X")
2. **O que você tocou** exatamente antes do erro aparecer
3. **O que o site faz** nesse mesmo ponto (se souber) — mesmo que seja só "no site
   tem um calendário aqui" como no bug #13, isso poupa uma rodada inteira de eu
   perguntar "o que deveria acontecer?"
4. Se for tela vermelha/preta de erro: **rolar até o fim do Call Stack** e mandar a
   primeira linha que menciona um arquivo de `apps/mobile/` (não só as internas do
   React) — geralmente é isso que aponta o arquivo certo direto.

---

## Checklist de validação por tela

Marcar cada linha: ✅ confirmado igual ao site | 🔧 corrigido hoje (re-testar) | ❌ não
testado ainda | ➡️ abre no site por decisão de escopo (não testar como bug).

### Autenticação
| Tela | Elemento a comparar | Status |
|---|---|---|
| Login | Layout, campos, "Esqueci minha senha", olho de senha, mensagens de erro | ❌ não testado nesta rodada (testado em sessão anterior) |
| Cadastro | ➡️ Redireciona 100% pro site (decisão do fundador 2026-07-03) — não é bug | ➡️ |
| Esqueci senha | Reescrita pela Frente B — subtítulo, estado enviado, "tente novamente", rodapé | ❌ não testado |

### Navegação global
| Elemento | Status |
|---|---|
| BottomNav (5 abas + FAB) | 🔧 corrigido (crash `tabbar`) — re-testar cada aba abre a tela certa |
| Menu lateral (drawer) — TODOS os 34 links | 🔧 corrigido (27 redirecionavam errado) — re-testar cada seção expansível (Explorar/Anunciar/Atividade/Minha Conta/Ajuda) |
| Toggle de tema (Claro/Sistema/Escuro) no menu | ❌ não testado nesta rodada |

### Início (Home)
| Seção | Status |
|---|---|
| Hero (H1, CTAs, busca, 4 stats) | 🔧 stats dependiam de `/api/stats`, que não existia — criado hoje; re-confirmar os 4 números aparecem |
| Simulador de Renda (tabela + busca interativa) | 🔧 seção nova hoje — nunca testada em device |
| Explorar por categoria (cards com PNG) | 🔧 seção nova — nunca testada em device |
| Como funciona (3 passos) | 🔧 seção nova — nunca testada em device |
| Quem já está ganhando (depoimentos) | 🔧 seção nova — nunca testada em device |
| Itens mais procurados (grid) | 🔧 seção nova — nunca testada em device |
| Segurança (3 pilares + taxa dinâmica) | 🔧 seção nova — conferir que a % da taxa bate com `/admin/financeiro` |

### Explorar
| Elemento | Status |
|---|---|
| Busca por texto | 🔧 corrigido (parâmetro errado) — re-testar que resultado muda |
| Chips de categoria (ícone + clique filtra) | 🔧 corrigido (ícone errado + filtro não funcionava) — re-testar os dois |
| Grid de itens (2 colunas, foto, preço, favoritar, verificado) | 🔧 auditado no código (loop autônomo, sem device) contra `components/items/ItemCard.tsx` — badge "Eco" inventado removido, botão de favoritar e badge de verificado adicionados (faltavam por completo) |
| Pull-to-refresh | ❌ não testado (implementação já existente, não auditada nesta rodada) |
| ⏸️ Pendente (exigiria estender API, não implementado) | Estrelas de avaliação e distância em km — `/api/items` não calcula `avgRating`/`distanceKm` hoje |

### Detalhe do item
| Elemento | Status |
|---|---|
| Galeria de fotos | ❌ não testado (mobile usa dots+swipe por índice, não o carrossel `_Gallery.tsx` do site — adaptação de plataforma aceita, conteúdo/fotos idênticos) |
| Modo locatário: tabs diária/semanal/mensal | ❌ não testado |
| **Campo de data de retirada (calendário nativo)** | 🔧 corrigido 2× hoje (era TextInput; depois crash "Date value out of bounds") — **prioridade #1 no retorno**, não foi possível confirmar se o fix definitivo funciona |
| Resumo de preço + aviso de teto R$500 | 🔧 auditado no código contra `_PriceCalc.tsx` (473 linhas, lido por inteiro) — breakdown corrigido (mostrava "N dias × diária" mesmo quando a tarifa semanal/mensal era aplicada internamente, divergindo do total), desconto por período estava sendo calculado mas nunca exibido, texto de transparência da taxa ausente (adicionado, taxa via `/api/stats`, nunca hardcode), campo de cupom (P3-20) ausente (adicionado, `couponCode` confirmado no schema real) |
| Botão "Solicitar locação" | ❌ não testado (payload atualizado com `couponCode` — não testado fim a fim) |
| Modo proprietário: badge "Seu item" + solicitações pendentes | ❌ não testado |
| Rules of Hooks (não deve mais dar "Rendered more hooks") | 🔧 corrigido — re-confirmar ao abrir qualquer item |
| Badge "🌿 Eco" ao lado do rating | 🔧 auditado no código contra `page.tsx:436-438` — faltava por completo, adicionado |
| Box "Regras do anunciante" (`item.rules`) | 🔧 auditado no código contra `page.tsx:456-471` — faltava por completo, adicionado (API já retornava o campo, só não estava no tipo/render do mobile) |
| Box "Calculadora alugar vs comprar" (`item.estimatedRetailPrice`) | 🔧 auditado no código contra `page.tsx:473-488` — faltava por completo, adicionado |
| Box "Requisitos do proprietário" (identidade/telefone) | 🔧 auditado no código contra `page.tsx:490-511` — faltava por completo, adicionado |
| Mini card do proprietário — navegável + avatar real | 🔧 card era estático (sem link, sem foto real); agora abre `/perfil/:id` no site via `Linking` (mesmo padrão do `MobileMenu.tsx`) e usa `owner.avatarUrl` quando existe |
| Link "✏️ Editar anúncio" (modo proprietário) | 🔧 **não existia nenhuma forma de editar o anúncio pelo app** — adicionado como fallback `Linking`→site (não há tela nativa de edição ainda) |
| Trust Box "🔒 Sua locação está protegida" | 🔧 auditado no código contra `page.tsx:618-635` — faltava por completo, adicionado (conteúdo estático, 3 linhas) |
| Política de cancelamento (3 faixas de reembolso) | 🔧 auditado no código contra `page.tsx:637-665` — faltava por completo, adicionado (usa os mesmos valores estáticos que o próprio site usa hoje, não a config dinâmica) |
| ⏸️ Pendente (fora de escopo desta rodada — precisa endpoint novo ou tela própria) | `AvailabilityCalendar` (calendário de disponibilidade), stats do proprietário (locações concluídas / taxa de resposta — hoje só calculado no Server Component do site, não exposto via API), grids "Itens do mesmo anunciante" e "Você também pode gostar" no rodapé, carrinho multi-item `AddToRentalButton` (Story B) |

### Anunciar (`itens/novo`)
| Elemento | Status |
|---|---|
| Valor de compra estimado + sugestão automática de diária | 🔧 campo novo — nunca testado em device |
| Preço por dia/semana/mês com botão Aplicar/Recalcular | 🔧 nunca testado em device |
| Voltagem (categorias elétricas) | 🔧 campo novo — nunca testado |
| Fotos: botões Câmera/Galeria separados, limite 3 (era 8, corrigido) | 🔧 nunca testado em device |
| Requisitos para reserva (2 checkboxes) | 🔧 seção nova — nunca testada em device |
| Publicar anúncio (fim a fim) | ❌ não testado nesta rodada |

### Perfil
| Elemento | Status |
|---|---|
| Card do usuário (avatar, badges, bio, localização) | 🔧 reescrito pela Frente B — nunca testado em device |
| "Dashboard" (ícone `database`) | 🔧 corrigido (crash `<ellipse>`) — re-testar que abre sem crash |
| "Meus Anúncios" | 🔧 corrigido (abre no navegador agora) |
| "Minha Conta" — 9 submenus | 🔧 corrigido (8 de 9 abrem no navegador) — re-testar cada um |
| Favoritos | ❌ auditado sem alterações pela Frente B — testar mesmo assim |
| KYC | 🔧 fix pontual de imagem — nunca testado em device |
| Sair (logout) | ❌ não testado |

### Reservas
| Elemento | Status |
|---|---|
| Lista — tabs "Como locatário"/"Como locador" | 🔧 reescrita completa (bug real: API misturava os dois papéis) — nunca testada em device |
| Detalhe — token de retirada, avisos de status, ações (Pagar/Devolver/Confirmar/Cancelar) | 🔧 reescrita completa (hooks quebrados + cores não mapeadas) — nunca testada em device |
| Checkout — modalidade, calendário, teto R$500, MP | 🔧 tocado pela Frente C — nunca testado fim a fim |

### Chat
| Elemento | Status |
|---|---|
| Lista de conversas | ❌ não testado |
| Thread (enviar/receber mensagem) | 🔧 fix pontual de crash em nome vazio — nunca testado em device. Lembrete: usa polling 5s, não é bug se a msg demorar até 5s pra aparecer |

---

## Itens sabidamente pendentes (NÃO reportar como bug)

- **26 links do menu + Cadastro abrem no site, não nativamente** — decisão do fundador
  2026-07-03, ver [[project-mobile-redesign-transcricao]]. Só reconsiderar se pedido
  explicitamente.
- **Chat usa polling de 5s**, não é tempo real — decisão documentada da Frente C
  (realtime Supabase é follow-up separado).
- **Filtros de "Buscar no mapa"/"Mais alugados"/"Mais bem avaliados"** no menu Explorar
  abrem a tela `/explorar` genérica, sem o filtro pré-aplicado — `explorar.tsx` só
  suporta busca por texto (`?q=`) nativamente ainda.
- **Sugestão de preço por região** (P2-52 do site) não foi portada — precisa endpoint novo.
- **`ListingQualityIndicator`/`ItemCardPreview`** (sidebar do form de anúncio no site)
  não têm equivalente mobile — são componentes React DOM, não portáveis direto.

## Bugs corrigidos hoje (referência rápida, ver commits em `fix/mobile-expo-sdk-versions`)

`accessibilityRole="tabbar"` → `tablist` · `metro.config.js` monorepo · 5 deps fantasma ·
hooks em `itens/[id].tsx` · ícones de categoria (PNG real) · filtro/busca (`search`/`categoryId`) ·
Home 6 seções + `/api/stats` novo · `/sobre` → externo · Anunciar reconciliado com
`ItemForm.tsx` · mock `useAuth` · `<ellipse>`→`<Ellipse>` · 27 links do menu → nativo ou
externo · calendário nativo na data de retirada · `addDays` defensivo · detalhe do item:
badge Eco, regras do anunciante, calculadora comprar-vs-alugar, requisitos do proprietário,
card do proprietário navegável+avatar real, link editar anúncio, trust box, política de
cancelamento (commit `d895b3a`).

## Progresso da rodada autônoma (`/loop`, sem device — 2026-07-03 à noite)

Trabalho de auditoria **a nível de código apenas** (celular fora do alcance) seguindo
`docs/meta-app-android-retranscricao-s41.md`. Cobertura até agora: **Detalhe do item**
(gap grande fechado — 8 seções inteiras que faltavam, ver tabela acima). Nada aqui foi
testado em device — todo item novo marcado 🔧, nunca ✅. Próximo na ordem do plano:
Perfil (card/logout/Favoritos) → Reservas (lista/detalhe/checkout fim a fim) → Chat
(lista/thread) → Login → relatório de progresso final.
