import type { Metadata } from "next"
import type { ReactNode } from "react"
import { AppHeader } from "@/components/layout/AppHeader"
import { HelpSearch } from "@/components/ajuda/HelpSearch"
import { getPlatformFeeRate } from "@/lib/platform-config"

export const metadata: Metadata = {
  title: "Central de Ajuda — ShareO",
  description: "Tudo o que você precisa saber para alugar ou anunciar no ShareO. Guia completo para locatários, locadores, taxas, disputas e segurança.",
}

/* ── Tipos ──────────────────────────────────────────────────────── */

interface Step {
  step:     number
  icon:     string
  title:    string
  desc:     string
  tip?:     string
  example?: string
  warning?: string
}

/* ── Dados — Primeiros Passos ───────────────────────────────────── */

const LOCATARIO_STEPS: Step[] = [
  {
    step: 1, icon: "📧", title: "Criar sua conta",
    desc: "Acesse shareo.com.br e clique em 'Criar conta'. Informe nome, email e uma senha segura. Confirme o email pelo link enviado para sua caixa de entrada — verifique também a pasta de spam.",
    tip: "Você pode navegar pelos anúncios sem cadastro. A conta só é necessária para solicitar reservas.",
  },
  {
    step: 2, icon: "🪪", title: "Verificar sua identidade",
    desc: "Acesse Meu Perfil → Privacidade e dados → Verificar identidade. Informe seu CPF e tire uma selfie segurando o documento. A análise leva até 24 horas úteis. Após aprovada, o selo 'Verificado' aparece no seu perfil.",
    warning: "Reservas de alto valor exigem verificação completa. Proprietários tendem a aceitar mais rapidamente locatários verificados.",
  },
  {
    step: 3, icon: "🔍", title: "Buscar o equipamento",
    desc: "Use a barra de busca na tela inicial ou acesse 'Explorar'. Filtre por categoria, cidade e faixa de preço. Cada anúncio mostra fotos, avaliações do proprietário, localização (bairro/cidade) e o preço por dia, semana ou mês.",
    tip: "O ShareO mostra a diferença entre alugar e comprar novo — útil para tomar a decisão certa.",
  },
  {
    step: 4, icon: "📅", title: "Solicitar a reserva",
    desc: "Abra o anúncio e use a calculadora de locação. Selecione a modalidade (diário, semanal ou mensal), a data de retirada e a duração. O valor total — incluindo a taxa de serviço — aparece antes de você confirmar. Escreva uma mensagem apresentando-se ao proprietário e clique em 'Solicitar locação'. Você ainda não paga nada nesta etapa. O valor máximo por locação é R$ 500.",
    example: "",
  },
  {
    step: 5, icon: "💳", title: "Aguardar confirmação e pagar",
    desc: "O proprietário tem até 24 horas para confirmar ou recusar. Se ele confirmar, você recebe uma notificação e pode clicar em 'Pagar agora'. O pagamento é feito por cartão de crédito (Visa, Mastercard, Elo, Amex) via Stripe — seus dados de cartão nunca passam pelos servidores do ShareO. O valor máximo por locação é R$ 500. O dinheiro fica retido na plataforma e só é repassado ao proprietário após a devolução confirmada.",
    tip: "Se o proprietário não responder em 24h, a reserva é cancelada automaticamente e nenhum valor é cobrado.",
  },
  {
    step: 6, icon: "🤝", title: "Combinar a retirada e receber o item",
    desc: "Use o chat da reserva para combinar local e horário de retirada com o proprietário. Na entrega, verifique se ele registrou as fotos de check-in (estado inicial do item documentado). Se o item estiver diferente do anúncio ou tiver danos não fotografados, mencione isso no chat antes de confirmar a retirada.",
    warning: "Não confirme a retirada se houver danos não registrados. Use o chat para documentar tudo — é a sua proteção em caso de disputa.",
  },
  {
    step: 7, icon: "📦", title: "Usar, devolver no prazo e avaliar",
    desc: "Cuide bem do item durante toda a locação. O prazo de devolução é contado a partir do horário confirmado de retirada — se você retirou às 10h, deve devolver até às 10h do último dia. Você recebe um aviso no app 24 horas antes desse prazo. Devolva no local e horário combinados pelo chat. Aguarde o proprietário registrar o check-out e confirmar a devolução. Após isso, avalie o proprietário com uma nota de 1 a 5 estrelas.",
    example: "Atraso de 1 dia em item de R$ 80/dia = R$ 80 de multa cobrada automaticamente. Atraso de 3 dias = R$ 240. Para evitar: solicite uma extensão de prazo antes do vencimento — nunca depois.",
  },
  {
    step: 8, icon: "✅", title: "Confirme a devolução",
    desc: "Quando devolver o item, toque em 'Confirmar devolução'. Isso avisa o proprietário que o item foi entregue.",
    tip: "Confirme apenas quando o item já estiver nas mãos do proprietário.",
  },
]

const LOCADOR_STEPS: Step[] = [
  {
    step: 1, icon: "📧", title: "Criar conta e verificar identidade",
    desc: "Acesse shareo.com.br e clique em 'Criar conta'. Após confirmar o email, vá em Meu Perfil → Privacidade e dados → Verificar identidade. Informe CPF (pessoa física) ou CNPJ (empresa). O processo leva até 24 horas úteis.",
    tip: "Anunciantes verificados recebem muito mais solicitações. O selo 'Verificado' é o principal fator de confiança para novos locatários.",
  },
  {
    step: 2, icon: "📸", title: "Criar seu primeiro anúncio",
    desc: "Clique em 'Anunciar' no menu. Adicione pelo menos 3 fotos nítidas em boa iluminação, de diferentes ângulos. Preencha: título claro e descritivo, categoria, estado de conservação (novo, seminovo, bom estado ou regular) e uma descrição detalhada mencionando dimensões, capacidade e cuidados necessários. Defina o preço por dia (obrigatório), e opcionalmente por semana e mês com desconto. Publique — o anúncio aparece na busca em minutos.",
    example: "Anúncio: 'Tenda Gazebo 3×3m branca para festas'. Preço: R$ 120/dia, R$ 360/semana (3× diária), R$ 1.800/mês (15× diária). Categoria: Festas e Eventos. Estado: Bom estado.",
  },
  {
    step: 3, icon: "💳", title: "Cadastrar sua chave PIX",
    desc: "Antes de receber qualquer pagamento, cadastre sua chave PIX em Meu Perfil → Recebimentos. Você pode usar CPF, CNPJ, e-mail, telefone ou chave aleatória. Sem a chave PIX cadastrada, os repasses ficam em espera e não são processados.",
    tip: "Faça isso antes de publicar o primeiro anúncio para não atrasar nenhum recebimento.",
  },
  {
    step: 4, icon: "🔔", title: "Gerenciar solicitações de reserva",
    desc: "Você tem até 24 horas para confirmar ou recusar cada solicitação. Ative as notificações do app para não perder pedidos. Leia a mensagem do locatário, analise o perfil dele (verificado? avaliações?) e use o chat para combinar detalhes antes de confirmar. Ao confirmar, o locatário recebe a notificação para pagar.",
    warning: "Cancelamentos frequentes reduzem sua visibilidade na busca e prejudicam sua reputação. Só recuse se realmente necessário — e sempre informe o motivo ao locatário.",
  },
  {
    step: 5, icon: "📷", title: "Entregar o item e registrar o check-in",
    desc: "Combine local e horário de entrega pelo chat da reserva. Na hora da entrega, use a opção 'Registrar fotos de check-in' na página da reserva — fotografe todos os ângulos do item, incluindo marcas e desgastes já existentes. Após a entrega física, clique em 'Marcar como ativo' no app. O pagamento é liberado para você nesse exato momento.",
    warning: "Sem fotos de check-in, você perde proteção em disputas por danos. Nunca pule essa etapa, mesmo que o locatário pareça confiável.",
  },
  {
    step: 6, icon: "💰", title: "Receber a devolução e o pagamento",
    desc: "No horário combinado (mesmo horário da retirada), receba o item de volta. Use a opção 'Registrar fotos de check-out' e compare com as fotos do check-in. Se tudo estiver ok, confirme a devolução. O valor líquido entra na fila de repasse semanal e é transferido via PIX na próxima segunda-feira. Avalie o locatário após cada devolução.",
    example: "LOCADOR_STEP6_EXAMPLE",
    tip: "Quanto mais avaliações positivas você tiver, mais alto o seu anúncio aparece nos resultados de busca.",
  },
  {
    step: 7, icon: "✅", title: "Confirme o recebimento",
    desc: "Após o locatário devolver, toque em 'Confirmar recebimento' e informe o estado do item. O valor líquido entra na fila de repasse semanal e é transferido via PIX toda segunda-feira (feriado: primeiro dia útil seguinte) para a chave cadastrada em Meu Perfil → Recebimentos.",
    warning: "Se o item voltar danificado, selecione 'Danificado'. Uma disputa será aberta automaticamente e o repasse fica suspenso até a resolução.",
  },
]

/* ── Dados — Taxas ──────────────────────────────────────────────── */

function buildFeeTable(feeLabel: string) { return [
  { label: "Taxa de serviço (cobrada do locatário)", value: `${feeLabel} do total`,           when: "Na confirmação do pagamento" },
  { label: "Anunciar na plataforma (locador)",        value: "Gratuito",                      when: "Sempre, sem mensalidade" },
  { label: "Repasse ao locador",                      value: "Via PIX — valor líquido",       when: "Toda segunda-feira (feriado: 1º dia útil seguinte)" },
  { label: "Valor máximo do bem anunciado",             value: "R$ 1.000 por item",             when: "Validado ao publicar o anúncio" },
  { label: "Limite por locação",                      value: "R$ 500 por transação",          when: "Validado no checkout" },
  { label: "Seguro opcional (locador)",                value: "1% sobre o valor da locação",   when: "Optativo — cobre extravio do item" },
  { label: "Multa por atraso na devolução",           value: "1× preço diário por dia extra", when: "Por cada dia além do prazo" },
  { label: "Cancelamento com +24h de antecedência",   value: "Gratuito",                      when: "Reembolso integral" },
  { label: "Cancelamento com menos de 24h",           value: "30% do valor da locação",       when: "Descontado do reembolso" },
] }

/* ── Dados — FAQ ────────────────────────────────────────────────── */

const SECTIONS = [
  {
    id: "locatario",
    title: "Para quem quer alugar",
    icon: "🛒",
    color: "bg-[#144D81]/5 border-[#144D81]/20",
    iconBg: "bg-[#144D81]/10",
    faqs: [
      { q: "Como encontro um item perto de mim?",
        a: "Acesse 'Explorar' e navegue pelos anúncios disponíveis. Cada item mostra o bairro e a cidade do proprietário, para você saber onde o item está antes de solicitar." },
      { q: "Como faço uma reserva?",
        a: "Abra a página do item e use a calculadora de locação. Escolha a modalidade (diário, semanal ou mensal), selecione a data de retirada e o número de dias. A data de devolução e o valor total aparecem automaticamente. Se quiser, escreva uma mensagem ao proprietário e clique em 'Solicitar locação'." },
      { q: "Como funciona o pagamento?",
        a: "Só é possível pagar depois que o proprietário confirmar a reserva. Quando ele aceitar, você recebe o aviso e pode clicar em 'Pagar agora'. O pagamento é feito com cartão via Stripe. O dinheiro fica retido e só é liberado ao proprietário após a confirmação da retirada do item." },
      { q: "Posso cancelar uma reserva?",
        a: "Sim. Enquanto a reserva estiver 'Aguardando' ou 'Confirmada', você pode cancelar na página da reserva. O cancelamento é gratuito até 24 horas antes da data de retirada." },
      { q: "O que acontece na retirada do item?",
        a: "Combine com o proprietário pelo chat do app onde e quando retirar o item. Na entrega, o proprietário registra fotos do estado do item (check-in) e marca a reserva como 'Ativo'. O período de locação começa a contar a partir desse momento — o prazo de devolução é no mesmo horário, N dias depois. Exemplo: retirada em 10/10 às 10h → devolução até 11/10 às 10h (1 dia)." },
      { q: "E se o item não estiver como anunciado?",
        a: "Se houver algum problema, você pode abrir uma disputa na página da reserva enquanto ela estiver ativa ou em até 48 horas após a devolução. Descreva o que aconteceu e a equipe ShareO vai analisar o caso em até 3 dias úteis. Estamos disponíveis 7 dias por semana." },
      { q: "Como avalio o proprietário?",
        a: "Após devolver o item, a opção de avaliação aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário. Avaliações ajudam toda a comunidade ShareO." },
      { q: "O proprietário tem um prazo para confirmar minha reserva?",
        a: "Sim. Após você solicitar uma reserva, o proprietário tem até 24 horas para confirmar ou recusar. Se ele não responder nesse prazo, a reserva é cancelada automaticamente e nenhum valor é cobrado. Você recebe uma notificação assim que isso acontecer e pode buscar outro item disponível." },
      { q: "Posso pedir para estender o prazo de um aluguel que já está em andamento?",
        a: "Sim, enquanto a reserva estiver com status 'Ativo' você pode solicitar uma extensão diretamente na página da reserva. O proprietário precisa aceitar a extensão. Se ele confirmar, o novo período e o valor adicional são calculados automaticamente e o pagamento é processado na hora. Só solicite se ainda tiver o item em mãos e com tempo hábil para o proprietário responder." },
      { q: "O que acontece se eu devolver o item com atraso?",
        a: "O prazo de devolução é calculado a partir do horário exato de retirada confirmada — se você retirou às 10h, deve devolver até às 10h do último dia. Uma taxa de atraso equivalente a 1 diária é gerada automaticamente para cada dia extra além desse prazo. Você recebe um aviso no app 24h antes do vencimento. Para evitar cobranças extras, solicite uma extensão antes do prazo vencer — nunca depois." },
      { q: "Como funciona o chat com o proprietário?",
        a: "Assim que você solicita uma reserva, um chat exclusivo entre você e o proprietário é aberto na página da reserva. As mensagens chegam em tempo real. Use o chat para combinar local e horário de entrega, tirar dúvidas sobre o item ou enviar qualquer informação necessária. O chat fica disponível durante toda a locação, inclusive no período de devolução." },
      { q: "Como salvo itens para ver depois?",
        a: "Toque no ícone de coração em qualquer anúncio para adicioná-lo aos seus favoritos. Acesse todos os seus itens salvos na aba 'Favoritos' do menu. É uma forma prática de guardar opções enquanto você compara preços ou ainda não está pronto para reservar." },
      { q: "O que são as fotos de check-in e check-out?",
        a: "São registros fotográficos do estado do item feitos pelo proprietário no momento da entrega (check-in) e da devolução (check-out). Essas fotos ficam vinculadas à reserva e servem como evidência caso haja alguma disputa sobre danos. Ao retirar o item, confira se o proprietário registrou as fotos. Se você notar algum dano que não foi fotografado, mencione isso no chat antes de assinar a entrega." },
    ],
  },
  {
    id: "locador",
    title: "Para quem quer anunciar",
    icon: "📦",
    color: "bg-brand/5 border-brand/20",
    iconBg: "bg-brand/10",
    faqs: [
      { q: "Como anuncio meu item?",
        a: "Vá em 'Anunciar' no app. Preencha o título, descrição, categoria, estado de conservação (novo, seminovo, bom estado ou regular) e adicione fotos. Informe seu bairro e cidade para que locatários saibam onde o item está. Depois defina o preço e publique." },
      { q: "Como defino o preço?",
        a: "Você define o preço por dia. Uma sugestão de referência: diária = 3–5% do valor do bem; semanal = 3× a diária; mensal = 15× a diária. O formulário de anúncio tem um botão 'Calcular' que aplica esses valores automaticamente. Também pode oferecer preço por semana e por mês com desconto diferente, para incentivar aluguéis mais longos. Se o item tiver valor de mercado conhecido, informe o preço de compra: o app mostra ao locatário quanto ele economiza alugando em vez de comprar." },
      { q: "Como confirmo uma reserva?",
        a: "Quando alguém solicitar seu item, você recebe uma notificação. Em 'Minhas Reservas', clique na aba 'Como locador'. Abra a reserva, leia a mensagem do locatário e clique em 'Confirmar reserva'. Se não quiser aceitar, pode cancelar informando o motivo." },
      { q: "Quando recebo o pagamento?",
        a: "Após você confirmar o recebimento do item devolvido, o valor líquido (aluguel menos a taxa da plataforma) entra na fila de repasse. Todo domingo à meia-noite as operações concluídas são consolidadas, e toda segunda-feira o valor é transferido automaticamente para a sua chave PIX cadastrada em Meu Perfil → Recebimentos. Se a segunda-feira for feriado, o repasse ocorre no primeiro dia útil seguinte." },
      { q: "O que faço na entrega do item?",
        a: "Combine o local e horário de entrega pelo chat. Na hora da entrega, você pode registrar fotos do estado do item (check-in). Quando entregar, clique em 'Marcar como ativo'. Na devolução, registre fotos de check-out para documentar o estado do item ao retornar." },
      { q: "Como cancelo uma reserva?",
        a: "Você pode cancelar enquanto ela estiver 'Aguardando' ou 'Confirmada'. Na página da reserva, clique em 'Cancelar reserva' e informe o motivo. Evite cancelamentos frequentes — eles afetam sua reputação na plataforma." },
      { q: "Meu item está protegido?",
        a: "A ShareO oferece proteção durante a locação via fotos de check-in e check-out vinculadas à reserva. O valor fica retido na plataforma até o repasse semanal (toda segunda-feira), o que protege ambas as partes contra contestações. Em caso de danos, abra uma disputa com as fotos como evidência — o repasse fica suspenso até a resolução." },
      { q: "Posso pausar meu anúncio temporariamente?",
        a: "Sim. Em 'Meus Anúncios', clique em 'Pausar' no card do item. O anúncio sai da busca e não recebe novas solicitações, mas continua salvo com todas as suas informações, fotos e histórico. Quando quiser voltar a anunciar, clique em 'Reativar'. Use esse recurso quando o item estiver em uso, em manutenção ou você precisar de uma pausa — é melhor do que remover e recriar o anúncio." },
      { q: "Tenho um prazo para confirmar uma solicitação?",
        a: "Sim. Você tem até 24 horas para confirmar ou recusar qualquer solicitação. Se não responder dentro desse prazo, a reserva é cancelada automaticamente. Cancelamentos automáticos por falta de resposta afetam sua reputação na plataforma. Ative as notificações do app para não perder solicitações." },
      { q: "O que acontece se o locatário não devolver o item no prazo?",
        a: "O prazo de devolução é o mesmo horário da retirada, N dias depois — por exemplo, retirou às 14h, deve devolver até às 14h do último dia. Se o locatário não devolver no prazo, uma taxa equivalente a 1 diária é gerada automaticamente para cada dia de atraso. Você é notificado no app assim que o atraso é registrado. Se o locatário não entrar em contato, use o chat da reserva para cobrar a devolução. Em casos de atraso prolongado ou sem resposta, abra uma disputa na página da reserva para acionar a equipe ShareO." },
      { q: "Como avalio o locatário após a locação?",
        a: "Após a devolução do item, a opção de avaliar o locatário aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário sobre pontualidade, cuidado com o item e comunicação. A avaliação fica visível no perfil do locatário e ajuda outros proprietários a decidir com quem alugar." },
      { q: "Como funciona o check-in e check-out fotográfico?",
        a: "Na entrega do item, use a opção 'Registrar fotos de check-in' na página da reserva. Fotografe o item de todos os ângulos, incluindo possíveis marcas ou desgastes que já existiam antes. Na devolução, registre as fotos de check-out da mesma forma. Essas imagens ficam salvas na reserva e são a principal evidência em caso de disputa por danos. Não pule essa etapa — ela protege você." },
      { q: "Quando recebo o pagamento da locação?",
        a: "Após confirmar o recebimento do item, o valor líquido entra na fila de repasse semanal. Todo domingo as operações do dia são consolidadas, e toda segunda-feira o valor é transferido via PIX para a chave cadastrada em Meu Perfil → Recebimentos. Se segunda for feriado, o repasse ocorre no primeiro dia útil seguinte." },
      { q: "O que faço se o item voltou danificado?",
        a: "Na tela de confirmação de recebimento, selecione 'Danificado' e descreva o problema. Uma disputa é aberta automaticamente e o pagamento fica pausado até a resolução." },
      { q: "Por que meu item não aparece na busca?",
        a: "Itens sem foto ficam como Rascunho e não aparecem para outros usuários. Adicione pelo menos 1 foto para publicar automaticamente." },
      { q: "O que é um item Rascunho?",
        a: "Um Rascunho é um item salvo mas invisível na busca. Ele aparece com badge amarelo em Meus anúncios. Basta adicionar uma foto para publicar." },
      { q: "Se eu remover todas as fotos, o item some da busca?",
        a: "Sim. Ao remover todas as fotos, o item volta automaticamente para Rascunho e some dos resultados de busca. Adicione uma nova foto para reativar." },
    ],
  },
  {
    id: "pagamento",
    title: "Pagamento e Segurança",
    icon: "🔒",
    color: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100",
    faqs: [
      { q: "Como o pagamento funciona no ShareO?",
        a: "O pagamento segue quatro etapas: 1) O locatário solicita a reserva. 2) O proprietário confirma. 3) O locatário paga via cartão pelo app — o dinheiro fica retido na plataforma. 4) Após a devolução confirmada, o valor líquido é repassado ao proprietário via PIX toda segunda-feira (considerando todas as operações concluídas até domingo às 23h59). Se segunda for feriado, o repasse ocorre no primeiro dia útil seguinte. Isso garante segurança para os dois lados." },
      { q: "Meu dinheiro está protegido?",
        a: "Sim. O pagamento não vai direto para o proprietário — ele fica retido na plataforma até a confirmação da entrega. Se algo der errado antes disso, o valor pode ser devolvido. Em caso de disputa, nossa equipe analisa o caso e decide o destino do pagamento." },
      { q: "Como os proprietários recebem o pagamento?",
        a: "Os proprietários recebem via PIX. Toda segunda-feira o valor líquido (aluguel menos a taxa da plataforma) das operações concluídas até domingo às 23h59 é transferido automaticamente para a chave PIX cadastrada em Meu Perfil → Recebimentos. Se segunda for feriado, o repasse ocorre no primeiro dia útil seguinte. Para cadastrar ou atualizar sua chave PIX, acesse Meu Perfil → Recebimentos." },
      { q: "Como funciona o pagamento do locatário?",
        a: "O locatário paga com cartão de crédito via Stripe — a mesma tecnologia usada por grandes empresas no mundo todo. Seus dados de cartão nunca passam pelos servidores do ShareO. O valor é cobrado à vista (sem parcelamento na versão atual) e fica retido até a devolução confirmada." },
      { q: "Quais bandeiras de cartão são aceitas?",
        a: "São aceitos cartões de crédito Visa, Mastercard, Elo e American Express. O parcelamento não está disponível na versão atual — o valor total é cobrado à vista. O valor máximo por locação é R$ 500." },
      { q: "Existe caução no ShareO?",
        a: "A caução ainda não está disponível nesta versão do ShareO. A proteção ao proprietário é feita via fotos de check-in e check-out vinculadas à reserva e pelo canal de disputas, onde a equipe ShareO medeia casos de danos. A caução estará disponível em uma versão futura da plataforma." },
      { q: "Como funciona a verificação de identidade?",
        a: "Para criar uma conta e fazer reservas, você precisa confirmar seu email. Para desbloquear reservas de alto valor e acessar recursos avançados, a verificação de CPF é solicitada. O documento é criptografado e armazenado com segurança — nunca aparece em tela ou logs. O selo 'Verificado' no seu perfil aumenta a confiança de outros usuários." },
      { q: "Como a ShareO protege contra fraudes?",
        a: "Usamos múltiplas camadas de proteção: verificação de identidade (CPF/CNPJ), análise de risco nas transações via Stripe, limite de tentativas de pagamento e monitoramento de comportamento suspeito. Contas com padrões anômalos são sinalizadas para revisão manual antes de qualquer transação ser concluída." },
    ],
  },
  {
    id: "taxas",
    title: "Taxas e Custos",
    icon: "🧾",
    color: "bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-100",
    faqs: [
      { q: "Qual é a taxa de serviço do ShareO?",
        a: "TAXA_FAQ_PLACEHOLDER" },
      { q: "Existe algum custo para anunciar?",
        a: "Não. Anunciar no ShareO é 100% gratuito. Você não paga nada para criar anúncios, receber reservas ou usar o chat. O ShareO só cobra a taxa de serviço (do locatário) quando uma locação é concluída com sucesso. Se a reserva for cancelada antes da entrega, nenhuma taxa é cobrada." },
      { q: "Como funciona a multa por atraso na devolução?",
        a: "Para cada dia além da data combinada, o app registra automaticamente uma cobrança equivalente ao preço diário do item. Exemplo: se o aluguel é R$ 50/dia e você atrasou 2 dias, serão cobrados R$ 100 extras. Você recebe uma notificação de aviso 1 dia antes do prazo vencer. Para evitar multa, solicite uma extensão antes do prazo — e não depois." },
      { q: "Existe limite no valor do bem anunciado?",
        a: "Sim. Nesta primeira fase, itens com valor estimado acima de R$ 1.000 não podem ser anunciados. Esse limite existe para adequar o perfil de risco dos aluguéis enquanto a plataforma está em fase inicial. Itens de maior valor estarão disponíveis em versões futuras." },
      { q: "Existe taxa de cancelamento?",
        a: "O cancelamento é gratuito se feito com mais de 24 horas de antecedência em relação à data de retirada. Cancelamentos com menos de 24 horas de antecedência geram uma taxa de 30% do valor total para cobrir custos operacionais. Proprietários que cancelam com frequência podem ter as contas suspensas temporariamente." },
      { q: "Recebo comprovante das transações?",
        a: "Sim. O ShareO emite comprovante eletrônico para todas as transações concluídas na plataforma. O comprovante é enviado automaticamente para o email cadastrado após o encerramento da reserva. Você também pode acessar o histórico completo em 'Meu Perfil > Histórico financeiro'." },
    ],
  },
  {
    id: "disputas",
    title: "Disputas e Proteção",
    icon: "⚖️",
    color: "bg-red-50 border-red-200",
    iconBg: "bg-red-100",
    faqs: [
      { q: "Quando posso abrir uma disputa?",
        a: "Você pode abrir uma disputa enquanto a reserva estiver com status 'Ativo' ou em até 48 horas após a devolução do item. Após esse prazo, a reserva é encerrada e o pagamento liberado automaticamente. Por isso, inspecione o item imediatamente na devolução e abra a disputa se necessário — não espere." },
      { q: "Que documentos preciso para abrir uma disputa?",
        a: "As principais evidências são as fotos de check-in e check-out registradas na plataforma. Você também pode enviar: capturas de tela do chat, fotos adicionais com data e hora visíveis, orçamentos de reparo e qualquer comunicação relevante. Quanto mais evidências você fornecer, mais rápida e precisa será a análise." },
      { q: "Como a equipe ShareO decide em uma disputa?",
        a: "Nossa equipe analisa todas as evidências fornecidas pelas duas partes: fotos de check-in vs. check-out, conversas no chat, histórico de transações e avaliações anteriores. Respondemos em até 3 dias úteis. A decisão leva em conta o estado documentado do item antes e depois, o comportamento das partes e a política de uso do ShareO." },
      { q: "O que acontece com o repasse em caso de dano?",
        a: "Se houver dano comprovado, o proprietário abre uma disputa antes de confirmar o recebimento. O repasse via PIX fica suspenso automaticamente durante a análise. A equipe ShareO avalia as fotos de check-in e check-out e, em até 3 dias úteis, decide se o repasse é liberado, parcialmente retido ou cancelado conforme o prejuízo apurado." },
      { q: "O que acontece se meu item for extraviado?",
        a: "Em caso de furto ou extravio durante a locação, a cobertura depende se o seguro opcional foi contratado. Proprietários que optarem pelo seguro da plataforma (1% sobre o valor da locação) têm o prejuízo coberto conforme as condições do plano. Sem o seguro, abra uma disputa na plataforma e registre um boletim de ocorrência (BO) — a ShareO analisa o caso e aciona os mecanismos de proteção disponíveis, mas a cobertura financeira não é garantida." },
      { q: "Posso apelar de uma decisão de disputa?",
        a: "Sim. Se você discordar da decisão, tem até 5 dias úteis para solicitar uma revisão. Envie novas evidências que não foram analisadas anteriormente e explique o motivo do recurso. A revisão é feita por um time diferente do que tomou a decisão original. Caso o problema persista, você pode acionar os canais de defesa do consumidor (Procon) ou o e-Consumidor." },
    ],
  },
  {
    id: "suporte",
    title: "Suporte e Atendimento",
    icon: "🎧",
    color: "bg-sky-50 border-sky-200",
    iconBg: "bg-sky-100",
    faqs: [
      { q: "Quais são os canais de atendimento?",
        a: "Você pode nos contatar por: Email (suporte@shareo.com.br) — respondemos em até 4 horas úteis; Chat interno do app — disponível em reservas ativas; e, em casos urgentes, pelo botão 'Atendimento emergencial' dentro da reserva com disputa ativa. Nosso horário é segunda a domingo, das 8h às 22h." },
      { q: "Qual é o prazo de resposta para cada tipo de solicitação?",
        a: "Email: até 4 horas úteis. Disputas ativas: até 3 dias úteis para decisão. Revisão de disputa (recurso): até 5 dias úteis. Solicitações de exclusão de conta (LGPD): até 15 dias. Denúncias de usuário suspeito: até 24 horas. Para reservas urgentes em andamento, use sempre o canal de atendimento emergencial dentro do app." },
      { q: "Como reporto um usuário ou anúncio suspeito?",
        a: "Em qualquer anúncio ou perfil, toque nos três pontinhos (⋯) e selecione 'Reportar'. Descreva o problema com o máximo de detalhes e confirme. Nossa equipe analisa o reporte em até 24 horas e, se necessário, suspende o usuário preventivamente. Reportes são anônimos — o usuário reportado não sabe quem enviou." },
      { q: "Tenho um problema urgente com uma reserva em andamento. O que faço?",
        a: "Acesse a página da reserva e toque em 'Precisa de ajuda?'. Isso abre um canal prioritário com nossa equipe. Para situações críticas — item não entregue no dia, proprietário sem contato, suspeita de golpe — use 'Solicitar intervenção ShareO' para acionar resposta em até 2 horas." },
      { q: "O app tem notificações automáticas?",
        a: "Sim. Você recebe notificações para: nova solicitação de reserva recebida, confirmação ou recusa de reserva, mensagem no chat, pagamento recebido, aviso 24h antes do prazo de devolução, atraso registrado e resultado de disputa. Ative as notificações do app nas configurações do celular para não perder nenhum alerta." },
    ],
  },
  {
    id: "conta",
    title: "Conta e Perfil",
    icon: "👤",
    color: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-100",
    faqs: [
      { q: "Como verifico minha identidade?",
        a: "Acesse 'Meu Perfil' e role até 'Privacidade e dados'. Lá você encontra a opção de verificação de identidade. Envie os documentos solicitados (CPF e selfie com o documento). Quando aprovada, um selo de verificado aparece no seu perfil. O processo leva até 24 horas úteis." },
      { q: "Como edito meu perfil?",
        a: "Vá em 'Meu Perfil'. Você pode atualizar nome, bio, telefone, cidade, bairro e foto de perfil. Manter seu perfil completo ajuda outros usuários a confiar mais em você." },
      { q: "Como me torno PJ Premium?",
        a: "No seu perfil, encontre o bloco de upgrade para Pessoa Jurídica (PJ). Como PJ, você ganha uma vitrine personalizada com link próprio, acesso a analytics avançado dos seus anúncios e recursos para importar itens em massa — ideal para quem aluga profissionalmente." },
      { q: "O que é a Vitrine PJ e como ela funciona?",
        a: "A Vitrine PJ é uma página personalizada para locadores pessoa jurídica, acessível pelo link shareo.com.br/loja/[seu-slug]. Ela reúne todos os seus itens ativos em um layout de loja, com logo, descrição do negócio e avaliação geral. Você pode compartilhar esse link com clientes, redes sociais ou materiais de divulgação. Para ativar, faça o upgrade para PJ Premium no seu perfil e configure seu slug único." },
      { q: "Como funciona o Programa de Indicação?",
        a: "Ao indicar um amigo e ele se inscrever e realizar a primeira locação, você receberá pontos ShareO que poderão ser usados como desconto em locações futuras ou resgatados conforme as regras do programa. O link de indicação está disponível em 'Meu Perfil > Indicações'. Programa disponível em breve." },
      { q: "Como excluo minha conta?",
        a: "Acesse 'Meu Perfil > Privacidade e dados > Excluir conta'. A exclusão remove todos os seus dados pessoais em até 15 dias (conforme a LGPD). Reservas em andamento precisam ser finalizadas antes da exclusão. O histórico de transações pode ser retido por até 5 anos para fins legais e fiscais." },
    ],
  },
  {
    id: "legal",
    title: "Questões Legais e Fiscais",
    icon: "📋",
    color: "bg-slate-50 border-slate-200",
    iconBg: "bg-slate-100",
    faqs: [
      { q: "O ShareO emite nota fiscal?",
        a: "O ShareO emite comprovante eletrônico de transação para todas as locações concluídas na plataforma. O comprovante é enviado automaticamente para o email cadastrado após o encerramento da reserva. Você também pode baixar o histórico de comprovantes em 'Meu Perfil > Histórico financeiro'." },
      { q: "Como declaro os rendimentos de aluguel no Imposto de Renda?",
        a: "Rendimentos de aluguel de bens móveis são tributáveis e devem ser declarados como 'Rendimentos Tributáveis Recebidos de Pessoa Física ou Jurídica' na declaração anual do IR. O ShareO fornece um informe de rendimentos anual em Meu Perfil → Repasses → Informe de Rendimentos — basta selecionar o ano e baixar o resumo com todos os valores recebidos. Consulte seu contador para orientações sobre alíquotas e deduções específicas para o seu caso." },
      { q: "Quais as regras para empresas (PJ) anunciarem na plataforma?",
        a: "Pessoas jurídicas podem usar o ShareO com o plano PJ Premium. As regras incluem: CNPJ ativo e regular; emissão de nota fiscal para todas as locações (conforme legislação vigente); cumprimento das regras do CDC (Código de Defesa do Consumidor) na relação com locatários. PJs têm acesso a ferramentas avançadas como importação em massa, analytics e vitrine personalizada." },
      { q: "Meus dados estão protegidos? Como funciona a LGPD no ShareO?",
        a: "O ShareO segue integralmente a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Coletamos apenas os dados estritamente necessários para o funcionamento da plataforma. Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento em 'Meu Perfil > Privacidade e dados'. Nunca compartilhamos seus dados com terceiros sem sua autorização explícita." },
      { q: "O ShareO é regulamentado?",
        a: "O ShareO opera como marketplace de locação de bens móveis, seguindo as normas do Código Civil, CDC e LGPD. As transações são processadas via Stripe, que opera sob regulamentação do Banco Central e das normas PCI-DSS para segurança de cartões. Para dúvidas jurídicas específicas sobre suas transações, consulte um advogado especializado em direito digital ou relações de consumo." },
    ],
  },
]

/* ── Helpers — Server Components ────────────────────────────────── */

function Callout({ type, children }: { type: "tip" | "example" | "warning"; children: ReactNode }) {
  const map = {
    tip:     { cls: "bg-sky-50 border-sky-200 text-sky-800",         label: "💡 Dica",             lc: "text-sky-700 font-bold" },
    example: { cls: "bg-emerald-50 border-emerald-200 text-emerald-800", label: "📊 Exemplo prático", lc: "text-emerald-700 font-bold" },
    warning: { cls: "bg-amber-50 border-amber-200 text-amber-800",   label: "⚠️ Atenção",          lc: "text-amber-700 font-bold" },
  }[type]
  return (
    <div className={`mt-3 rounded-lg border px-4 py-3 text-sm leading-relaxed ${map.cls}`}>
      <span className={map.lc}>{map.label}:</span>{" "}{children}
    </div>
  )
}

function StepItem({ s }: { s: Step }) {
  return (
    <div className="flex gap-4">
      <div className="flex-shrink-0 flex flex-col items-center gap-1.5">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand text-white text-sm font-bold">
          {s.step}
        </div>
        <div className="w-px flex-1 bg-border" aria-hidden="true" />
      </div>
      <div className="pb-8">
        <p className="mb-1 font-semibold text-primary">
          <span className="mr-1.5" aria-hidden="true">{s.icon}</span>
          {s.title}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">{s.desc}</p>
        {s.tip     && <Callout type="tip">{s.tip}</Callout>}
        {s.example && <Callout type="example">{s.example}</Callout>}
        {s.warning && <Callout type="warning">{s.warning}</Callout>}
      </div>
    </div>
  )
}

/* ── Página ─────────────────────────────────────────────────────── */
export default async function AjudaPage() {
  const feeRateBps = await getPlatformFeeRate()
  const feeRatePct = feeRateBps / 100
  const feeLabel   = `${feeRatePct % 1 === 0 ? feeRatePct.toFixed(0) : feeRatePct}%`

  // Exemplos dinâmicos com a taxa atual
  const ex4Fee   = Math.round(240 * feeRatePct) / 100
  const ex4Total = 240 + ex4Fee
  const ex6Net   = Math.round(240 * (1 - feeRatePct / 100))

  const locatarioSteps: Step[] = LOCATARIO_STEPS.map(s =>
    s.step === 4
      ? { ...s, example: `Item: R$ 80/dia. Aluguel de 3 dias = R$ 240,00. Taxa de serviço (${feeLabel}) = R$ ${ex4Fee.toFixed(2).replace(".", ",")}. Total cobrado ao confirmar: R$ ${ex4Total.toFixed(2).replace(".", ",")}.` }
      : s
  )

  const locadorSteps: Step[] = LOCADOR_STEPS.map(s =>
    s.example === "LOCADOR_STEP6_EXAMPLE"
      ? { ...s, example: `Locação: R$ 120/dia × 2 dias = R$ 240. Taxa de plataforma (${feeLabel}) = R$ ${(240 - ex6Net).toFixed(0)}. Você recebe R$ ${ex6Net} via PIX na segunda-feira seguinte à confirmação de devolução.` }
      : s
  )

  const sections = SECTIONS.map(sec =>
    sec.id !== "taxas" ? sec : {
      ...sec,
      faqs: sec.faqs.map(f =>
        f.a === "TAXA_FAQ_PLACEHOLDER"
          ? { ...f, a: `O ShareO cobra ${feeLabel} sobre o valor total da locação — cobrado do locatário. Essa taxa cobre o sistema de pagamento seguro, suporte ao cliente, proteção financeira da plataforma e manutenção do serviço. O valor exato aparece no resumo de pagamento antes de você confirmar. Sem surpresas.` }
          : f
      ),
    }
  )

  const feeTable = buildFeeTable(feeLabel)

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-[#144D81] px-4 py-14 text-center">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 text-5xl" aria-hidden="true">💬</div>
            <h1 className="mb-3 font-display text-3xl font-extrabold text-white md:text-4xl">
              Como podemos ajudar?
            </h1>
            <p className="text-base text-white/75">
              Tudo o que você precisa saber para alugar ou anunciar no ShareO — do zero ao primeiro aluguel.
            </p>
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { href: "#primeiros-passos", label: "🚀 Primeiros passos" },
                { href: "#locatario",        label: "🛒 Quero alugar" },
                { href: "#locador",          label: "📦 Quero anunciar" },
                { href: "#taxas-secao",      label: "🧾 Taxas" },
                { href: "#disputas",         label: "⚖️ Disputas" },
                { href: "#suporte",          label: "🎧 Suporte" },
                { href: "#pagamento",        label: "🔒 Pagamento" },
                { href: "#legal",            label: "📋 Legal e Fiscal" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Primeiros Passos */}
        <section id="primeiros-passos" className="bg-surface px-4 py-16 border-b border-border scroll-mt-20">
          <div className="container mx-auto max-w-5xl">
            <div className="mb-12 text-center">
              <span className="rounded-full bg-brand/10 px-4 py-1 text-xs font-bold text-brand uppercase tracking-wide">
                Novo por aqui?
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-primary">
                Primeiros Passos
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Escolha o seu perfil e siga o guia completo — do cadastro à conclusão do seu primeiro aluguel.
              </p>
            </div>

            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16">
              {/* Locatário — accordion nativo: fechado por padrão para a página não virar uma parede de scroll */}
              <details className="group/guide">
                <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden rounded-xl bg-[#144D81]/8 border border-[#144D81]/20 px-5 py-4 transition-colors hover:bg-[#144D81]/15">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-[#144D81] flex items-center gap-2">
                        <span className="text-2xl" aria-hidden="true">🛒</span>
                        Quero alugar um item
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Do cadastro à devolução — guia em {locatarioSteps.length} passos.
                      </p>
                    </div>
                    <svg className="h-5 w-5 flex-shrink-0 text-[#144D81] transition-transform duration-200 group-open/guide:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </summary>
                <div className="mt-8">
                  {locatarioSteps.map((s, i) => (
                    <div
                      key={s.step}
                      className={i === locatarioSteps.length - 1 ? "[&>div>div:first-child>div:last-child]:hidden" : ""}
                    >
                      <StepItem s={s} />
                    </div>
                  ))}
                </div>
              </details>

              {/* Locador — accordion nativo */}
              <details className="group/guide">
                <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden rounded-xl bg-brand/8 border border-brand/20 px-5 py-4 transition-colors hover:bg-brand/15">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-display text-lg font-bold text-brand flex items-center gap-2">
                        <span className="text-2xl" aria-hidden="true">📦</span>
                        Quero anunciar meus itens
                      </h3>
                      <p className="mt-1 text-sm text-muted-foreground">
                        Do anúncio ao repasse — guia em {locadorSteps.length} passos.
                      </p>
                    </div>
                    <svg className="h-5 w-5 flex-shrink-0 text-brand transition-transform duration-200 group-open/guide:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>
                </summary>
                <div className="mt-8">
                  {locadorSteps.map((s, i) => (
                    <div
                      key={s.step}
                      className={i === locadorSteps.length - 1 ? "[&>div>div:first-child>div:last-child]:hidden" : ""}
                    >
                      <StepItem s={s} />
                    </div>
                  ))}
                </div>
              </details>
            </div>
          </div>
        </section>

        {/* P-5 — Dicas para anfitriões (prometido no protótipo v3b, nav "Anunciar") */}
        <section id="dicas-anfitrioes" className="bg-background px-4 py-16 border-b border-border scroll-mt-20">
          <div className="container mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <span className="rounded-full bg-brand/10 px-4 py-1 text-xs font-bold text-brand uppercase tracking-wide">
                Para proprietários
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-primary">
                Dicas para anfitriões
              </h2>
              <p className="mt-2 text-sm text-muted-foreground max-w-md mx-auto">
                Maximize seus aluguéis: o que separa um anúncio que aluga toda semana de um que ninguém vê.
              </p>
            </div>

            <div className="space-y-3">
              {[
                {
                  emoji: "📸",
                  title: "Fotos vendem — tire 3 boas",
                  body: "Luz natural, fundo limpo e o item inteiro no quadro. A primeira foto é a capa do anúncio: mostre o item em uso ou montado, não dentro da caixa. Itens sem foto nem entram na busca.",
                },
                {
                  emoji: "💰",
                  title: "Precifique pela referência",
                  body: "A diária ideal fica entre 3% e 5% do valor do produto — o formulário sugere automaticamente pela faixa de valor. Ofereça preço semanal e mensal: períodos longos alugam mais e dão menos trabalho de logística.",
                },
                {
                  emoji: "⚡",
                  title: "Responda rápido",
                  body: "Solicitações expiram se você não responder, e quem responde em menos de 1 hora ganha o selo de resposta rápida no perfil. Ative as notificações e use o chat para combinar tudo por escrito.",
                },
                {
                  emoji: "📝",
                  title: "Descreva como se fosse o manual",
                  body: "Marca, modelo, voltagem, o que acompanha (cabos, brocas, manual) e o estado real de conservação. Descrição honesta evita disputa na devolução — e o critério “item como descrito” das avaliações pesa no seu perfil.",
                },
                {
                  emoji: "🤝",
                  title: "Combine retirada e devolução com clareza",
                  body: "Confira o item junto com o locatário na entrega, use o código de retirada e registre fotos do estado. Na devolução, confirme pela plataforma no mesmo dia — o repasse via PIX conta a partir da confirmação.",
                },
                {
                  emoji: "⭐",
                  title: "Avalie sempre",
                  body: "Avaliar o locatário libera a conclusão da locação e constrói sua reputação. Perfis com avaliações e selo de verificação convertem muito mais visitas em reservas.",
                },
              ].map((tip) => (
                <details key={tip.title} className="group/tip rounded-xl border border-border bg-surface px-5 py-4">
                  <summary className="cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden flex items-center justify-between gap-3">
                    <span className="flex items-center gap-3 font-semibold text-foreground">
                      <span className="text-xl" aria-hidden="true">{tip.emoji}</span>
                      {tip.title}
                    </span>
                    <svg className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open/tip:rotate-180" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </summary>
                  <p className="mt-3 text-sm text-muted-foreground">{tip.body}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Tabela de taxas */}
        <section id="taxas-secao" className="bg-background px-4 py-12 border-b border-border scroll-mt-20">
          <div className="container mx-auto max-w-3xl">
            <div className="mb-8 text-center">
              <span className="rounded-full bg-amber-100 px-4 py-1 text-xs font-bold text-amber-700 uppercase tracking-wide">
                Transparência
              </span>
              <h2 className="mt-3 font-display text-2xl font-bold text-primary">
                Taxas e custos da plataforma
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Sem letras miúdas. Veja exatamente o que é cobrado e quando.
              </p>
            </div>
            <div className="overflow-hidden rounded-2xl border border-border shadow-sm">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-primary text-white">
                    <th className="px-5 py-3.5 text-left font-semibold">Item</th>
                    <th className="px-5 py-3.5 text-left font-semibold">Valor</th>
                    <th className="px-5 py-3.5 text-left font-semibold hidden sm:table-cell">Quando</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {feeTable.map((row, i) => (
                    <tr key={i} className="hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-4 font-medium text-primary">{row.label}</td>
                      <td className="px-5 py-4 font-bold text-brand whitespace-nowrap">{row.value}</td>
                      <td className="px-5 py-4 text-muted-foreground hidden sm:table-cell">{row.when}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-4 text-center text-xs text-muted-foreground">
              O repasse via PIX é processado automaticamente pelo sistema — nenhuma ação manual é necessária após a confirmação da devolução.
            </p>
          </div>
        </section>

        {/* Busca + FAQs filtradas — Client Component */}
        <HelpSearch sections={sections} />

      </main>
    </div>
  )
}
