import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"
import { HelpSearch } from "@/components/ajuda/HelpSearch"

export const metadata: Metadata = {
  title: "Central de Ajuda — ShareO",
  description: "Tudo o que você precisa saber para alugar ou anunciar no ShareO. Guia completo para locatários, locadores, taxas, disputas e segurança.",
}

/* ── Dados de conteúdo ──────────────────────────────────────────── */

const HOW_LOCATARIO = [
  { step: 1, icon: "🔍", title: "Encontre o que precisa",   desc: "Procure itens disponíveis perto de você. Veja fotos, preços por dia, semana ou mês e o perfil do proprietário antes de decidir." },
  { step: 2, icon: "📅", title: "Solicite a reserva",        desc: "Escolha a data de retirada e a duração. O app calcula automaticamente a data de devolução e o valor total." },
  { step: 3, icon: "✅", title: "Pague e retire o item",     desc: "Quando o proprietário confirmar, pague com segurança via cartão. Combine a retirada pelo chat do app e aproveite!" },
]

const HOW_LOCADOR = [
  { step: 1, icon: "📸", title: "Crie seu anúncio",          desc: "Adicione fotos, título, descrição e o estado do item. Defina o preço por dia — e, se quiser, por semana e mês com desconto." },
  { step: 2, icon: "🔔", title: "Confirme solicitações",      desc: "Quando alguém solicitar seu item, você recebe uma notificação. Leia a mensagem, aceite e combine a entrega pelo chat." },
  { step: 3, icon: "💰", title: "Receba seu dinheiro",        desc: "O pagamento é liberado depois que você confirma a entrega do item. Tudo protegido pela ShareO." },
]

const FEE_TABLE = [
  { label: "Taxa de serviço (cobrada do locatário)", value: "10% do total", when: "Na confirmação do pagamento" },
  { label: "Anunciar na plataforma (locador)",        value: "Gratuito",    when: "Sempre, sem mensalidade" },
  { label: "Multa por atraso na devolução",           value: "1× preço diário por dia extra", when: "Por cada dia além do prazo" },
  { label: "Caução*",                                  value: "Definida pelo anunciante",      when: "Junto com o pagamento" },
  { label: "Cancelamento com +24h de antecedência",   value: "Gratuito",    when: "Reembolso integral" },
  { label: "Cancelamento com menos de 24h",           value: "30% do valor da locação", when: "Descontado do reembolso" },
]

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
        a: "Combine com o proprietário pelo chat do app onde e quando retirar o item. Na entrega, o proprietário pode registrar fotos do estado do item. Quando tudo estiver certo, ele marca a reserva como 'Ativo' e o período de locação começa." },
      { q: "E se o item não estiver como anunciado?",
        a: "Se houver algum problema, você pode abrir uma disputa na página da reserva enquanto ela estiver ativa ou em até 48 horas após a devolução. Descreva o que aconteceu e a equipe ShareO vai analisar o caso em até 3 dias úteis. Estamos disponíveis 7 dias por semana." },
      { q: "Como avalio o proprietário?",
        a: "Após devolver o item, a opção de avaliação aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário. Avaliações ajudam toda a comunidade ShareO." },
      { q: "O proprietário tem um prazo para confirmar minha reserva?",
        a: "Sim. Após você solicitar uma reserva, o proprietário tem até 24 horas para confirmar ou recusar. Se ele não responder nesse prazo, a reserva é cancelada automaticamente e nenhum valor é cobrado. Você recebe uma notificação assim que isso acontecer e pode buscar outro item disponível." },
      { q: "Posso pedir para estender o prazo de um aluguel que já está em andamento?",
        a: "Sim, enquanto a reserva estiver com status 'Ativo' você pode solicitar uma extensão diretamente na página da reserva. O proprietário precisa aceitar a extensão. Se ele confirmar, o novo período e o valor adicional são calculados automaticamente e o pagamento é processado na hora. Só solicite se ainda tiver o item em mãos e com tempo hábil para o proprietário responder." },
      { q: "O que acontece se eu devolver o item com atraso?",
        a: "Uma taxa de atraso é gerada automaticamente para cada dia extra além da data de devolução combinada. O valor é proporcional ao preço diário do item. Você recebe um aviso no app quando a data de devolução se aproxima. Para evitar cobranças extras, solicite uma extensão antes do prazo vencer — e não depois." },
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
        a: "Você define o preço por dia. Também pode oferecer preço por semana e por mês — normalmente com desconto para incentivar aluguéis mais longos. Se o item tiver valor de mercado conhecido, informe o preço de compra: o app mostra ao locatário quanto ele economiza alugando em vez de comprar." },
      { q: "Como confirmo uma reserva?",
        a: "Quando alguém solicitar seu item, você recebe uma notificação. Em 'Minhas Reservas', clique na aba 'Como locador'. Abra a reserva, leia a mensagem do locatário e clique em 'Confirmar reserva'. Se não quiser aceitar, pode cancelar informando o motivo." },
      { q: "Quando recebo o pagamento?",
        a: "O pagamento é liberado depois que você marca a reserva como 'Ativo', confirmando que entregou o item. Antes disso o valor fica retido com segurança pela ShareO — isso protege você e o locatário." },
      { q: "O que faço na entrega do item?",
        a: "Combine o local e horário de entrega pelo chat. Na hora da entrega, você pode registrar fotos do estado do item (check-in). Quando entregar, clique em 'Marcar como ativo'. Na devolução, registre fotos de check-out para documentar o estado do item ao retornar." },
      { q: "Como cancelo uma reserva?",
        a: "Você pode cancelar enquanto ela estiver 'Aguardando' ou 'Confirmada'. Na página da reserva, clique em 'Cancelar reserva' e informe o motivo. Evite cancelamentos frequentes — eles afetam sua reputação na plataforma." },
      { q: "Meu item está protegido?",
        a: "A ShareO oferece proteção durante a locação. Você pode solicitar uma caução ao criar o anúncio — um valor retido no pagamento e devolvido ao locatário após a devolução sem danos. Se houver problemas, abra uma disputa com as fotos de check-in e check-out como evidência." },
      { q: "Posso pausar meu anúncio temporariamente?",
        a: "Sim. Em 'Meus Anúncios', clique em 'Pausar' no card do item. O anúncio sai da busca e não recebe novas solicitações, mas continua salvo com todas as suas informações, fotos e histórico. Quando quiser voltar a anunciar, clique em 'Reativar'. Use esse recurso quando o item estiver em uso, em manutenção ou você precisar de uma pausa — é melhor do que remover e recriar o anúncio." },
      { q: "Tenho um prazo para confirmar uma solicitação?",
        a: "Sim. Você tem até 24 horas para confirmar ou recusar qualquer solicitação. Se não responder dentro desse prazo, a reserva é cancelada automaticamente. Cancelamentos automáticos por falta de resposta afetam sua reputação na plataforma. Ative as notificações do app para não perder solicitações." },
      { q: "O que acontece se o locatário não devolver o item no prazo?",
        a: "Uma taxa de atraso é gerada automaticamente para cada dia além da data combinada. Você é notificado no app assim que o atraso é registrado. Se o locatário não entrar em contato, use o chat da reserva para cobrar a devolução. Em casos de atraso prolongado ou sem resposta, abra uma disputa na página da reserva para acionar a equipe ShareO." },
      { q: "Como avalio o locatário após a locação?",
        a: "Após a devolução do item, a opção de avaliar o locatário aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário sobre pontualidade, cuidado com o item e comunicação. A avaliação fica visível no perfil do locatário e ajuda outros proprietários a decidir com quem alugar." },
      { q: "Como funciona o check-in e check-out fotográfico?",
        a: "Na entrega do item, use a opção 'Registrar fotos de check-in' na página da reserva. Fotografe o item de todos os ângulos, incluindo possíveis marcas ou desgastes que já existiam antes. Na devolução, registre as fotos de check-out da mesma forma. Essas imagens ficam salvas na reserva e são a principal evidência em caso de disputa por danos. Não pule essa etapa — ela protege você." },
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
        a: "O pagamento segue três etapas: 1) O locatário solicita a reserva. 2) O proprietário confirma. 3) O locatário paga via cartão pelo app. O dinheiro fica retido e só é liberado ao proprietário quando ele confirma que entregou o item. Isso garante segurança para os dois lados." },
      { q: "Meu dinheiro está protegido?",
        a: "Sim. O pagamento não vai direto para o proprietário — ele fica retido na plataforma até a confirmação da entrega. Se algo der errado antes disso, o valor pode ser devolvido. Em caso de disputa, nossa equipe analisa o caso e decide o destino do pagamento." },
      { q: "O que é caução?",
        a: "Caução é um valor adicional cobrado pelo proprietário como garantia. Ele aparece no resumo do pagamento e é cobrado junto com o aluguel. Depois que você devolve o item em bom estado, a caução é devolvida automaticamente no mesmo cartão em até 7 dias úteis. Ela existe para proteger o proprietário caso o item seja danificado." },
      { q: "Como funciona o Stripe?",
        a: "O Stripe é a plataforma de pagamentos que o ShareO usa — a mesma tecnologia usada por grandes empresas no mundo todo. Seus dados de cartão nunca passam pelos servidores do ShareO. Você é redirecionado para a página segura do Stripe ao clicar em 'Pagar agora'." },
      { q: "Quais bandeiras de cartão são aceitas?",
        a: "São aceitos cartões de crédito Visa, Mastercard, Elo e American Express. O parcelamento não está disponível na versão atual — o valor total é cobrado à vista no cartão." },
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
        a: "O ShareO cobra 10% sobre o valor total da locação — cobrado do locatário. Essa taxa cobre o sistema de pagamento seguro, suporte ao cliente, proteção financeira da plataforma e manutenção do serviço. O valor exato aparece no resumo de pagamento antes de você confirmar. Sem surpresas." },
      { q: "Existe algum custo para anunciar?",
        a: "Não. Anunciar no ShareO é 100% gratuito. Você não paga nada para criar anúncios, receber reservas ou usar o chat. O ShareO só cobra comissão (do locatário) quando uma locação é concluída com sucesso. Se a reserva for cancelada antes da entrega, nenhuma taxa é cobrada." },
      { q: "Como funciona a multa por atraso na devolução?",
        a: "Para cada dia além da data combinada, o app registra automaticamente uma cobrança equivalente ao preço diário do item. Exemplo: se o aluguel é R$ 50/dia e você atrasou 2 dias, serão cobrados R$ 100 extras. Você recebe uma notificação de aviso 1 dia antes do prazo vencer. Para evitar multa, solicite uma extensão antes do prazo — e não depois." },
      { q: "Quando a caução é cobrada e quando é devolvida?",
        a: "A caução é definida pelo proprietário (pode ser R$ 0) e cobrada junto com o aluguel. Após a devolução do item em bom estado, o proprietário confirma a ausência de danos e a caução é devolvida automaticamente no mesmo cartão em até 7 dias úteis. Se houver dano, o proprietário pode reter parte ou todo o valor — a equipe ShareO medeia em caso de desacordo." },
      { q: "Existe taxa de cancelamento?",
        a: "O cancelamento é gratuito se feito com mais de 24 horas de antecedência em relação à data de retirada. Cancelamentos com menos de 24 horas de antecedência geram uma taxa de 30% do valor total para cobrir custos operacionais. Proprietários que cancelam com frequência podem ter as contas suspensas temporariamente." },
      { q: "Recebo nota fiscal das transações?",
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
      { q: "O que acontece com a caução em caso de dano?",
        a: "Se houver dano comprovado, o proprietário informa o valor do prejuízo com orçamento de reparo. A caução pode ser parcialmente ou totalmente retida para cobrir os custos. Se o prejuízo for maior que a caução, o locatário é notificado para complementar o pagamento. A equipe ShareO medeia o processo em caso de desacordo entre as partes." },
      { q: "O que acontece se meu item for roubado ou desaparecer?",
        a: "Em caso de furto ou desaparecimento durante a locação, abra imediatamente uma disputa na plataforma e registre um boletim de ocorrência (BO). Envie o BO como evidência na disputa. A ShareO analisa o caso e aciona os mecanismos de proteção disponíveis. Para maior cobertura, contrate um seguro externo para itens de alto valor antes de anunciar." },
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
        a: "Acesse 'Meu Perfil' e role até 'Privacidade e dados'. Lá você encontra a opção de verificação de identidade. Envie os documentos solicitados (CPF e foto com o documento). Quando aprovada, um selo de verificado aparece no seu perfil — aumentando a confiança de outros usuários. O processo leva até 24 horas úteis." },
      { q: "Como edito meu perfil?",
        a: "Vá em 'Meu Perfil'. Você pode atualizar nome, bio, telefone, cidade, bairro e foto de perfil. Manter seu perfil completo ajuda outros usuários a confiar mais em você." },
      { q: "Como me torno PJ Premium?",
        a: "No seu perfil, encontre o bloco de upgrade para Pessoa Jurídica (PJ). Como PJ, você ganha uma vitrine personalizada com link próprio, acesso a analytics avançado dos seus anúncios e recursos para importar itens em massa — ideal para quem aluga profissionalmente." },
      { q: "O que é a Vitrine PJ e como ela funciona?",
        a: "A Vitrine PJ é uma página personalizada para locadores pessoa jurídica, acessível pelo link shareo.com.br/loja/[seu-slug]. Ela reúne todos os seus itens ativos em um layout de loja, com logo, descrição do negócio e avaliação geral. Você pode compartilhar esse link com clientes, redes sociais ou materiais de divulgação. Para ativar, faça o upgrade para PJ Premium no seu perfil e configure seu slug único." },
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
        a: "Rendimentos de aluguel de bens móveis são tributáveis e devem ser declarados como 'Rendimentos Tributáveis Recebidos de Pessoa Física ou Jurídica' na declaração anual do IR. O ShareO fornece um relatório anual de rendimentos em 'Meu Perfil > Histórico financeiro' com o resumo de todos os valores recebidos. Consulte seu contador para orientações sobre alíquotas e deduções específicas para o seu caso." },
      { q: "Quais as regras para empresas (PJ) anunciarem na plataforma?",
        a: "Pessoas jurídicas podem usar o ShareO com o plano PJ Premium. As regras incluem: CNPJ ativo e regular; emissão de nota fiscal para todas as locações (conforme legislação vigente); cumprimento das regras do CDC (Código de Defesa do Consumidor) na relação com locatários. PJs têm acesso a ferramentas avançadas como importação em massa, analytics e vitrine personalizada." },
      { q: "Meus dados estão protegidos? Como funciona a LGPD no ShareO?",
        a: "O ShareO segue integralmente a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018). Coletamos apenas os dados estritamente necessários para o funcionamento da plataforma. Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento em 'Meu Perfil > Privacidade e dados'. Nunca compartilhamos seus dados com terceiros sem sua autorização explícita." },
      { q: "O ShareO é regulamentado?",
        a: "O ShareO opera como marketplace de locação de bens móveis, seguindo as normas do Código Civil, CDC e LGPD. As transações são processadas via Stripe, que opera sob regulamentação do Banco Central e das normas PCI-DSS para segurança de cartões. Para dúvidas jurídicas específicas sobre suas transações, consulte um advogado especializado em direito digital ou relações de consumo." },
    ],
  },
]

/* ── Página ─────────────────────────────────────────────────────── */
export default function AjudaPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        {/* Hero estático — Server Component puro */}
        <section className="bg-gradient-to-br from-primary to-[#144D81] px-4 py-14 text-center">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 text-5xl" aria-hidden="true">💬</div>
            <h1 className="mb-3 font-display text-3xl font-extrabold text-white md:text-4xl">
              Como podemos ajudar?
            </h1>
            <p className="text-base text-white/75">
              Tudo o que você precisa saber para alugar ou anunciar no ShareO.
            </p>
            {/* Navegação rápida por âncora */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { href: "#locatario", label: "🛒 Quero alugar" },
                { href: "#locador",   label: "📦 Quero anunciar" },
                { href: "#taxas",     label: "🧾 Taxas" },
                { href: "#disputas",  label: "⚖️ Disputas" },
                { href: "#suporte",   label: "🎧 Suporte" },
                { href: "#pagamento", label: "🔒 Pagamento" },
                { href: "#conta",     label: "👤 Minha conta" },
                { href: "#legal",     label: "📋 Legal e Fiscal" },
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

        {/* Como funciona */}
        <section className="bg-surface py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-10 font-display text-center text-2xl font-bold text-primary">
              Como funciona o ShareO?
            </h2>
            <div className="grid gap-10 md:grid-cols-2">
              {/* Locatário */}
              <div>
                <h3 className="mb-5 font-display flex items-center gap-2 text-lg font-bold text-primary">
                  <span className="rounded-full bg-[#144D81]/10 px-3 py-1 text-sm text-[#144D81]">Para quem aluga</span>
                </h3>
                <div className="space-y-5">
                  {HOW_LOCATARIO.map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white font-bold text-sm">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{s.icon} {s.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Locador */}
              <div>
                <h3 className="mb-5 font-display flex items-center gap-2 text-lg font-bold text-primary">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">Para quem anuncia</span>
                </h3>
                <div className="space-y-5">
                  {HOW_LOCADOR.map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white font-bold text-sm">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{s.icon} {s.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Tabela de taxas — transparência financeira */}
        <section className="bg-background px-4 py-12 border-t border-border">
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
                  {FEE_TABLE.map((row, i) => (
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
              * A caução é definida pelo proprietário em cada anúncio (pode ser R$ 0). Verifique o valor antes de confirmar a reserva.
            </p>
          </div>
        </section>

        {/* Busca + FAQs filtradas — Client Component */}
        <HelpSearch sections={SECTIONS} />

      </main>
    </div>
  )
}
