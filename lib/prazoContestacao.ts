/**
 * Prazo para contestar a decisão de uma disputa — 5 dias ÚTEIS a partir da
 * decisão (Central de Ajuda, seção Disputas; decisão de Roberto, 01/09/2026).
 *
 * 🪤 O prazo estava só no texto publicado: nada no sistema o calculava, e nem o
 * usuário nem a equipe sabiam quando vencia. Prometer um prazo que ninguém
 * consegue apurar é o mesmo problema do "recurso por um time diferente" —
 * palavra sem contrapartida.
 *
 * O que este módulo NÃO faz: barrar a contestação. Ela chega por e-mail ao
 * suporte, fora do sistema. Aqui o prazo é calculado e exibido; quem decide
 * sobre um pedido fora da janela é a equipe, agora com a data à vista.
 */

/** Dias úteis = segunda a sexta. Feriados não entram — ver nota no fim. */
function ehDiaUtil(d: Date): boolean {
  const diaDaSemana = d.getUTCDay()
  return diaDaSemana !== 0 && diaDaSemana !== 6
}

export const DIAS_UTEIS_CONTESTACAO = 5

/**
 * Data-limite para contestar, contando `dias` dias úteis a partir de
 * `decididoEm` (exclusive: o dia da decisão não conta).
 */
export function prazoParaContestar(
  decididoEm: Date,
  dias: number = DIAS_UTEIS_CONTESTACAO,
): Date {
  const d = new Date(decididoEm)
  let restantes = dias
  while (restantes > 0) {
    d.setUTCDate(d.getUTCDate() + 1)
    if (ehDiaUtil(d)) restantes--
  }
  // Vale o dia inteiro: quem recebe "até 08/09" espera poder escrever no dia 8.
  d.setUTCHours(23, 59, 59, 999)
  return d
}

/** A janela de contestação ainda está aberta? */
export function podeContestar(decididoEm: Date | null, agora: Date = new Date()): boolean {
  if (!decididoEm) return false
  return agora <= prazoParaContestar(decididoEm)
}

/**
 * 🪤 Feriados NÃO são considerados — só fins de semana.
 *
 * Não há calendário de feriados no projeto, e inventar um lista incompleta é
 * pior que assumir a simplificação: um feriado ignorado ENCURTA o prazo do
 * usuário, e um prazo menor que o prometido é justamente o risco que este
 * módulo existe para evitar.
 *
 * Como o prazo limita o usuário e não a plataforma, e a contestação é analisada
 * por uma pessoa, a diferença de um ou dois dias é absorvida na análise. Se um
 * dia isso passar a barrar alguém automaticamente, o calendário vira requisito.
 */
