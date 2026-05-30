# Histórias de Usuário — ShareO MVP (H1)

**Versão:** 1.0
**Data:** 2026-05-30
**Owner:** Product Owner
**Base:** PRD v1.0 + Backlog v2.0 + Protótipo interativo

---

## Convenções

- **Estimativas**: XS = 0,5 dia | S = 1–2 dias | M = 3–5 dias | L = 6–9 dias | XL = 10+ dias
- **Prioridade**: P0 = bloqueante para release | P1 = necessário antes do MVP público
- **Gherkin**: Dado [contexto] / Quando [ação] / Então [resultado esperado]
- **Dependências**: indicadas por HU-XXX entre parênteses

---

## Perfil: Locatário

---

### HU-001 — Cadastro de Conta PF (Locatário)

**Como** locatário pessoa física, **quero** criar uma conta informando meu CPF, nome, e-mail, senha e cidade, **para que** eu possa acessar o marketplace e solicitar aluguéis com identidade verificada.

**Critérios de aceitação:**

- Dado que acesso `/cadastro` e escolho o tipo "Pessoa Física", quando preencho todos os campos obrigatórios com dados válidos e envio o formulário, então minha conta é criada e sou redirecionado ao dashboard com mensagem de boas-vindas.
- Dado que informo um CPF com dígito verificador inválido, quando tento enviar o formulário, então vejo a mensagem "CPF inválido" abaixo do campo, o envio é bloqueado e nenhum dado é persistido.
- Dado que informo um e-mail já cadastrado, quando tento enviar o formulário, então vejo a mensagem "E-mail já em uso. Faça login ou recupere sua senha." e o envio é bloqueado.
- Dado que envio o formulário com sucesso, então o consentimento LGPD é registrado no banco com timestamp e IP, antes de qualquer outro dado pessoal ser gravado.
- Dado que estou em um dispositivo mobile (375px), quando acesso `/cadastro`, então todos os campos possuem tap target mínimo de 44x44px e o teclado correto é exibido (numérico para CPF/telefone, e-mail para e-mail).

**Notas técnicas:** Validação de CPF no cliente (dígito verificador) e no servidor (Zod + função canônica). CPF armazenado criptografado (ADR-005). Consentimento LGPD obrigatório antes do `INSERT`. Rate limiting no endpoint `/api/auth/register` (P0 item #16 do backlog).

**Prioridade:** P0 | **Estimativa:** M

---

### HU-002 — Login e Logout

**Como** locatário, **quero** fazer login com e-mail e senha e encerrar minha sessão quando desejar, **para que** minha conta permaneça protegida e eu possa acessar minhas reservas e mensagens.

**Critérios de aceitação:**

- Dado que acesso `/login` e informo e-mail e senha corretos, quando clico em "Entrar", então sou autenticado e redirecionado ao dashboard (ou à página de origem se havia um redirect pendente).
- Dado que informo credenciais incorretas, quando clico em "Entrar", então vejo a mensagem "E-mail ou senha incorretos" e permaneço na tela de login — o erro não diferencia qual campo está errado (prevenção de enumeração).
- Dado que estou autenticado e clico em "Sair", quando confirmo a ação, então a sessão é encerrada, o token é invalidado e sou redirecionado para `/`.
- Dado que acesso uma rota protegida sem estar autenticado, então sou redirecionado para `/login?redirect=[rota-original]`.
- Dado que minha sessão expira, quando faço qualquer ação autenticada, então recebo um refresh token silencioso; se o refresh também expirou, sou redirecionado para `/login`.

**Notas técnicas:** NextAuth.js v5 (ADR-001). Middleware de proteção de rotas (backlog item #17). Tokens JWT com rotate em refresh.

**Prioridade:** P0 | **Estimativa:** M

---

### HU-003 — Busca de Itens por Localização e Categoria

**Como** locatário, **quero** buscar itens disponíveis próximos à minha localização filtrando por categoria, preço e distância, **para que** eu encontre rapidamente o que preciso sem me deslocar muito.

**Critérios de aceitação:**

- Dado que acesso `/itens` com permissão de geolocalização ativa, quando digito um termo de busca, então vejo resultados ordenados por distância crescente, cada card exibindo distância em km, preço/dia, rating e badge de disponibilidade.
- Dado que não autorizo geolocalização, quando acesso `/itens`, então vejo um campo para digitar CEP ou cidade e posso prosseguir com a busca após informá-lo.
- Dado que aplico filtros combinados (categoria + preço máximo + condição), quando o resultado é renderizado, então apenas itens que atendem a todos os filtros aparecem, e chips com "X" para remoção individual são exibidos acima da lista.
- Dado que nenhum item é encontrado para o filtro aplicado, então vejo um empty state com a mensagem "Nenhum item encontrado em [cidade]" e sugestão de ampliar o raio ou explorar categorias relacionadas.
- Dado que estou em mobile, quando clico em "Filtros", então um bottom sheet é exibido (não sidebar oculta) — corrige bug P1 item #20.
- Dado que aplico filtros e navego para o detalhe de um item, quando clico em voltar, então retorno à listagem com os filtros anteriores preservados (contexto de busca com `useSearchParams` persistente — P1 item #33).

**Notas técnicas:** SSR para a rota `/itens` com geo-filters (ADR-007). Mapbox + PostGIS (ADR-002). Raio padrão: 10 km. Deep link via URL params.

**Prioridade:** P0 | **Estimativa:** L

---

### HU-004 — Ver Detalhe do Item

**Como** locatário, **quero** acessar a página de detalhe de um item com fotos, descrição, localização no mapa, avaliações do proprietário e calendário de disponibilidade, **para que** eu possa tomar uma decisão de aluguel informada.

**Critérios de aceitação:**

- Dado que clico em um card de item na listagem, quando a página de detalhe carrega, então vejo galeria de fotos, título, preço/dia, condição, distância, nome e rating do proprietário, taxa de resposta e número de aluguéis realizados.
- Dado que estou na página de detalhe, então vejo um calendário de disponibilidade onde dias livres são exibidos em verde e dias ocupados em vermelho (P1 item #22).
- Dado que estou na página de detalhe, então vejo a política de cancelamento visível ("Cancelamento gratuito até 24h antes") e o valor de caução se aplicável (P1 item #28 e P2 item #51).
- Dado que estou na página de detalhe, então vejo seção "Itens similares" ao final da página (P1 item #31).
- Dado que estou na página de detalhe, então vejo breadcrumb "Início > [Categoria] > [Título do item]" (P1 item #30).
- Dado que acesso uma URL de item inexistente, então sou redirecionado para a página 404 com design ShareO — sem stack trace exposto.

**Notas técnicas:** ISR para páginas de detalhe populares (ADR-007). Dependência: HU-003. Integração com Mapbox para pin de localização aproximada (não endereço exato).

**Prioridade:** P1 | **Estimativa:** M

---

### HU-005 — Solicitar Reserva

**Como** locatário, **quero** solicitar o aluguel de um item selecionando as datas desejadas e enviando uma mensagem inicial ao proprietário, **para que** eu inicie o processo de locação de forma organizada e com código de rastreamento.

**Critérios de aceitação:**

- Dado que estou na página de detalhe e clico em "Solicitar aluguel", quando seleciono datas válidas (início futuro, fim após início) e envio uma mensagem, então a solicitação é criada com status `PENDING` e vejo a tela de confirmação com o código `#SHR-AAAA-MMDD-NNN` e a seção "Próximos passos" (P1 item #25).
- Dado que seleciono uma data de início no passado ou uma data de fim anterior ao início, quando tento enviar, então vejo mensagem de erro inline e o envio é bloqueado.
- Dado que sou o proprietário do item, quando acesso a página de detalhe, então o botão "Solicitar aluguel" não é exibido (locatário não pode alugar o próprio item).
- Dado que enviei uma solicitação, quando acesso a tela "Aguardando Confirmação", então vejo countdown de 2 horas e carrossel de itens similares enquanto espero a resposta do proprietário (P1 item #34).
- Dado que o proprietário não responde em 2 horas, então recebo sugestão de itens similares; após 4 horas sem resposta, a solicitação é cancelada automaticamente e sou notificado (P1 item #24).

**Notas técnicas:** Máquina de estados do aluguel (PRD seção 4.4). Dependências: HU-002, HU-004. Timeout automático via job/webhook Supabase. Código de reserva gerado no servidor.

**Prioridade:** P0 | **Estimativa:** L

---

### HU-006 — Acompanhar Status da Reserva

**Como** locatário, **quero** visualizar o status atual da minha reserva e receber notificações de cada mudança, **para que** eu saiba exatamente em que etapa do processo me encontro e possa me planejar.

**Critérios de aceitação:**

- Dado que acesso meu dashboard em `/reservas`, então vejo todas as minhas reservas com status visual diferenciado: PENDING (amarelo), CONFIRMED (azul), ACTIVE (verde), RETURNED (cinza), COMPLETED (verde escuro), CANCELLED (vermelho), DISPUTED (laranja).
- Dado que minha reserva está `ACTIVE`, então vejo um countdown "Devolução em X dias, Yh e Zmin" (P2 item #47).
- Dado que minha reserva está `ACTIVE` e o prazo de devolução se aproxima, então recebo lembrete in-app no dia do prazo (P2 item #48).
- Dado que acesso o detalhe de uma reserva, então vejo o histórico de transições de estado com data e hora de cada evento.
- Dado que uma reserva é cancelada automaticamente por timeout (4h sem resposta), então recebo notificação in-app com a mensagem "Sua solicitação expirou. Veja itens similares." e link para busca.

**Notas técnicas:** CSR para o dashboard (ADR-007). Dependências: HU-005. Supabase Realtime para atualizações em tempo real de status.

**Prioridade:** P1 | **Estimativa:** M

---

### HU-007 — Chat com Proprietário

**Como** locatário, **quero** me comunicar em tempo real com o proprietário do item após minha solicitação ser aceita, **para que** possamos combinar os detalhes de entrega e retirada sem sair da plataforma.

**Critérios de aceitação:**

- Dado que minha solicitação foi aceita (status `CONFIRMED`), quando acesso a conversa, então o chat está habilitado e consigo enviar e receber mensagens em tempo real sem recarregar a página.
- Dado que envio uma mensagem, quando o proprietário responde, então a mensagem aparece na minha tela em menos de 2 segundos sem refresh manual.
- Dado que tento acessar uma conversa que não é minha, então recebo erro 403 e não consigo ler as mensagens.
- Dado que o chat ainda não existe (solicitação com status `PENDING`), então o campo de mensagem está desabilitado com o texto "O chat será liberado após a confirmação do proprietário."
- Dado que envio uma mensagem, então o conteúdo passa por sanitização XSS antes de ser persistido e exibido.
- Dado que estou no chat, então tenho acesso a templates de mensagem pré-prontos ("Qual é o melhor horário para retirada?", "Posso buscar amanhã de manhã?") que preenchem o campo mas não enviam automaticamente (P3 item #66).

**Notas técnicas:** Supabase Realtime (ADR-003). CSR. RLS garante que cada conversa só é visível para os participantes (ADR-009). Dependências: HU-005.

**Prioridade:** P0 | **Estimativa:** L

---

### HU-008 — Confirmar Devolução (Locatário)

**Como** locatário, **quero** registrar a devolução do item e confirmar o estado em que ele se encontra, **para que** a locação seja encerrada corretamente e eu possa receber minha avaliação.

**Critérios de aceitação:**

- Dado que minha reserva está `ACTIVE`, quando acesso a tela de devolução, então vejo um checklist de devolução com os itens: item limpo, todos os acessórios presentes, mesmo estado que recebi, opção de adicionar foto (P2 item #49).
- Dado que preencho o checklist e confirmo, então a reserva transita para `RETURNED` e ambas as partes recebem convite para avaliação.
- Dado que identifiquei um problema na devolução, quando seleciono "Reportar problema" no checklist, então sou direcionado ao formulário de problema estruturado (HU-012).
- Dado que a reserva transita para `RETURNED`, então sou notificado in-app "Devolução registrada. Avalie sua experiência!"

**Notas técnicas:** Dependências: HU-006, HU-007. Transição de estado via `PATCH /api/bookings/[id]` com validação de autorização (apenas participantes da reserva).

**Prioridade:** P1 | **Estimativa:** S

---

### HU-009 — Avaliar Proprietário e Item

**Como** locatário, **quero** avaliar o proprietário e o item após a devolução, **para que** outros usuários possam tomar decisões informadas e o proprietário receba feedback valioso.

**Critérios de aceitação:**

- Dado que minha reserva está `RETURNED` ou `COMPLETED`, quando acesso a tela de avaliação, então posso dar uma nota de 1 a 5 estrelas e escrever um comentário opcional.
- Dado que já avaliei esta reserva, quando tento avaliar novamente, então vejo a mensagem "Você já avaliou esta locação." e o formulário não está disponível.
- Dado que enviei minha avaliação, então ela aparece no perfil público do proprietário com meu nome, foto (se houver), data e nota.
- Dado que a reserva está em `RETURNED` e nenhuma avaliação foi feita em 7 dias, então o status transita para `COMPLETED` automaticamente.
- Dado que estou em mobile, quando acesso a tela de avaliação, então as estrelas possuem tap target mínimo de 44x44px.

**Notas técnicas:** Dependências: HU-008. Avaliação bilateral — proprietário também avalia locatário (HU-017). Nota média recalculada em tempo real após nova avaliação.

**Prioridade:** P1 | **Estimativa:** M

---

### HU-010 — Favoritar Itens

**Como** locatário, **quero** salvar itens nos meus favoritos, **para que** eu possa acessá-los rapidamente depois sem precisar pesquisar novamente.

**Critérios de aceitação:**

- Dado que estou na listagem ou no detalhe de um item e clico no ícone de coração, quando estou autenticado, então o item é adicionado aos meus favoritos com feedback visual imediato (coração preenchido).
- Dado que clico novamente no ícone de coração de um item já favoritado, então o item é removido dos favoritos com feedback visual imediato.
- Dado que não estou autenticado e clico no ícone de coração, então sou redirecionado para `/login?redirect=[url-atual]`.
- Dado que acesso `/favoritos` no meu dashboard, então vejo todos os meus itens favoritados em grid com card completo (foto, título, preço, distância, disponibilidade).
- Dado que um item favoritado é desativado pelo proprietário, então ele aparece na lista com badge "Indisponível" e botão "Encontrar similar".
- Dado que estou em mobile, o ícone de coração no card possui tap target mínimo de 44x44px (verificado em e2e/favorites.spec.ts — backlog item P2 #36).

**Notas técnicas:** CSR. Otimistic update com React Query (ADR-008). Dependências: HU-002.

**Prioridade:** P1 | **Estimativa:** S

---

### HU-011 — Cancelar Reserva

**Como** locatário, **quero** cancelar uma reserva antes do início da locação, **para que** eu possa desistir do aluguel com ciência clara das regras de reembolso aplicáveis.

**Critérios de aceitação:**

- Dado que minha reserva está `PENDING` ou `CONFIRMED`, quando acesso o detalhe da reserva e clico em "Cancelar reserva", então vejo um modal de confirmação com a política de cancelamento aplicada: "Cancelamento até 24h antes da retirada: reembolso de 100%. Entre 24h e 6h: 70%. Menos de 6h: 50%."
- Dado que confirmo o cancelamento, então a reserva transita para `CANCELLED`, o proprietário é notificado e o código da reserva não pode mais ser reativado.
- Dado que minha reserva está `ACTIVE` (item já retirado), então o botão "Cancelar reserva" não está disponível — apenas "Reportar problema" (HU-012) ou aguardar devolução (HU-008).
- Dado que cancelo, então a política de cancelamento aplicada é exibida na tela de confirmação do cancelamento com o cálculo de reembolso.

**Notas técnicas:** Política de cancelamento (backlog P0 item #7): até 24h = 100%, 24–6h = 70%, menos de 6h = 50%. Dependências: HU-005. No MVP, o reembolso é combinado manualmente entre as partes (pagamento integrado é H3).

**Prioridade:** P1 | **Estimativa:** S

---

### HU-012 — Reportar Problema

**Como** locatário, **quero** reportar um problema com o item alugado (dano, mau funcionamento, acessórios faltando), **para que** o caso seja documentado e o admin possa mediar a resolução.

**Critérios de aceitação:**

- Dado que acesso a tela de uma reserva `ACTIVE` ou `RETURNED` e clico em "Reportar problema", então vejo um formulário estruturado com opções: "Não funciona / Veio danificado / Faltam acessórios / Outro" + campo de descrição livre + upload de foto (P1 item #26).
- Dado que preencho e envio o formulário, então o report é salvo, a reserva transita para `DISPUTED`, o admin é notificado por e-mail e o locatário vê a mensagem "Problema reportado. Nossa equipe analisará em até 24 horas."
- Dado que não faço upload de foto, então o formulário aceita o envio (foto opcional) mas exibe dica "Fotos aceleram a resolução do problema."
- Dado que a disputa é resolvida pelo admin, então a reserva transita para `COMPLETED` ou `CANCELLED` dependendo da decisão, e ambas as partes são notificadas.

**Notas técnicas:** Dependências: HU-005, HU-008. Transição `ACTIVE → DISPUTED` (máquina de estados do PRD). Upload de foto via Supabase Storage (ADR-010).

**Prioridade:** P1 | **Estimativa:** M

---

## Perfil: Proprietário / Anunciante

---

### HU-013 — Cadastro de Conta PJ (Proprietário)

**Como** proprietário pessoa jurídica, **quero** criar uma conta informando meu CNPJ, razão social, e-mail, senha e cidade, **para que** eu possa publicar anúncios em nome da empresa e acessar funcionalidades destinadas a PJ.

**Critérios de aceitação:**

- Dado que acesso `/cadastro` e escolho o tipo "Pessoa Jurídica", quando preencho todos os campos obrigatórios com CNPJ válido e envio o formulário, então minha conta PJ é criada e sou redirecionado ao dashboard com tour de onboarding do primeiro anúncio.
- Dado que informo um CNPJ com dígito verificador inválido, quando tento enviar, então vejo a mensagem "CNPJ inválido" e o envio é bloqueado.
- Dado que informo um CNPJ já cadastrado no sistema, quando tento enviar, então vejo a mensagem "CNPJ já cadastrado. Faça login ou entre em contato com o suporte."
- Dado que envio o formulário com sucesso, então o consentimento LGPD é registrado com timestamp e IP antes de qualquer dado ser persistido.
- Dado que sou conta PJ, então meu perfil exibe badge "Empresa Verificada" após validação do CNPJ.

**Notas técnicas:** Validação de CNPJ (dígito verificador) no cliente e no servidor (Zod). CNPJ armazenado criptografado (ADR-005). Mesma rota `/api/auth/register` de HU-001 com discriminador de tipo. Dependências: nenhuma.

**Prioridade:** P0 | **Estimativa:** M

---

### HU-014 — Anunciar Item

**Como** proprietário, **quero** criar um anúncio com fotos, descrição, preço por dia, categoria e localização, **para que** meu item fique visível para locatários próximos e eu possa gerar renda.

**Critérios de aceitação:**

- Dado que acesso o dashboard e clico em "Anunciar item", quando preencho título, descrição, categoria, condição, preço por dia, localização e faço upload de ao menos 1 foto, então o anúncio é publicado, recebe status `ACTIVE` e aparece na busca geolocalizada.
- Dado que tento publicar um anúncio sem foto, quando clico em "Publicar", então vejo a mensagem "Ao menos 1 foto é obrigatória" e o envio é bloqueado.
- Dado que estou preenchendo o formulário, então vejo um indicador de qualidade do anúncio (0–100%) com dicas inline por campo e prévia do ItemCard em tempo real (P2 item #62).
- Dado que estou no campo de preço, então vejo sugestão de preço médio da região "Anúncios similares por aqui: R$30–40/dia" (P2 item #52).
- Dado que publico um anúncio, então ele aparece no meu painel "Meus Anúncios" com status, número de visualizações e contatos recebidos.
- Dado que tento publicar com o campo de localização vazio, então vejo a mensagem "Localização obrigatória para exibição no mapa" e o envio é bloqueado.

**Notas técnicas:** Upload de imagens (ADR-010) — até 8 fotos, mínimo 1, validação de tipo e tamanho no cliente e servidor. Geolocalização armazena lat/long no PostGIS. Dependências: HU-002 (ou HU-013 para PJ).

**Prioridade:** P0 | **Estimativa:** L

---

### HU-015 — Confirmar ou Recusar Pedido de Aluguel

**Como** proprietário, **quero** receber solicitações de aluguel e aceitar ou recusar com um clique, **para que** eu controle quais locatários terão acesso ao meu item.

**Critérios de aceitação:**

- Dado que recebo uma solicitação de aluguel, então sou notificado in-app com os detalhes: nome do locatário, datas solicitadas, mensagem inicial e rating do locatário.
- Dado que acesso a notificação, quando clico em "Aceitar", então a reserva transita de `PENDING` para `CONFIRMED`, o locatário é notificado, e o chat é habilitado entre as partes.
- Dado que clico em "Recusar", então vejo um campo opcional de motivo de recusa, e ao confirmar a reserva transita para `CANCELLED` e o locatário é notificado com o motivo (se informado).
- Dado que não respondo em 4 horas, então a solicitação é cancelada automaticamente e o locatário é notificado (timeout automático — P1 item #24).
- Dado que tenho múltiplas solicitações pendentes para o mesmo item, então todas são exibidas em ordem cronológica e aceitar uma não cancela as demais automaticamente (preciso recusar manualmente).

**Notas técnicas:** Notificações in-app via Supabase Realtime. Dependências: HU-014, HU-005. Timeout automático via job agendado.

**Prioridade:** P0 | **Estimativa:** M

---

### HU-016 — Marcar Item como Ativo (Retirada Confirmada)

**Como** proprietário, **quero** marcar o item como retirado pelo locatário, **para que** a locação entre em fase `ACTIVE` e o prazo de devolução comece a contar oficialmente.

**Critérios de aceitação:**

- Dado que uma reserva está `CONFIRMED` e o locatário retirou o item, quando acesso o detalhe da reserva e clico em "Confirmar retirada", então a reserva transita para `ACTIVE` e o countdown de devolução começa.
- Dado que a reserva está `ACTIVE`, então vejo no meu dashboard o countdown "Devolução prevista para [data], em X dias" com alerta visual quando restam menos de 24 horas (P2 item #58).
- Dado que a data de início da reserva `CONFIRMED` chegou sem que eu tenha confirmado a retirada manualmente, então o sistema pode transitar automaticamente para `ACTIVE` (comportamento configurável pelo admin).

**Notas técnicas:** Dependências: HU-015. Transição `CONFIRMED → ACTIVE`. Countdown baseado na data de fim da reserva.

**Prioridade:** P1 | **Estimativa:** S

---

### HU-017 — Confirmar Devolução e Avaliar Locatário

**Como** proprietário, **quero** registrar a devolução do item e avaliar o locatário, **para que** a locação seja encerrada formalmente e a comunidade tenha informação confiável sobre o comportamento dos usuários.

**Critérios de aceitação:**

- Dado que uma reserva está `ACTIVE`, quando acesso o detalhe e clico em "Registrar devolução", então vejo o formulário de estado do item: "Perfeito / Desgaste normal / Com danos" + campo de observações + upload de foto (P2 item #50).
- Dado que confirmo "Com danos", então sou perguntado se desejo abrir uma disputa — se sim, a reserva transita para `DISPUTED`; se não, transita para `RETURNED`.
- Dado que confirmo a devolução (estado perfeito ou desgaste normal), então a reserva transita para `RETURNED` e ambas as partes recebem convite para avaliação.
- Dado que acesso o formulário de avaliação do locatário, então posso dar nota de 1 a 5 estrelas e escrever comentário; a avaliação aparece no perfil público do locatário.
- Dado que já avaliei esta reserva, quando tento avaliar novamente, então vejo "Você já avaliou esta locação."

**Notas técnicas:** Dependências: HU-016, HU-009 (avaliação bilateral). Transições: `ACTIVE → RETURNED` ou `ACTIVE → DISPUTED`. Upload via ADR-010.

**Prioridade:** P1 | **Estimativa:** M

---

### HU-018 — Gerenciar Anúncios

**Como** proprietário, **quero** editar, desativar e reativar meus anúncios, **para que** eu mantenha as informações atualizadas e controle a disponibilidade dos meus itens.

**Critérios de aceitação:**

- Dado que acesso `/meus-anuncios`, então vejo todos os meus anúncios com status (Ativo / Pausado / Rascunho), data de publicação, número de visualizações e número de aluguéis.
- Dado que clico em "Editar" em um anúncio, quando altero qualquer campo e salvo, então as alterações são refletidas imediatamente na página de detalhe do item.
- Dado que clico em "Pausar" em um anúncio ativo, então o item deixa de aparecer na busca e locatários que o favoritaram veem o badge "Indisponível".
- Dado que `/meus-anuncios` não tem nenhum anúncio, então vejo um empty state com CTA "Anuncie seu primeiro item" (P0 item #5).
- Dado que clico em "Excluir" um anúncio sem reservas ativas, então vejo modal de confirmação; ao confirmar, o anúncio é removido da busca e marcado como deletado (soft delete).

**Notas técnicas:** CSR. Dependências: HU-014. Soft delete para preservar histórico de reservas vinculadas.

**Prioridade:** P1 | **Estimativa:** M

---

### HU-019 — Ver Histórico de Locações

**Como** proprietário, **quero** visualizar o histórico completo de locações dos meus itens com todos os detalhes, **para que** eu tenha controle do que foi alugado, por quem e quando.

**Critérios de aceitação:**

- Dado que acesso `/historico` no meu dashboard, então vejo todas as reservas dos meus itens com filtros por status, período e item específico.
- Dado que clico em uma reserva específica, então vejo o detalhe completo: locatário, datas, valor combinado, estado na devolução e avaliação recebida.
- Dado que o histórico está vazio, então vejo empty state com CTA "Publique seu primeiro item e comece a receber reservas" (P0 item #5).
- Dado que tenho reservas em múltiplos estados, então elas são agrupadas por status com contagem: "2 ativas, 1 pendente, 15 concluídas."

**Notas técnicas:** CSR. Dependências: HU-014, HU-015. Paginação server-side para históricos longos.

**Prioridade:** P1 | **Estimativa:** S

---

### HU-020 — Ver Earnings no Dashboard

**Como** proprietário, **quero** ver um resumo dos valores recebidos por período no meu dashboard, **para que** eu acompanhe minha renda e planeja meus anúncios de forma mais estratégica.

**Critérios de aceitação:**

- Dado que acesso o dashboard do proprietário, então vejo um painel de earnings com: total de aluguéis concluídos, valor total combinado no mês atual, e comparativo com o mês anterior.
- Dado que estou no painel de earnings, então vejo uma meta mensal com progress bar configurável (P2 item #60).
- Dado que acesso o dashboard, então vejo próximas devoluções com countdown e botão "Enviar lembrete" para o locatário (P2 itens #58 e #59).
- Dado que o painel de earnings mostra zero, então vejo um empty state motivacional com dica "Itens com 3+ fotos recebem 4x mais contatos."
- Dado que clico em "Ver detalhes" de um mês, então sou redirecionado ao histórico filtrado pelo período (HU-019).

**Notas técnicas:** CSR. No MVP, os valores são baseados nas reservas `COMPLETED` — sem integração de pagamento (H3). Dependências: HU-019.

**Prioridade:** P1 | **Estimativa:** M

---

## Perfil: Admin

---

### HU-021 — Aprovar ou Reprovar Anúncios

**Como** admin, **quero** revisar, aprovar e reprovar anúncios publicados pelos usuários, **para que** o marketplace mantenha qualidade e segurança, removendo conteúdo inadequado ou fraudulento.

**Critérios de aceitação:**

- Dado que acesso o painel admin em `/admin/anuncios`, então vejo fila de anúncios pendentes de revisão com foto, título, categoria, usuário e data de publicação.
- Dado que clico em "Aprovar" em um anúncio, então o anúncio transita para status aprovado, permanece visível na busca e o proprietário é notificado "Seu anúncio foi aprovado."
- Dado que clico em "Reprovar", então vejo um campo obrigatório de motivo; ao confirmar, o anúncio é removido da busca (soft delete) e o proprietário é notificado com o motivo.
- Dado que acesso `/admin/anuncios` sem perfil admin, então recebo erro 403 sem exposição de dados internos.
- Dado que a fila de anúncios está vazia, então vejo o estado vazio "Nenhum anúncio aguardando revisão."

**Notas técnicas:** No MVP, moderação é reativa (anúncios ficam visíveis imediatamente e admin pode remover). Moderação proativa (aprovação obrigatória antes de publicar) é opção para H2. RLS no Supabase garante que apenas role `admin` acessa estes dados. Dependências: HU-014.

**Prioridade:** P1 | **Estimativa:** M

---

### HU-022 — Suspender Usuários

**Como** admin, **quero** suspender contas de usuários que violam as regras da plataforma, **para que** eu proteja a comunidade de fraudes, golpes e comportamentos abusivos.

**Critérios de aceitação:**

- Dado que acesso `/admin/usuarios` e busco um usuário pelo nome, e-mail ou CPF (mascarado), então vejo os dados públicos do usuário: data de cadastro, número de anúncios, reservas e avaliações.
- Dado que clico em "Suspender conta", então vejo modal com campo obrigatório de motivo e duração (7 dias / 30 dias / Permanente); ao confirmar, o usuário perde acesso imediato à plataforma.
- Dado que o usuário está suspenso e tenta fazer login, então vejo a mensagem "Sua conta foi suspensa. Entre em contato com o suporte." sem expor o motivo técnico.
- Dado que acesso `/admin/usuarios` sem perfil admin, então recebo erro 403.
- Dado que revejo uma suspensão e clico em "Revogar suspensão", então o usuário recupera acesso imediatamente e recebe e-mail de notificação.

**Notas técnicas:** CPF/CNPJ nunca exibido em claro no painel admin — apenas mascarado (ex.: `***.***.123-**`). RLS e role `admin` obrigatórios. Dependências: HU-001, HU-013.

**Prioridade:** P1 | **Estimativa:** M

---

## Tabela de Rastreabilidade — HU x Backlog Tecnico

Esta tabela cruza as 22 histórias de usuário com os itens P0 e P1 do backlog técnico (`docs/backlog-atividades-priorizadas.md`).

| Historia | Titulo resumido | Itens P0 relacionados | Itens P1 relacionados |
|---|---|---|---|
| HU-001 | Cadastro PF | #4 (crypto), #8 (Supabase 3 instâncias), #9 (CI), #10 (RLS) | #13 (e2e auth), #14 (test register), #15 (test auth validations), #16 (rateLimit) |
| HU-002 | Login e Logout | #9 (CI), #10 (RLS) | #13 (e2e auth), #17 (middleware) |
| HU-003 | Busca geolocalizada | #8 (Supabase), #9 (CI) | #18 (e2e navigation), #19 (e2e search-filter), #20 (filtro distância mobile), #21 (ItemCard), #29 (chips filtros ativos), #33 (preservação contexto de busca) |
| HU-004 | Detalhe do item | #5 (empty states), #6 (404/500) | #21 (ItemCard), #22 (calendário disponibilidade), #23 (taxa resposta), #28 (política cancelamento), #30 (breadcrumb), #31 (itens similares) |
| HU-005 | Solicitar reserva | #7 (política cancelamento), #8 (Supabase), #9 (CI), #10 (RLS) | #11 (test bookings patch), #12 (e2e booking flow), #24 (timeout reserva), #25 (código reserva), #34 (tela aguardando confirmação) |
| HU-006 | Acompanhar status | #5 (empty states) | #11 (test bookings patch), #12 (e2e booking flow) |
| HU-007 | Chat in-app | #9 (CI), #10 (RLS) | #12 (e2e booking flow) |
| HU-008 | Devolução (locatário) | #7 (política cancelamento) | #12 (e2e booking flow), #26 (reportar problema), #27 (extensão prazo) |
| HU-009 | Avaliar proprietário | — | #12 (e2e booking flow) |
| HU-010 | Favoritar itens | #10 (RLS) | — |
| HU-011 | Cancelar reserva | #7 (política cancelamento) | #11 (test bookings patch) |
| HU-012 | Reportar problema | #10 (RLS) | #26 (formulário reportar problema) |
| HU-013 | Cadastro PJ | #4 (crypto), #8 (Supabase), #9 (CI), #10 (RLS) | #13 (e2e auth), #14 (test register), #15 (test auth validations), #16 (rateLimit) |
| HU-014 | Anunciar item | #5 (empty states), #8 (Supabase), #9 (CI), #10 (RLS) | #21 (ItemCard) |
| HU-015 | Confirmar/recusar pedido | #9 (CI), #10 (RLS) | #11 (test bookings patch), #24 (timeout reserva) |
| HU-016 | Marcar ativo (retirada) | #9 (CI) | #11 (test bookings patch) |
| HU-017 | Confirmar devolução e avaliar | #7 (política cancelamento) | #11 (test bookings patch) |
| HU-018 | Gerenciar anúncios | #5 (empty states) | — |
| HU-019 | Histórico de locações | #5 (empty states) | — |
| HU-020 | Earnings no dashboard | #5 (empty states) | — |
| HU-021 | Aprovar/reprovar anúncios | #9 (CI), #10 (RLS) | — |
| HU-022 | Suspender usuários | #9 (CI), #10 (RLS) | #17 (middleware) |

---

*Shareo — "Use Mais. Possua Menos." — Documento gerado em 2026-05-30*
