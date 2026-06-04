# Meta: Reestruturação de Navegação — ShareO estilo Airbnb

**Data:** 2026-06-04
**Prioridade:** Alta
**Referência visual:** Diagrama "Nova Estrutura do Site ShareO" (imagem anexa à sessão)

---

## Objetivo

Evoluir a navegação e arquitetura de informação do ShareO para um modelo inspirado no Airbnb — onde cada grande seção do site tem identidade própria, o usuário encontra o que precisa sem precisar estar logado, e o menu reflete as 4 grandes intenções de uso da plataforma.

O trabalho segue o mesmo padrão já executado com:
- **Perfil** — reestruturado em 7 sub-páginas (`/perfil`, `/perfil/editar`, `/perfil/endereco`, etc.)
- **Ajuda** — promovida para botão `?` dedicado no header com popover de tópicos

---

## Estrutura alvo (baseada no diagrama)

### Navegação principal (top nav)

| Seção | Sub-itens | Rota atual | Status |
|---|---|---|---|
| **Explorar Itens** | Categorias, Busca no Mapa, Filtros de Busca, Itens Populares | `/itens` | ✅ existe — falta sub-navegação |
| **Anunciar Item** | Cadastre seu Item, Estimativa de Ganhos, Dicas para Anfitriões | `/itens/novo` | ✅ parcial — faltam Estimativa e Dicas |
| **Experiências Locais** | Destaques Locais, Histórias de Usuários, Comunidade | — | ❌ não existe |
| **Ajuda e Segurança** | Central de Ajuda, Verificação de Identidade, Políticas e Regras, Suporte 24/7 | `/ajuda` | ✅ parcial — falta unificar |

### Conta do usuário (dropdown avatar)

| Item | Rota atual | Status |
|---|---|---|
| Perfil & Reservas | `/perfil`, `/reservas` | ✅ existe |
| Mensagens | `/mensagens` | ✅ existe |

### Rodapé

| Item | Rota atual | Status |
|---|---|---|
| Plataforma / Sobre Nós / Nossa Missão | — | ❌ não existe |
| Contato | — | ❌ não existe |
| Privacidade | `/privacidade` | ✅ existe |
| Termos | `/termos` | ✅ existe |

---

## Análise de gaps (o que falta)

### 1. Explorar Itens — ajustes na navegação
- A página `/itens` já tem filtros e mapa, mas não há **landing page de categorias** com visual tipo Airbnb (grid de categorias com imagem)
- Falta rota `/explorar` como alias ou hub de descoberta (Airbnb tem "Categorias" como ponto de entrada visual)
- "Itens Populares" existe implicitamente mas sem seção dedicada

### 2. Anunciar Item — duas páginas novas
- `/ganhar` existe como landing mas é básico
- **Estimativa de Ganhos** (`/anunciar/estimativa`) — calculadora: categoria + cidade → receita estimada mensal
- **Dicas para Anfitriões** (`/anunciar/dicas`) — guia editorial: como fotografar, precificar, descrever

### 3. Experiências Locais — seção nova (baixa prioridade técnica, alta prioridade de produto)
- **Destaques Locais** (`/comunidade/destaques`) — itens em alta em Natal/RN
- **Histórias de Usuários** (`/comunidade/historias`) — depoimentos e casos de uso reais
- **Comunidade** (`/comunidade`) — hub da seção

### 4. Ajuda e Segurança — consolidação
- Central de Ajuda: `/ajuda` ✅
- Verificação de Identidade: `/perfil/documentos` ✅ — mas não aparece no fluxo de ajuda
- Políticas e Regras: dispersas em `/privacidade` e `/termos` — falta uma página unificada `/politicas`
- Suporte 24/7: falta página `/suporte` com canal de contato real (email/chat externo)

### 5. Sobre Nós — seção nova
- `/sobre` — missão, fundadores, valores do ShareO
- `/contato` — formulário ou email direto

---

## Priorização sugerida (ordem de execução)

| # | Entrega | Impacto | Esforço | Sprint |
|---|---|---|---|---|
| 1 | **Anunciar — Estimativa de Ganhos** | Alto (conversão de locadores) | Médio | Sprint A |
| 2 | **Anunciar — Dicas para Anfitriões** | Alto (qualidade dos anúncios) | Baixo | Sprint A |
| 3 | **Ajuda — página `/politicas`** unificando privacidade + termos + regras | Médio | Baixo | Sprint A |
| 4 | **Ajuda — página `/suporte`** com canal de contato | Médio | Baixo | Sprint A |
| 5 | **Nav desktop** — menu principal com 4 seções (Explorar / Anunciar / Experiências / Ajuda) e submenus hover | Alto (descoberta) | Médio | Sprint B |
| 6 | **Explorar — hub de categorias visual** (grid tipo Airbnb) | Alto (conversão) | Médio | Sprint B |
| 7 | **Sobre Nós** (`/sobre` + `/contato`) | Baixo | Baixo | Sprint B |
| 8 | **Experiências Locais** (destaques, histórias, comunidade) | Médio (engajamento) | Alto | Sprint C |

---

## O que NÃO muda nessa meta

- Rotas existentes e funcionais (`/itens`, `/reservas`, `/mensagens`, `/perfil/*`, `/ajuda`)
- Lógica de negócio, Prisma schema, API routes
- Design system (paleta, tipografia, tokens)
- Auth / sessão

---

## Referência Airbnb — padrões a seguir

| Padrão Airbnb | Como aplicar no ShareO |
|---|---|
| Nav com mega-menu hover por seção | Menu desktop com 4 colunas de sub-links ao hover |
| Categorias como ponto de entrada visual | Grid de categorias com ícone + label na home e em `/itens` |
| "Seja um Anfitrião" com calculadora de ganhos | `/anunciar/estimativa` com input de categoria + cidade |
| Footer com links organizados por grupo | Footer reestruturado em 4 colunas (Explorar / Anunciar / Empresa / Legal) |
| Destaques editoriais ("O que está em alta") | Seção "Experiências Locais" com curadoria manual ou algorítmica |

---

## Próximo passo

Validar priorização com o Roberto e iniciar Sprint A:
1. `/anunciar/estimativa` — calculadora de ganhos
2. `/anunciar/dicas` — guia editorial para anfitriões
3. `/politicas` — página unificada de regras
4. `/suporte` — canal de contato
