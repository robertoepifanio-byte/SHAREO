// apps/mobile/app/ajuda.tsx
// Fonte: app/ajuda/page.tsx — Central de Ajuda
// Gerado por transcrição 1:1 do site para React Native / Expo.

import React, { useState, useEffect, useRef, useCallback, useMemo } from "react"
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Linking,
  Platform,
} from "react-native"
import { router, useLocalSearchParams } from "expo-router"
import Svg, { Path } from "react-native-svg"
import { useTheme, type Tokens } from "@/lib/theme"
import { ScreenHeader } from "@/components/layout/ScreenHeader"
import { API_URL } from "@/lib/api"

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Step {
  step:     number
  icon:     string
  title:    string
  desc:     string
  tip?:     string
  example?: string
  warning?: string
}

interface FaqItem {
  q: string
  a: string
}

/**
 * Números publicados da plataforma, lidos de /api/platform-config/public.
 * Espelha o `HelpVars` do site (app/ajuda/page.tsx) para que a transcrição
 * possa usar as mesmas variáveis em vez de valores cravados no texto.
 */
export interface PublicConfig {
  feeRateBps:        number
  payoutWindowDays:  number
  checkoutMaxCents:  number
  ownerHours:        number
  lateFeeMultiplier: number
  cancel: {
    fullRefundHours:    number
    partialRefundHours: number
    partialPercent:     number
    latePercent:        number
  }
}

/** Defaults idênticos aos de lib/platform-config.ts — valem só até o fetch voltar. */
export const DEFAULT_CONFIG: PublicConfig = {
  feeRateBps:        1500,
  payoutWindowDays:  3,
  checkoutMaxCents:  50_000,
  ownerHours:        48,
  lateFeeMultiplier: 1.5,
  cancel: { fullRefundHours: 24, partialRefundHours: 6, partialPercent: 70, latePercent: 50 },
}

/**
 * Variáveis de conteúdo da Ajuda — espelha o `HelpVars` de app/ajuda/page.tsx.
 *
 * Montado UMA vez e passado aos builders, como o site faz. A primeira versão
 * desta tela tinha três formas de derivar o mesmo rótulo (helper de módulo,
 * variável local do componente e interpolação inline no texto) — e as três
 * chegaram a divergir.
 */
interface HelpVars extends PublicConfig {
  feeLabel:      string // "15%"
  maxLabel:      string // "R$ 500"
  payoutLabel:   string // "3 dias"
  lateMultLabel: string // "1,5×"
}

export function toHelpVars(cfg: PublicConfig): HelpVars {
  const pct = cfg.feeRateBps / 100
  return {
    ...cfg,
    feeLabel:      `${pct % 1 === 0 ? pct.toFixed(0) : String(pct)}%`,
    maxLabel:      `R$ ${Math.round(cfg.checkoutMaxCents / 100)}`,
    payoutLabel:   cfg.payoutWindowDays === 1 ? "1 dia" : `${cfg.payoutWindowDays} dias`,
    lateMultLabel: `${String(cfg.lateFeeMultiplier).replace(".", ",")}×`,
  }
}

/** Split do exemplo, em centavos — mesma conta do checkout (calcSplit do site). */
function splitExemplo(totalCents: number, feeRateBps: number) {
  const fee = Math.round((totalCents * feeRateBps) / 10000)
  return { fee, net: totalCents - fee }
}

const brl = (cents: number) =>
  `R$ ${(cents / 100).toFixed(2).replace(".", ",")}`

interface Section {
  id:    string
  title: string
  icon:  string
  faqs:  FaqItem[]
}

// ── Dados — Primeiros Passos (verbatim de app/ajuda/page.tsx) ─────────────────

export function buildLocatarioSteps(v: HelpVars): Step[] { return [
  {
    step: 1, icon: "📧", title: "Criar sua conta",
    desc: "Acesse shareo.com.br e clique em 'Criar conta'. Informe nome, email e uma senha segura. Confirme o email pelo link enviado para sua caixa de entrada — verifique também a pasta de spam.",
    tip: "Você pode navegar pelos anúncios sem cadastro. A conta só é necessária para solicitar reservas.",
  },
  {
    step: 2, icon: "🪪", title: "Verificar sua identidade",
    desc: "Acesse Meu Perfil → Documentos → Verificar identidade. Informe seu CPF, envie uma foto do documento e uma selfie (dois campos separados no formulário). A análise leva até 24 horas úteis. Após aprovada, o selo 'Verificado' aparece no seu perfil.",
    warning: "Reservas de alto valor exigem verificação completa. Proprietários tendem a aceitar mais rapidamente locatários verificados.",
  },
  {
    step: 3, icon: "🔍", title: "Buscar o equipamento",
    desc: "Use a barra de busca na tela inicial ou acesse 'Explorar'. Filtre por categoria, cidade e faixa de preço. Cada anúncio mostra fotos, avaliações do proprietário, localização (bairro/cidade) e o preço por dia, semana ou mês.",
    tip: "O ShareO mostra a diferença entre alugar e comprar novo — útil para tomar a decisão certa.",
  },
  {
    step: 4, icon: "📅", title: "Solicitar a reserva",
    desc: `Abra o anúncio e use a calculadora de locação. Selecione a modalidade (diário, semanal ou mensal), a data de retirada e a duração. O valor total — incluindo a taxa de serviço — aparece antes de você confirmar. Escreva uma mensagem apresentando-se ao proprietário e clique em 'Solicitar locação'. Você ainda não paga nada nesta etapa. O valor máximo por locação é ${v.maxLabel}.`,
    example: `Item: R$ 80/dia. Aluguel de 3 dias = ${brl(24000)}. Taxa de serviço (${v.feeLabel}) = ${brl(splitExemplo(24000, v.feeRateBps).fee)}. Total cobrado ao confirmar: ${brl(24000 + splitExemplo(24000, v.feeRateBps).fee)}.`,
  },
  {
    step: 5, icon: "💳", title: "Aguardar confirmação e pagar",
    desc: `O proprietário tem até ${v.ownerHours} horas para confirmar ou recusar. Se ele confirmar, você recebe uma notificação e pode clicar em 'Pagar agora'. O pagamento é processado pela Stripe, o provedor de pagamentos do ShareO: você é direcionado para o ambiente seguro da Stripe para informar os dados do cartão, que nunca passam pelos servidores do ShareO. Nesta versão o checkout aceita cartão de crédito à vista — sem parcelamento. O valor máximo por locação é ${v.maxLabel}. O valor pago não vai direto ao proprietário: fica retido até a confirmação da devolução do item.`,
    tip: `Se o proprietário não responder em ${v.ownerHours}h, a reserva é cancelada automaticamente e nenhum valor é cobrado.`,
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
] }

export function buildLocadorSteps(v: HelpVars): Step[] { return [
  {
    step: 1, icon: "📧", title: "Criar conta e verificar identidade",
    desc: "Acesse shareo.com.br e clique em 'Criar conta'. Após confirmar o email, vá em Meu Perfil → Documentos → Verificar identidade. Informe CPF (pessoa física) ou CNPJ (empresa). O processo leva até 24 horas úteis.",
    tip: "Anunciantes verificados recebem muito mais solicitações. O selo 'Verificado' é o principal fator de confiança para novos locatários.",
  },
  {
    step: 2, icon: "📸", title: "Criar seu primeiro anúncio",
    desc: "Clique em 'Anunciar' no menu. Adicione pelo menos 3 fotos nítidas em boa iluminação, de diferentes ângulos. Preencha: título claro e descritivo, categoria, estado de conservação (novo, seminovo, bom estado ou regular) e uma descrição detalhada mencionando dimensões, capacidade e cuidados necessários. Defina o preço por dia (obrigatório), e opcionalmente por semana e mês com desconto. Publique — o anúncio aparece na busca em minutos.",
    example: "Anúncio: 'Tenda Gazebo 3×3m branca para festas'. Preço: R$ 120/dia, R$ 360/semana (3× diária), R$ 1.800/mês (15× diária). Categoria: Festas e Eventos. Estado: Bom estado.",
  },
  {
    step: 3, icon: "💳", title: "Cadastrar seus dados de recebimento",
    desc: "Antes de receber qualquer pagamento, abra Meu Perfil → Recebimentos. O caminho automático é 'Cadastrar dados bancários' pela Stripe, o provedor de pagamentos do ShareO: a Stripe verifica seus dados e deposita o repasse direto na conta bancária informada, sem intervenção manual. Enquanto esse cadastro não estiver concluído, o repasse é executado manualmente pela equipe ShareO na chave PIX que você cadastrar na mesma tela — o que leva mais tempo.",
    tip: "Faça isso antes de publicar o primeiro anúncio para não atrasar nenhum recebimento.",
  },
  {
    step: 4, icon: "🔔", title: "Gerenciar solicitações de reserva",
    desc: `Você tem até ${v.ownerHours} horas para confirmar ou recusar cada solicitação. Ative as notificações do app para não perder pedidos. Leia a mensagem do locatário, analise o perfil dele (verificado? avaliações?) e use o chat para combinar detalhes antes de confirmar. Ao confirmar, o locatário recebe a notificação para pagar.`,
    warning: "Cancelamentos frequentes reduzem sua visibilidade na busca e prejudicam sua reputação. Só recuse se realmente necessário — e sempre informe o motivo ao locatário.",
  },
  {
    step: 5, icon: "📷", title: "Entregar o item e registrar o check-in",
    desc: "Combine local e horário de entrega pelo chat da reserva. Na hora da entrega, use a opção 'Registrar fotos de check-in' na página da reserva — fotografe todos os ângulos do item, incluindo marcas e desgastes já existentes. Após a entrega física, clique em 'Marcar como ativo' no app. A locação entra em andamento; o valor pago pelo locatário fica retido e só entra na fila de repasse após a confirmação da devolução.",
    warning: "Sem fotos de check-in, você perde proteção em disputas por danos. Nunca pule essa etapa, mesmo que o locatário pareça confiável.",
  },
  {
    step: 6, icon: "💰", title: "Receber a devolução e o pagamento",
    desc: `No horário combinado (mesmo horário da retirada), receba o item de volta. Use a opção 'Registrar fotos de check-out' e compare com as fotos do check-in. Se tudo estiver ok, confirme a devolução. O valor líquido entra na fila de repasse e fica disponível ${v.payoutLabel} depois. Avalie o locatário após cada devolução.`,
    example: `Locação: R$ 120/dia × 2 dias = ${brl(24000)}. Taxa de plataforma (${v.feeLabel}) = ${brl(splitExemplo(24000, v.feeRateBps).fee)}. Você recebe ${brl(splitExemplo(24000, v.feeRateBps).net)}, ${v.payoutLabel} após a confirmação da devolução.`,
    tip: "Quanto mais avaliações positivas você tiver, mais alto o seu anúncio aparece nos resultados de busca.",
  },
  {
    step: 7, icon: "✅", title: "Confirme o recebimento",
    desc: `Após o locatário devolver, toque em 'Confirmar recebimento' e informe o estado do item. O valor líquido entra na fila de repasse e é liberado ${v.payoutLabel} depois — automaticamente pela Stripe, se você já cadastrou seus dados bancários em Meu Perfil → Recebimentos; caso contrário, por repasse manual da equipe ShareO na sua chave PIX.`,
    warning: "Se o item voltar danificado, selecione 'Danificado'. Uma disputa será aberta automaticamente e o repasse fica suspenso até a resolução.",
  },
] }

// ── Dados — Dicas para Anfitriões (verbatim de app/ajuda/page.tsx) ─────────────

const DICAS = [
  {
    id:    "fotos",
    emoji: "📸",
    title: "Fotos vendem — tire 3 boas",
    body:  "Luz natural, fundo limpo e o item inteiro no quadro. A primeira foto é a capa do anúncio: mostre o item em uso ou montado, não dentro da caixa. Itens sem foto nem entram na busca.",
  },
  {
    id:    "preco",
    emoji: "💰",
    title: "Precifique pela referência",
    body:  "A diária ideal fica entre 3% e 5% do valor do produto — o formulário sugere automaticamente pela faixa de valor. Ofereça preço semanal e mensal: períodos longos alugam mais e dão menos trabalho de logística.",
  },
  {
    id:    "rapido",
    emoji: "⚡",
    title: "Responda rápido",
    body:  "Solicitações expiram se você não responder, e quem responde em menos de 1 hora ganha o selo de resposta rápida no perfil. Ative as notificações e use o chat para combinar tudo por escrito.",
  },
  {
    id:    "descricao",
    emoji: "📝",
    title: "Descreva como se fosse o manual",
    body:  "Marca, modelo, voltagem, o que acompanha (cabos, brocas, manual) e o estado real de conservação. Descrição honesta evita disputa na devolução — e o critério \"item como descrito\" das avaliações pesa no seu perfil.",
  },
  {
    id:    "retirada",
    emoji: "🤝",
    title: "Combine retirada e devolução com clareza",
    body:  "Confira o item junto com o locatário na entrega, use o código de retirada e registre fotos do estado. Na devolução, confirme pela plataforma no mesmo dia.",
  },
  {
    id:    "avalie",
    emoji: "⭐",
    title: "Avalie sempre",
    body:  "Avaliar o locatário libera a conclusão da locação e constrói sua reputação. Perfis com avaliações e selo de verificação convertem muito mais visitas em reservas.",
  },
]

// ── Dados — FAQ Sections (verbatim de app/ajuda/page.tsx) ─────────────────────

export function buildSections(v: HelpVars): Section[] { return [
  {
    id: "locatario",
    title: "Para quem quer alugar",
    icon: "🛒",
    faqs: [
      { q: "Como encontro um item perto de mim?",
        a: "Acesse 'Explorar' e navegue pelos anúncios disponíveis. Cada item mostra o bairro e a cidade do proprietário, para você saber onde o item está antes de solicitar." },
      { q: "Como faço uma reserva?",
        a: "Abra a página do item e use a calculadora de locação. Escolha a modalidade (diário, semanal ou mensal), selecione a data de retirada e o número de dias. A data de devolução e o valor total aparecem automaticamente. Se quiser, escreva uma mensagem ao proprietário e clique em 'Solicitar locação'." },
      { q: "Como funciona o pagamento?",
        a: "Só é possível pagar depois que o proprietário confirmar a reserva. Quando ele aceitar, você recebe o aviso e pode clicar em 'Pagar agora'. O pagamento é processado pela Stripe, o provedor de pagamentos do ShareO, e nesta versão aceita cartão de crédito à vista (sem parcelamento). O valor pago fica retido e só é repassado ao proprietário depois da confirmação da devolução do item." },
      { q: "Posso cancelar uma reserva?",
        a: `Sim. Enquanto a reserva estiver 'Aguardando' ou 'Confirmada', você pode cancelar na página da reserva. Cancelando até ${v.cancel.fullRefundHours} horas antes da retirada, o reembolso é integral; entre ${v.cancel.fullRefundHours}h e ${v.cancel.partialRefundHours}h antes, o reembolso é de ${v.cancel.partialPercent}%; com menos de ${v.cancel.partialRefundHours}h, de ${v.cancel.latePercent}%.` },
      { q: "O que acontece na retirada do item?",
        a: "Combine com o proprietário pelo chat do app onde e quando retirar o item. Na entrega, o proprietário registra fotos do estado do item (check-in) e marca a reserva como 'Ativo'. O período de locação começa a contar a partir desse momento — o prazo de devolução é no mesmo horário, N dias depois. Exemplo: retirada em 10/10 às 10h → devolução até 11/10 às 10h (1 dia)." },
      { q: "E se o item não estiver como anunciado?",
        a: "Se houver algum problema, você pode abrir uma disputa na página da reserva enquanto ela estiver ativa ou em até 48 horas após a devolução. Descreva o que aconteceu e a equipe ShareO vai analisar o caso em até 3 dias úteis. Nosso atendimento é de segunda a sexta, das 09h às 17h." },
      { q: "Como avalio o proprietário?",
        a: "Após devolver o item, a opção de avaliação aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário. Avaliações ajudam toda a comunidade ShareO." },
      { q: "O proprietário tem um prazo para confirmar minha reserva?",
        a: `Sim. Após você solicitar uma reserva, o proprietário tem até ${v.ownerHours} horas para confirmar ou recusar. Se ele não responder nesse prazo, a reserva é cancelada automaticamente e nenhum valor é cobrado. Você recebe uma notificação assim que isso acontecer e pode buscar outro item disponível.` },
      { q: "Posso pedir para estender o prazo de um aluguel que já está em andamento?",
        a: "Sim, enquanto a reserva estiver com status 'Ativo' você pode solicitar uma extensão diretamente na página da reserva. O proprietário precisa aceitar. Se a reserva já estiver paga, aceitar não muda o prazo sozinho: aparece uma cobrança das diárias extras — o preço diário do item pelos dias a mais — e a data de devolução só muda depois que esse pagamento é confirmado. Se a reserva ainda não tiver sido paga, a extensão entra na hora e o valor já vai junto no pagamento da locação. Nos dois casos o pagamento é feito no site. Só solicite se ainda tiver o item em mãos e com tempo hábil para o proprietário responder." },
      { q: "O que acontece se eu devolver o item com atraso?",
        a: `O prazo de devolução é calculado a partir do horário exato de retirada confirmada — se você retirou às 10h, deve devolver até às 10h do último dia. Passado esse prazo, é gerada automaticamente uma taxa de atraso de ${v.lateMultLabel} o preço diário do item por dia de atraso, enviada para o seu e-mail como link de pagamento. Você recebe um aviso no app 24h antes do vencimento. Para evitar cobranças extras, solicite uma extensão antes do prazo vencer — nunca depois.` },
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
    faqs: [
      { q: "Como anuncio meu item?",
        a: "Vá em 'Anunciar' no app. Preencha o título, descrição, categoria, estado de conservação (novo, seminovo, bom estado ou regular) e adicione fotos. Informe seu bairro e cidade para que locatários saibam onde o item está. Depois defina o preço e publique." },
      { q: "Como defino o preço?",
        a: "Você define o preço por dia. Uma sugestão de referência: diária = 3–5% do valor do bem; semanal = 3× a diária; mensal = 15× a diária. O formulário de anúncio tem um botão 'Calcular' que aplica esses valores automaticamente. Também pode oferecer preço por semana e por mês com desconto diferente, para incentivar aluguéis mais longos. Se o item tiver valor de mercado conhecido, informe o preço de compra: o app mostra ao locatário quanto ele economiza alugando em vez de comprar." },
      { q: "Como confirmo uma reserva?",
        a: "Quando alguém solicitar seu item, você recebe uma notificação. Em 'Minhas Reservas', clique na aba 'Como locador'. Abra a reserva, leia a mensagem do locatário e clique em 'Confirmar reserva'. Se não quiser aceitar, pode cancelar informando o motivo." },
      { q: "Quando recebo o pagamento?",
        a: `Após você confirmar o recebimento do item devolvido, o valor líquido (aluguel menos a taxa da plataforma) entra na fila de repasse e fica disponível ${v.payoutLabel} depois. Se você já cadastrou seus dados bancários pela Stripe em Meu Perfil → Recebimentos, o repasse é automático. Se ainda não cadastrou, a equipe ShareO executa o repasse manualmente na chave PIX cadastrada, o que pode levar mais tempo.` },
      { q: "O que faço na entrega do item?",
        a: "Combine o local e horário de entrega pelo chat. Na hora da entrega, você pode registrar fotos do estado do item (check-in). Quando entregar, clique em 'Marcar como ativo'. Na devolução, registre fotos de check-out para documentar o estado do item ao retornar." },
      { q: "Como cancelo uma reserva?",
        a: "Você pode cancelar enquanto ela estiver 'Aguardando' ou 'Confirmada'. Na página da reserva, clique em 'Cancelar reserva' e informe o motivo. Evite cancelamentos frequentes — eles afetam sua reputação na plataforma." },
      { q: "Meu item está protegido?",
        a: `A ShareO oferece proteção durante a locação via fotos de check-in e check-out vinculadas à reserva. O valor pago pelo locatário fica retido até ${v.payoutLabel} após a confirmação da devolução, o que protege ambas as partes contra contestações. Em caso de danos, abra uma disputa com as fotos como evidência — o repasse fica suspenso até a resolução.` },
      { q: "Posso pausar meu anúncio temporariamente?",
        a: "Sim. Em 'Meus Anúncios', clique em 'Pausar' no card do item. O anúncio sai da busca e não recebe novas solicitações, mas continua salvo com todas as suas informações, fotos e histórico. Quando quiser voltar a anunciar, clique em 'Reativar'. Use esse recurso quando o item estiver em uso, em manutenção ou você precisar de uma pausa — é melhor do que remover e recriar o anúncio." },
      { q: "Tenho um prazo para confirmar uma solicitação?",
        a: `Sim. Você tem até ${v.ownerHours} horas para confirmar ou recusar qualquer solicitação. Se não responder dentro desse prazo, a reserva é cancelada automaticamente. Cancelamentos automáticos por falta de resposta afetam sua reputação na plataforma. Ative as notificações do app para não perder solicitações.` },
      { q: "O que acontece se o locatário não devolver o item no prazo?",
        a: `O prazo de devolução é o mesmo horário da retirada, N dias depois — por exemplo, retirou às 14h, deve devolver até às 14h do último dia. Se o locatário não devolver no prazo, uma taxa de ${v.lateMultLabel} a diária por dia de atraso é gerada automaticamente e cobrada dele por link de pagamento. Você é notificado no app assim que o atraso é registrado. Se o locatário não entrar em contato, use o chat da reserva para cobrar a devolução. Em casos de atraso prolongado ou sem resposta, abra uma disputa na página da reserva para acionar a equipe ShareO.` },
      { q: "Como avalio o locatário após a locação?",
        a: "Após a devolução do item, a opção de avaliar o locatário aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário sobre pontualidade, cuidado com o item e comunicação. A avaliação fica visível no perfil do locatário e ajuda outros proprietários a decidir com quem alugar." },
      { q: "Como funciona o check-in e check-out fotográfico?",
        a: "Na entrega do item, use a opção 'Registrar fotos de check-in' na página da reserva. Fotografe o item de todos os ângulos, incluindo possíveis marcas ou desgastes que já existiam antes. Na devolução, registre as fotos de check-out da mesma forma. Essas imagens ficam salvas na reserva e são a principal evidência em caso de disputa por danos. Não pule essa etapa — ela protege você." },
      { q: "Quando recebo o pagamento da locação?",
        a: `Após confirmar o recebimento do item, o valor líquido entra na fila de repasse e fica elegível ${v.payoutLabel} depois — essa janela existe para cobrir o prazo de abertura de disputa. A partir daí o repasse é processado diariamente: automático pela Stripe se você cadastrou seus dados bancários em Meu Perfil → Recebimentos, ou manual pela equipe ShareO na sua chave PIX, se ainda não cadastrou.` },
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
    faqs: [
      { q: "Como o pagamento funciona no ShareO?",
        a: `O pagamento segue quatro etapas: 1) O locatário solicita a reserva. 2) O proprietário confirma. 3) O locatário paga pelo Checkout da Stripe, o provedor de pagamentos do ShareO — o valor fica retido, não vai direto ao proprietário. 4) Depois da devolução confirmada, o valor líquido fica elegível para repasse ${v.payoutLabel} depois, já com a taxa de serviço de ${v.feeLabel} descontada. Essa retenção garante segurança para os dois lados: é a janela em que uma disputa ainda pode ser aberta.` },
      { q: "Meu dinheiro está protegido?",
        a: "Sim. O pagamento não vai diretamente ao proprietário no ato do pagamento — o valor fica retido até a devolução ser confirmada e a janela de disputa se encerrar. Se algo der errado antes disso, o valor pode ser reembolsado conforme a política de cancelamento. Em caso de disputa, o repasse é suspenso e a equipe ShareO analisa o caso antes de qualquer liberação." },
      { q: "Como os proprietários recebem o pagamento?",
        a: `O caminho recomendado é cadastrar os dados bancários pela Stripe em Meu Perfil → Recebimentos: a partir daí o valor líquido (aluguel menos a taxa da plataforma) é depositado automaticamente na conta bancária cadastrada, ${v.payoutLabel} após a confirmação da devolução. Proprietários que ainda não fizeram esse cadastro recebem por repasse manual da equipe ShareO na chave PIX informada na mesma tela — mesma janela de ${v.payoutLabel}, mas sem automação.` },
      { q: "Como funciona o pagamento do locatário?",
        a: "O locatário paga pelo Checkout hospedado da Stripe, provedor de pagamentos usado por milhões de empresas no mundo. O pagamento é processado no ambiente da Stripe; seus dados de cartão nunca passam pelos servidores do ShareO. O valor é cobrado à vista. Após o pagamento, o valor fica retido até a confirmação da devolução." },
      { q: "Quais formas de pagamento são aceitas?",
        a: `Nesta versão, o checkout aceita cartão de crédito à vista — sem parcelamento. O valor máximo por locação é ${v.maxLabel}. As bandeiras disponíveis são exibidas no próprio Checkout da Stripe no momento do pagamento.` },
      { q: "Existe caução no ShareO?",
        a: "A caução ainda não está disponível nesta versão do ShareO. A proteção ao proprietário é feita via fotos de check-in e check-out vinculadas à reserva e pelo canal de disputas, onde a equipe ShareO medeia casos de danos. A caução estará disponível em uma versão futura da plataforma." },
      { q: "Como funciona a verificação de identidade?",
        a: "Para criar uma conta e fazer reservas, você precisa confirmar seu email. Para desbloquear reservas de alto valor e acessar recursos avançados, a verificação de CPF é solicitada. O documento é criptografado e armazenado com segurança — nunca aparece em tela ou logs. O selo 'Verificado' no seu perfil aumenta a confiança de outros usuários." },
      { q: "Como a ShareO protege contra fraudes?",
        a: "Usamos múltiplas camadas de proteção: verificação de identidade (CPF/CNPJ), a análise antifraude da Stripe integrada ao fluxo de pagamento, limite de tentativas de pagamento e monitoramento de comportamento suspeito. Contas com padrões anômalos são sinalizadas para revisão manual antes de qualquer transação ser concluída." },
    ],
  },
  {
    id: "taxas",
    title: "Taxas e Custos",
    icon: "🧾",
    faqs: [
      { q: "Qual é a taxa de serviço do ShareO?",
        a: `O ShareO cobra ${v.feeLabel} sobre o valor total da locação — cobrado do locatário. Essa taxa cobre o sistema de pagamento seguro, suporte ao cliente, proteção financeira da plataforma e manutenção do serviço. O valor exato aparece no resumo de pagamento antes de você confirmar. Sem surpresas.` },
      { q: "Existe algum custo para anunciar?",
        a: "Não. Anunciar no ShareO é 100% gratuito. Você não paga nada para criar anúncios, receber reservas ou usar o chat. O ShareO só cobra a taxa de serviço (do locatário) quando uma locação é concluída com sucesso. Se a reserva for cancelada antes da entrega, nenhuma taxa é cobrada." },
      { q: "Como funciona a multa por atraso na devolução?",
        a: `Passado o prazo combinado, o app gera automaticamente uma cobrança de ${v.lateMultLabel} o preço diário do item por dia de atraso, enviada ao locatário por e-mail como link de pagamento. Exemplo: se o aluguel é R$ 50/dia e o atraso foi de 2 dias, a taxa é de ${brl(Math.round(5000 * v.lateFeeMultiplier * 2))}. Você recebe uma notificação de aviso 1 dia antes do prazo vencer. Para evitar a taxa, solicite uma extensão antes do prazo — e não depois.` },
      { q: "Existe limite no valor do bem anunciado?",
        // ⚠️ O site é deliberadamente mais fraco aqui: o limite NÃO é validado em
        // código (lib/validations/items.ts só exige estimatedRetailPrice >= 0).
        // A versão anterior afirmava um bloqueio que não existe.
        a: "Sim. Nesta primeira fase, a plataforma se destina a itens com valor estimado de até R$ 1.000. Esse limite existe para adequar o perfil de risco dos aluguéis enquanto a plataforma está em fase inicial, e anúncios acima dele podem ser removidos na moderação. Itens de maior valor estarão disponíveis em versões futuras." },
      { q: "Existe taxa de cancelamento?",
        a: `O reembolso depende da antecedência em relação à data de retirada: até ${v.cancel.fullRefundHours}h antes, reembolso integral; entre ${v.cancel.fullRefundHours}h e ${v.cancel.partialRefundHours}h antes, ${v.cancel.partialPercent}% do valor pago; com menos de ${v.cancel.partialRefundHours}h, ${v.cancel.latePercent}%. A retenção cobre custos operacionais já incorridos. Cancelamentos pelo proprietário devolvem o valor integral ao locatário, e quem cancela com frequência pode ter a conta suspensa temporariamente.` },
      { q: "Recebo comprovante das transações?",
        a: "Sim. O ShareO emite comprovante eletrônico para todas as transações concluídas na plataforma. O comprovante é enviado automaticamente para o email cadastrado após o encerramento da reserva. Você também pode acessar o histórico completo em 'Meu Perfil > Meus repasses'." },
    ],
  },
  {
    id: "disputas",
    title: "Disputas e Proteção",
    icon: "⚖️",
    faqs: [
      { q: "Quando posso abrir uma disputa?",
        a: "Você pode abrir uma disputa enquanto a reserva estiver com status 'Ativo' ou em até 48 horas após a devolução do item. Após esse prazo, a reserva é encerrada e o pagamento liberado automaticamente. Por isso, inspecione o item imediatamente na devolução e abra a disputa se necessário — não espere." },
      { q: "Que documentos preciso para abrir uma disputa?",
        a: "As principais evidências são as fotos de check-in e check-out registradas na plataforma. Você também pode enviar: capturas de tela do chat, fotos adicionais com data e hora visíveis, orçamentos de reparo e qualquer comunicação relevante. Quanto mais evidências você fornecer, mais rápida e precisa será a análise." },
      { q: "Como a equipe ShareO decide em uma disputa?",
        a: "Nossa equipe analisa todas as evidências fornecidas pelas duas partes: fotos de check-in vs. check-out, conversas no chat, histórico de transações e avaliações anteriores. Respondemos em até 3 dias úteis. A decisão leva em conta o estado documentado do item antes e depois, o comportamento das partes e a política de uso do ShareO." },
      { q: "O que acontece com o repasse em caso de dano?",
        a: "Se houver dano comprovado, o proprietário abre uma disputa antes de confirmar o recebimento. O repasse fica suspenso automaticamente durante a análise — reservas em disputa não entram na fila. A equipe ShareO avalia as fotos de check-in e check-out e, em até 3 dias úteis, decide se o repasse é liberado, parcialmente retido ou cancelado conforme o prejuízo apurado." },
      { q: "O que acontece se meu item for extraviado?",
        a: "Em caso de furto ou extravio durante a locação, abra uma disputa na plataforma e registre um boletim de ocorrência (BO). A equipe ShareO analisa o caso e aciona os mecanismos de proteção disponíveis. Uma solução de proteção dedicada está em desenvolvimento — em breve disponível." },
      { q: "Posso apelar de uma decisão de disputa?",
        a: "Sim. Se você discordar da decisão, tem até 5 dias úteis para solicitar uma revisão. Envie novas evidências que não foram analisadas anteriormente e explique o motivo do recurso. A revisão é feita por um time diferente do que tomou a decisão original. Caso o problema persista, você pode acionar os canais de defesa do consumidor (Procon) ou o e-Consumidor." },
    ],
  },
  {
    id: "suporte",
    title: "Suporte e Atendimento",
    icon: "🎧",
    faqs: [
      { q: "Quais são os canais de atendimento?",
        a: "Você pode nos contatar por: Email (suporte@shareo.com.br) — respondemos em até 8 horas úteis (casos urgentes: até 4 horas úteis); Chat interno do app — disponível em reservas ativas; e, em casos urgentes, pelo botão 'Atendimento emergencial' dentro da reserva com disputa ativa. Nosso horário de atendimento é segunda a sexta, das 09h às 17h." },
      { q: "Qual é o prazo de resposta para cada tipo de solicitação?",
        a: "Email: até 8 horas úteis (urgente: até 4 horas úteis). Disputas ativas: até 3 dias úteis para decisão. Revisão de disputa (recurso): até 5 dias úteis. Solicitações de exclusão de conta (LGPD): até 15 dias. Denúncias de usuário suspeito: até 24 horas. Os prazos indicados são metas de atendimento em condições normais de operação — segunda a sexta, 09h às 17h — e podem ser impactados em situações extraordinárias de volume ou força maior. Para reservas urgentes em andamento, use sempre o canal de atendimento emergencial dentro do app." },
      { q: "Como reporto um usuário ou anúncio suspeito?",
        a: "Em qualquer anúncio ou perfil, toque nos três pontinhos (⋯) e selecione 'Reportar'. Descreva o problema com o máximo de detalhes e confirme. Nossa equipe analisa o reporte em até 24 horas e, se necessário, suspende o usuário preventivamente. Reportes são anônimos — o usuário reportado não sabe quem enviou." },
      { q: "Tenho um problema urgente com uma reserva em andamento. O que faço?",
        a: "Acesse a página da reserva e toque em 'Precisa de ajuda?'. Isso abre um canal prioritário com nossa equipe. Para situações críticas — item não entregue no dia, proprietário sem contato, suspeita de golpe — use 'Solicitar intervenção ShareO'. Casos urgentes são tratados com meta de resposta de até 4 horas úteis (segunda a sexta, 09h–17h)." },
      { q: "O app tem notificações automáticas?",
        a: "Sim. Você recebe notificações para: nova solicitação de reserva recebida, confirmação ou recusa de reserva, mensagem no chat, pagamento recebido, aviso 24h antes do prazo de devolução, atraso registrado e resultado de disputa. Ative as notificações do app nas configurações do celular para não perder nenhum alerta." },
    ],
  },
  {
    id: "conta",
    title: "Conta e Perfil",
    icon: "👤",
    faqs: [
      { q: "Como verifico minha identidade?",
        a: "Acesse 'Meu Perfil' e abra 'Documentos'. Lá você encontra a opção de verificação de identidade. Envie os documentos solicitados (CPF e selfie com o documento). Quando aprovada, um selo de verificado aparece no seu perfil. O processo leva até 24 horas úteis." },
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
    faqs: [
      { q: "O ShareO emite nota fiscal?",
        a: "O ShareO emite comprovante eletrônico de transação para todas as locações concluídas na plataforma. O comprovante é enviado automaticamente para o email cadastrado após o encerramento da reserva. Você também pode baixar o histórico de comprovantes em 'Meu Perfil > Meus repasses'." },
      { q: "Como declaro os rendimentos de aluguel no Imposto de Renda?",
        a: "Rendimentos de aluguel de bens móveis são tributáveis e devem ser declarados como 'Rendimentos Tributáveis Recebidos de Pessoa Física ou Jurídica' na declaração anual do IR. O ShareO fornece um informe de rendimentos anual em Meu Perfil → Repasses → Informe de Rendimentos — basta selecionar o ano e baixar o resumo com todos os valores recebidos. Consulte seu contador para orientações sobre alíquotas e deduções específicas para o seu caso." },
      { q: "Quais as regras para empresas (PJ) anunciarem na plataforma?",
        a: "Pessoas jurídicas podem usar o ShareO com o plano PJ Premium. As regras incluem: CNPJ ativo e regular; emissão de nota fiscal para todas as locações (conforme legislação vigente); cumprimento das regras do CDC (Código de Defesa do Consumidor) na relação com locatários. PJs têm acesso a ferramentas avançadas como importação em massa, analytics e vitrine personalizada." },
      { q: "Meus dados estão protegidos? Como funciona a LGPD no ShareO?",
        a: "O ShareO segue integralmente a Lei Geral de Proteção de Dados (LGPD — Lei 13.709/2018) e coleta apenas os dados necessários para o funcionamento da plataforma. Você pode solicitar acesso, correção, portabilidade ou exclusão dos seus dados a qualquer momento em 'Meu Perfil > Privacidade e dados'. Os dados necessários para processar pagamentos e repasses são compartilhados com a Stripe (nosso provedor de pagamentos, que atua como operador de dados financeiros). Dados mínimos são transmitidos a outros prestadores de infraestrutura (hospedagem, e-mail transacional e monitoramento de erros), sempre sob acordo de confidencialidade. Não vendemos seus dados pessoais. Consulte nossa Política de Privacidade para a lista completa." },
      // JURÍDICO (ADR-028): o parecer D4 validou o desenho do Mercado Pago, não o da Stripe.
      // Esta resposta descreve o papel da Stripe SEM afirmar enquadramento regulatório dela
      // — a versão anterior alegava licença do BACEN e certificação PCI-DSS de um PSP que
      // nem é mais o nosso. Transcrito de app/ajuda/page.tsx.
      { q: "O ShareO é regulamentado?",
        a: "O ShareO opera como marketplace de locação de bens móveis, seguindo as normas do Código Civil, CDC e LGPD. Os pagamentos são processados pela Stripe, provedor de pagamentos que opera no Brasil e responde pelo processamento das cobranças e pelo repasse aos proprietários. A ShareO responde solidariamente pelos serviços de intermediação que presta, nos termos do Código de Defesa do Consumidor. Para dúvidas jurídicas específicas sobre suas transações, consulte um advogado especializado em direito digital ou relações de consumo." },
    ],
  },
] }

// ── Links rápidos do hero ─────────────────────────────────────────────────────

const QUICK_LINKS = [
  { anchor: "primeiros-passos", label: "🚀 Primeiros passos" },
  { anchor: "locatario",        label: "🛒 Quero alugar" },
  { anchor: "locador",          label: "📦 Quero anunciar" },
  { anchor: "taxas-secao",      label: "🧾 Taxas" },
  { anchor: "disputas",         label: "⚖️ Disputas" },
  { anchor: "suporte",          label: "🎧 Suporte" },
  { anchor: "pagamento",        label: "🔒 Pagamento" },
  { anchor: "legal",            label: "📋 Legal e Fiscal" },
  { anchor: "conta",            label: "👤 Conta e Perfil" },
]

// ── Componentes auxiliares ─────────────────────────────────────────────────────

function ChevronIcon({ open, color }: { open: boolean; color: string }) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth={2.5}>
      <Path d={open ? "M18 15 L12 9 L6 15" : "M6 9 L12 15 L18 9"} />
    </Svg>
  )
}

function CalloutView({
  type,
  text,
  tokens,
}: {
  type: "tip" | "example" | "warning"
  text: string
  tokens: Tokens
}) {
  // Cores via tokens: tip=navy, example=green, warning=warning (token disponível)
  const cfg = {
    tip:     { label: "💡 Dica",             color: tokens.navy,    bg: tokens.navy + "12",    border: tokens.navy + "30"    },
    example: { label: "📊 Exemplo prático", color: tokens.green,   bg: tokens.green + "12",   border: tokens.green + "30"   },
    warning: { label: "⚠️ Atenção",          color: tokens.warning, bg: tokens.warning + "18", border: tokens.warning + "40" },
  }[type]

  return (
    <View style={[s.callout, { backgroundColor: cfg.bg, borderColor: cfg.border }]}>
      <Text style={[s.calloutLabel, { color: cfg.color }]}>{cfg.label}: </Text>
      <Text style={[s.calloutText, { color: cfg.color }]}>{text}</Text>
    </View>
  )
}

function StepItemView({
  step,
  isLast,
  tokens,
}: {
  step: Step
  isLast: boolean
  tokens: Tokens
}) {
  return (
    <View style={s.stepRow}>
      {/* Número + linha vertical */}
      <View style={s.stepLeft}>
        <View style={[s.stepCircle, { backgroundColor: tokens.green }]}>
          <Text style={s.stepNumber}>{step.step}</Text>
        </View>
        {!isLast && <View style={[s.stepLine, { backgroundColor: tokens.border }]} />}
      </View>
      {/* Conteúdo */}
      <View style={[s.stepContent, isLast ? s.stepContentLast : undefined]}>
        <Text style={[s.stepTitle, { color: tokens.text }]}>
          <Text>{step.icon} </Text>
          {step.title}
        </Text>
        <Text style={[s.stepDesc, { color: tokens.muted }]}>{step.desc}</Text>
        {!!step.tip     && <CalloutView type="tip"     text={step.tip}     tokens={tokens} />}
        {!!step.example && <CalloutView type="example" text={step.example} tokens={tokens} />}
        {!!step.warning && <CalloutView type="warning" text={step.warning} tokens={tokens} />}
      </View>
    </View>
  )
}

function FaqItemView({
  q,
  a,
  isOpen,
  onToggle,
  tokens,
}: {
  q: string
  a: string
  isOpen: boolean
  onToggle: () => void
  tokens: Tokens
}) {
  return (
    <View style={[s.faqItem, { borderColor: tokens.border, backgroundColor: tokens.surface }]}>
      <TouchableOpacity
        style={s.faqQuestion}
        onPress={onToggle}
        accessibilityRole="button"
        accessibilityLabel={q}
        accessibilityState={{ expanded: isOpen }}
        activeOpacity={0.7}
      >
        <Text style={[s.faqQuestionText, { color: tokens.text }]}>{q}</Text>
        <ChevronIcon open={isOpen} color={tokens.muted} />
      </TouchableOpacity>
      {isOpen && (
        <View style={[s.faqAnswer, { borderTopColor: tokens.border }]}>
          <Text style={[s.faqAnswerText, { color: tokens.muted }]}>{a}</Text>
        </View>
      )}
    </View>
  )
}

function FeeTableRow({
  label,
  value,
  when,
  isFirst,
  tokens,
}: {
  label: string
  value: string
  when: string
  isFirst: boolean
  tokens: Tokens
}) {
  return (
    <View
      style={[
        s.feeRow,
        {
          borderTopColor:    tokens.border,
          borderTopWidth:    isFirst ? 0 : 1,
          backgroundColor:   tokens.surface,
        },
      ]}
    >
      <Text style={[s.feeLabel, { color: tokens.text }]}>{label}</Text>
      <Text style={[s.feeValue, { color: tokens.green }]}>{value}</Text>
      <Text style={[s.feeWhen,  { color: tokens.muted }]}>{when}</Text>
    </View>
  )
}

// ── Componente principal ───────────────────────────────────────────────────────

export default function AjudaScreen() {
  const { tokens } = useTheme()
  const { anchor } = useLocalSearchParams<{ anchor?: string }>()

  // 🪤 NÃO cravar prazo, teto ou percentual na copy: era assim que esta tela
  // dizia "toda segunda-feira" e "R$ 500" enquanto o site já lia a config.
  const [cfg, setCfg] = useState<PublicConfig>(DEFAULT_CONFIG)

  useEffect(() => {
    fetch(`${API_URL}/api/platform-config/public`)
      .then((r) => r.json())
      .then((json: { data?: Partial<PublicConfig> }) => {
        const d = json?.data
        if (!d) return
        // Merge, e não substituição: o app instalado no celular pode ser mais
        // velho ou mais novo que a API (ciclo de loja ≠ ciclo de deploy). Campo
        // ausente cai no default em vez de virar `undefined` no meio do texto.
        // `cancel` é mesclado à parte porque o spread raso o trocaria inteiro.
        setCfg((atual) => ({ ...atual, ...d, cancel: { ...atual.cancel, ...d.cancel } }))
      })
      .catch(() => {
        // Sem rede, a Ajuda abre com os defaults. Falhar em silêncio aqui é a
        // escolha certa: o conteúdo continua correto, só não reflete config
        // customizada pelo SuperAdmin.
      })
  }, [])

  // Um único objeto de rótulos, como o `HelpVars` do site.
  const v = useMemo(() => toHelpVars(cfg), [cfg])

  // Construídos uma vez por config, como no site. Os `.map()` de pós-remendo e
  // as strings-sentinela que existiam aqui sumiram: os textos agora são
  // template literals dentro dos próprios builders.
  //
  // `useMemo` porque a tela tem ~75 acordeões e cada toque re-renderiza: sem ele,
  // os 8 blocos de FAQ e os 15 passos seriam realocados a cada abertura.
  const locatarioSteps = useMemo(() => buildLocatarioSteps(v), [v])
  const locadorSteps   = useMemo(() => buildLocadorSteps(v), [v])
  const sections       = useMemo(() => buildSections(v), [v])

  // ── Tabela de taxas (transcrita de buildFeeTable() do site) ────────────────
  const feeTable = [
    { label: "Taxa de serviço (cobrada do locatário)", value: `${v.feeLabel} do total`,        when: "Na confirmação do pagamento" },
    { label: "Anunciar na plataforma (locador)",       value: "Gratuito",                    when: "Sempre, sem mensalidade" },
    { label: "Repasse ao locador",                     value: "Valor líquido da locação",    when: `${v.payoutLabel} após a confirmação da devolução` },
    // ⚠️ Regra de negócio da fase inicial, NÃO validada em código hoje
    // (lib/validations/items.ts só exige estimatedRetailPrice >= 0). Não afirmar
    // que o limite é verificado automaticamente enquanto isso não existir.
    { label: "Valor máximo do bem anunciado",          value: "R$ 1.000 por item",           when: "Regra da fase inicial" },
    { label: "Limite por locação",                     value: `${v.maxLabel} por transação`,   when: "Validado no checkout" },
    { label: "Taxa por atraso na devolução",           value: `${v.lateMultLabel} o preço diário por dia`, when: "Gerada ao detectar o atraso" },
    { label: `Cancelamento até ${v.cancel.fullRefundHours}h antes da retirada`,                          value: "Reembolso de 100%",                    when: "Sem custo para o locatário" },
    { label: `Cancelamento entre ${v.cancel.fullRefundHours}h e ${v.cancel.partialRefundHours}h antes`,    value: `Reembolso de ${v.cancel.partialPercent}%`, when: "Descontado do valor pago" },
    { label: `Cancelamento com menos de ${v.cancel.partialRefundHours}h antes`,                          value: `Reembolso de ${v.cancel.latePercent}%`,   when: "Descontado do valor pago" },
  ]

  // ── Acordeão — guias de primeiros passos ───────────────────────────────────
  const [guideLocatarioOpen, setGuideLocatarioOpen] = useState(false)
  const [guideLocadorOpen,   setGuideLocadorOpen]   = useState(false)

  // ── Acordeão — dicas para anfitriões ───────────────────────────────────────
  const [dicasOpen, setDicasOpen] = useState<Record<string, boolean>>({})
  const toggleDica = useCallback((id: string) => {
    setDicasOpen((prev) => ({ ...prev, [id]: !prev[id] }))
  }, [])

  // ── Acordeão — FAQs ────────────────────────────────────────────────────────
  const [faqsOpen, setFaqsOpen] = useState<Record<string, boolean>>({})
  const toggleFaq = useCallback((key: string) => {
    setFaqsOpen((prev) => ({ ...prev, [key]: !prev[key] }))
  }, [])

  // ── Scroll para âncora via useLocalSearchParams (bônus) ───────────────────
  const scrollRef      = useRef<ScrollView>(null)
  const sectionOffsets = useRef<Record<string, number>>({})

  useEffect(() => {
    if (!anchor) return
    const timer = setTimeout(() => {
      const offset = sectionOffsets.current[anchor]
      if (offset !== undefined) {
        scrollRef.current?.scrollTo({ y: offset, animated: true })
      }
    }, 350)
    return () => clearTimeout(timer)
  }, [anchor])

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <View style={[s.root, { backgroundColor: tokens.bg }]}>

      <ScreenHeader title="Central de Ajuda" />

      <ScrollView
        ref={scrollRef}
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Hero ── */}
        <View style={[s.hero, { backgroundColor: tokens.navy }]}>
          <Text style={s.heroEmoji} accessibilityElementsHidden importantForAccessibility="no">💬</Text>
          <Text style={s.heroTitle} accessibilityRole="header">Como podemos ajudar?</Text>
          <Text style={s.heroSubtitle}>
            Tudo o que você precisa saber para alugar ou anunciar no ShareO — do zero ao primeiro aluguel.
          </Text>

          {/* Links rápidos — scroll horizontal */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={s.quickLinksContent}
            style={s.quickLinksScroll}
          >
            {QUICK_LINKS.map((link) => (
              <TouchableOpacity
                key={link.anchor}
                style={s.quickLink}
                accessibilityRole="button"
                accessibilityLabel={link.label}
                onPress={() => {
                  const offset = sectionOffsets.current[link.anchor]
                  if (offset !== undefined) {
                    scrollRef.current?.scrollTo({ y: offset, animated: true })
                  }
                }}
              >
                <Text style={s.quickLinkText}>{link.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* ══ Primeiros Passos ══════════════════════════════════════════════════ */}
        <View
          nativeID="primeiros-passos"
          onLayout={(e) => { sectionOffsets.current["primeiros-passos"] = e.nativeEvent.layout.y }}
          style={[s.section, { backgroundColor: tokens.surface, borderBottomColor: tokens.border }]}
        >
          {/* Rótulo + título + subtítulo */}
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionBadge, { backgroundColor: tokens.green + "1A" }]}>
              <Text style={[s.sectionBadgeText, { color: tokens.green }]}>Novo por aqui?</Text>
            </View>
          </View>
          <Text style={[s.sectionTitle, { color: tokens.navy }]} accessibilityRole="header">
            Primeiros Passos
          </Text>
          <Text style={[s.sectionSubtitle, { color: tokens.muted }]}>
            Escolha o seu perfil e siga o guia completo — do cadastro à conclusão do seu primeiro aluguel.
          </Text>

          {/* Guia Locatário */}
          <TouchableOpacity
            style={[s.guideHeader, { backgroundColor: tokens.navy + "12", borderColor: tokens.navy + "33" }]}
            onPress={() => setGuideLocatarioOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Quero alugar um item"
            accessibilityState={{ expanded: guideLocatarioOpen }}
            activeOpacity={0.7}
          >
            <View style={s.guideHeaderLeft}>
              <Text style={[s.guideIcon]}>🛒</Text>
              <View style={s.guideHeaderTexts}>
                <Text style={[s.guideTitle, { color: tokens.navy }]}>Quero alugar um item</Text>
                <Text style={[s.guideSubtitle, { color: tokens.muted }]}>
                  Do cadastro à devolução — guia em {locatarioSteps.length} passos.
                </Text>
              </View>
            </View>
            <ChevronIcon open={guideLocatarioOpen} color={tokens.navy} />
          </TouchableOpacity>
          {guideLocatarioOpen && (
            <View style={s.guideBody}>
              {locatarioSteps.map((step, i) => (
                <StepItemView
                  key={step.step}
                  step={step}
                  isLast={i === locatarioSteps.length - 1}
                  tokens={tokens}
                />
              ))}
            </View>
          )}

          {/* Guia Locador */}
          <TouchableOpacity
            style={[s.guideHeader, { backgroundColor: tokens.green + "12", borderColor: tokens.green + "33", marginTop: 12 }]}
            onPress={() => setGuideLocadorOpen((v) => !v)}
            accessibilityRole="button"
            accessibilityLabel="Quero anunciar meus itens"
            accessibilityState={{ expanded: guideLocadorOpen }}
            activeOpacity={0.7}
          >
            <View style={s.guideHeaderLeft}>
              <Text style={s.guideIcon}>📦</Text>
              <View style={s.guideHeaderTexts}>
                <Text style={[s.guideTitle, { color: tokens.green }]}>Quero anunciar meus itens</Text>
                <Text style={[s.guideSubtitle, { color: tokens.muted }]}>
                  Do anúncio ao repasse — guia em {locadorSteps.length} passos.
                </Text>
              </View>
            </View>
            <ChevronIcon open={guideLocadorOpen} color={tokens.green} />
          </TouchableOpacity>
          {guideLocadorOpen && (
            <View style={s.guideBody}>
              {locadorSteps.map((step, i) => (
                <StepItemView
                  key={step.step}
                  step={step}
                  isLast={i === locadorSteps.length - 1}
                  tokens={tokens}
                />
              ))}
            </View>
          )}
        </View>

        {/* ══ Dicas para Anfitriões ══════════════════════════════════════════════ */}
        <View
          nativeID="dicas-anfitrioes"
          onLayout={(e) => { sectionOffsets.current["dicas-anfitrioes"] = e.nativeEvent.layout.y }}
          style={[s.section, { backgroundColor: tokens.bg, borderBottomColor: tokens.border }]}
        >
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionBadge, { backgroundColor: tokens.green + "1A" }]}>
              <Text style={[s.sectionBadgeText, { color: tokens.green }]}>Para proprietários</Text>
            </View>
          </View>
          <Text style={[s.sectionTitle, { color: tokens.navy }]} accessibilityRole="header">
            Dicas para anfitriões
          </Text>
          <Text style={[s.sectionSubtitle, { color: tokens.muted }]}>
            Maximize seus aluguéis: o que separa um anúncio que aluga toda semana de um que ninguém vê.
          </Text>

          {DICAS.map((dica) => {
            const isOpen = !!dicasOpen[dica.id]
            return (
              <View
                key={dica.id}
                style={[s.dicaItem, { borderColor: tokens.border, backgroundColor: tokens.surface }]}
              >
                <TouchableOpacity
                  style={s.dicaHeader}
                  onPress={() => toggleDica(dica.id)}
                  accessibilityRole="button"
                  accessibilityLabel={dica.title}
                  accessibilityState={{ expanded: isOpen }}
                  activeOpacity={0.7}
                >
                  <View style={s.dicaHeaderLeft}>
                    <Text style={s.dicaEmoji}>{dica.emoji}</Text>
                    <Text style={[s.dicaTitle, { color: tokens.text }]}>{dica.title}</Text>
                  </View>
                  <ChevronIcon open={isOpen} color={tokens.muted} />
                </TouchableOpacity>
                {isOpen && (
                  <Text style={[s.dicaBody, { color: tokens.muted }]}>{dica.body}</Text>
                )}
              </View>
            )
          })}
        </View>

        {/* ══ Tabela de Taxas ═══════════════════════════════════════════════════ */}
        <View
          nativeID="taxas-secao"
          onLayout={(e) => { sectionOffsets.current["taxas-secao"] = e.nativeEvent.layout.y }}
          style={[s.section, { backgroundColor: tokens.bg, borderBottomColor: tokens.border }]}
        >
          <View style={s.sectionLabelRow}>
            <View style={[s.sectionBadge, { backgroundColor: tokens.warning + "22" }]}>
              <Text style={[s.sectionBadgeText, { color: tokens.warning }]}>Transparência</Text>
            </View>
          </View>
          <Text style={[s.sectionTitle, { color: tokens.navy }]} accessibilityRole="header">
            Taxas e custos da plataforma
          </Text>
          <Text style={[s.sectionSubtitle, { color: tokens.muted }]}>
            Sem letras miúdas. Veja exatamente o que é cobrado e quando.
          </Text>

          {/* Cabeçalho da tabela */}
          <View style={[s.feeTable, { borderColor: tokens.border }]}>
            <View style={[s.feeTableHeader, { backgroundColor: tokens.navy }]}>
              <Text style={[s.feeTableHeaderCell, s.feeColLabel]}>Item</Text>
              <Text style={[s.feeTableHeaderCell, s.feeColValue]}>Valor</Text>
            </View>
            {feeTable.map((row, i) => (
              <FeeTableRow
                key={i}
                label={row.label}
                value={row.value}
                when={row.when}
                isFirst={i === 0}
                tokens={tokens}
              />
            ))}
          </View>
          <Text style={[s.feeFootnote, { color: tokens.muted }]}>
            Proprietários com dados bancários cadastrados pela Stripe recebem o repasse automaticamente — nenhuma ação manual é necessária após a confirmação da devolução.
          </Text>
        </View>

        {/* ══ Seções de FAQ ═════════════════════════════════════════════════════ */}
        {sections.map((sec) => (
          <View
            key={sec.id}
            nativeID={sec.id}
            onLayout={(e) => { sectionOffsets.current[sec.id] = e.nativeEvent.layout.y }}
            style={[s.section, { backgroundColor: tokens.bg, borderBottomColor: tokens.border }]}
          >
            {/* Cabeçalho da seção */}
            <View style={s.faqSectionHeader}>
              <Text style={s.faqSectionIcon}>{sec.icon}</Text>
              <Text style={[s.faqSectionTitle, { color: tokens.navy }]} accessibilityRole="header">
                {sec.title}
              </Text>
            </View>

            {/* FAQ items */}
            {sec.faqs.map((faq, idx) => {
              const key = `${sec.id}-${idx}`
              return (
                <FaqItemView
                  key={key}
                  q={faq.q}
                  a={faq.a}
                  isOpen={!!faqsOpen[key]}
                  onToggle={() => toggleFaq(key)}
                  tokens={tokens}
                />
              )
            })}
          </View>
        ))}

        {/* ══ Bloco de contato ══════════════════════════════════════════════════ */}
        <View style={[s.contactSection, { backgroundColor: tokens.surface, borderTopColor: tokens.border }]}>
          <Text style={[s.contactTitle, { color: tokens.navy }]}>Ainda com dúvidas?</Text>
          <Text style={[s.contactSubtitle, { color: tokens.muted }]}>
            Nossa equipe atende de segunda a sexta, das 09h às 17h.
          </Text>
          <TouchableOpacity
            style={[s.contactBtn, { backgroundColor: tokens.navy }]}
            onPress={() => Linking.openURL("mailto:suporte@shareo.com.br")}
            accessibilityRole="button"
            accessibilityLabel="Enviar email para suporte"
          >
            <Text style={s.contactBtnText}>✉️  suporte@shareo.com.br</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  )
}

// ── Estilos ────────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { flex: 1 },
  content: { paddingBottom: 48 },

  // ── Hero ───────────────────────────────────────────────────────────────────
  hero: {
    paddingHorizontal: 20,
    paddingVertical:   36,
    alignItems:        "center",
    gap:               12,
  },
  heroEmoji:    { fontSize: 44 },
  heroTitle:    { fontSize: 26, fontWeight: "800", color: "#FFFFFF", textAlign: "center", lineHeight: 34 },
  heroSubtitle: { fontSize: 14, color: "rgba(255,255,255,0.75)", textAlign: "center", lineHeight: 20 },

  quickLinksScroll:   { width: "100%", marginTop: 4 },
  quickLinksContent:  { gap: 8, paddingHorizontal: 0, paddingBottom: 4 },
  quickLink: {
    borderRadius:      20,
    borderWidth:       1,
    borderColor:       "rgba(255,255,255,0.3)",
    backgroundColor:   "rgba(255,255,255,0.2)",
    paddingHorizontal: 14,
    minHeight:         44,
    alignItems:        "center",
    justifyContent:    "center",
  },
  quickLinkText: { fontSize: 13, fontWeight: "600", color: "#FFFFFF" },

  // ── Seções genéricas ───────────────────────────────────────────────────────
  section: {
    paddingHorizontal: 16,
    paddingVertical:   24,
    gap:               12,
    borderBottomWidth: 1,
  },
  sectionLabelRow: { alignItems: "flex-start" },
  sectionBadge: {
    borderRadius:      20,
    paddingHorizontal: 12,
    paddingVertical:   4,
  },
  sectionBadgeText: { fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.8 },
  sectionTitle:     { fontSize: 20, fontWeight: "700", lineHeight: 28 },
  sectionSubtitle:  { fontSize: 13, lineHeight: 19 },

  // ── Guias de Primeiros Passos ──────────────────────────────────────────────
  guideHeader: {
    borderRadius:      12,
    borderWidth:       1,
    padding:           16,
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    gap:               12,
  },
  guideHeaderLeft:  { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  guideHeaderTexts: { flex: 1 },
  guideIcon:        { fontSize: 22 },
  guideTitle:       { fontSize: 16, fontWeight: "700" },
  guideSubtitle:    { fontSize: 12, marginTop: 2 },
  guideBody:        { marginTop: 8, paddingTop: 4 },

  // ── Steps ──────────────────────────────────────────────────────────────────
  stepRow: {
    flexDirection: "row",
    gap:           12,
  },
  stepLeft: {
    flexShrink: 0,
    alignItems: "center",
    gap:        4,
    width:      36,
  },
  stepCircle: {
    width:          36,
    height:         36,
    borderRadius:   18,
    alignItems:     "center",
    justifyContent: "center",
  },
  stepNumber:      { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
  stepLine:        { width: 2, flex: 1, marginBottom: 0 },
  stepContent:     { flex: 1, paddingBottom: 20, gap: 6 },
  stepContentLast: { paddingBottom: 4 },
  stepTitle:       { fontSize: 15, fontWeight: "600" },
  stepDesc:        { fontSize: 13, lineHeight: 20 },

  // ── Callout ────────────────────────────────────────────────────────────────
  callout: {
    borderRadius: 8,
    borderWidth:  1,
    padding:      10,
    gap:          2,
  },
  calloutLabel: { fontSize: 12, fontWeight: "700" },
  calloutText:  { fontSize: 12, lineHeight: 18 },

  // ── Dicas para anfitriões ──────────────────────────────────────────────────
  dicaItem: {
    borderRadius: 12,
    borderWidth:  1,
    overflow:     "hidden",
  },
  dicaHeader: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    padding:           14,
    gap:               8,
    minHeight:         52,
  },
  dicaHeaderLeft: {
    flex:          1,
    flexDirection: "row",
    alignItems:    "center",
    gap:           10,
  },
  dicaEmoji: { fontSize: 18 },
  dicaTitle: { flex: 1, fontSize: 14, fontWeight: "600" },
  dicaBody:  { fontSize: 13, lineHeight: 20, paddingHorizontal: 14, paddingBottom: 14 },

  // ── Tabela de Taxas ────────────────────────────────────────────────────────
  feeTable: {
    borderRadius: 12,
    borderWidth:  1,
    overflow:     "hidden",
  },
  feeTableHeader: {
    flexDirection:     "row",
    paddingHorizontal: 12,
    paddingVertical:   10,
    gap:               8,
  },
  feeTableHeaderCell: { fontSize: 12, fontWeight: "700", color: "#FFFFFF" },
  feeColLabel:        { flex: 2 },
  feeColValue:        { flex: 1.2 },
  feeRow: {
    paddingHorizontal: 12,
    paddingVertical:   12,
    gap:               2,
  },
  feeLabel: { fontSize: 13, fontWeight: "500" },
  feeValue: { fontSize: 13, fontWeight: "700", marginTop: 2 },
  feeWhen:  { fontSize: 11, lineHeight: 16, marginTop: 1 },
  feeFootnote: { fontSize: 11, textAlign: "center", lineHeight: 16 },

  // ── FAQ Sections ───────────────────────────────────────────────────────────
  faqSectionHeader: {
    flexDirection: "row",
    alignItems:    "center",
    gap:           8,
    marginBottom:  4,
  },
  faqSectionIcon:  { fontSize: 22 },
  faqSectionTitle: { fontSize: 18, fontWeight: "700" },

  faqItem: {
    borderRadius:  10,
    borderWidth:   1,
    overflow:      "hidden",
    ...Platform.select({
      ios:     { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 2 },
      android: { elevation: 1 },
    }),
  },
  faqQuestion: {
    flexDirection:     "row",
    alignItems:        "center",
    justifyContent:    "space-between",
    paddingHorizontal: 14,
    paddingVertical:   14,
    gap:               10,
    minHeight:         52,
  },
  faqQuestionText: { flex: 1, fontSize: 14, fontWeight: "600", lineHeight: 20 },
  faqAnswer: {
    borderTopWidth:    1,
    paddingHorizontal: 14,
    paddingVertical:   12,
  },
  faqAnswerText: { fontSize: 13, lineHeight: 20 },

  // ── Contato ────────────────────────────────────────────────────────────────
  contactSection: {
    padding:      24,
    alignItems:   "center",
    gap:          10,
    borderTopWidth: 1,
  },
  contactTitle:    { fontSize: 18, fontWeight: "700", textAlign: "center" },
  contactSubtitle: { fontSize: 13, textAlign: "center" },
  contactBtn: {
    borderRadius:      10,
    paddingHorizontal: 20,
    paddingVertical:   14,
    minHeight:         48,
    alignItems:        "center",
    justifyContent:    "center",
    marginTop:         4,
    width:             "100%",
  },
  contactBtnText: { fontSize: 14, fontWeight: "700", color: "#FFFFFF" },
})
