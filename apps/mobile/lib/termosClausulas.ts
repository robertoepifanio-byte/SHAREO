// Fonte: packages/legal/src/termos-clausulas.ts (espelho; o app não importa do pacote. Paridade travada por __tests__/unit/components/legal/termos-clausulas.test.ts).

/** Espelho de formatPercentValue (packages/legal/src/formato.ts): 15 → "15", 12.5 → "12,5". */
export const formatPercentValue = (pct: number): string => String(pct).replace(".", ",")

/**
 * Seções 6 (intermediação e pagamento) e 7 (prevenção à lavagem de dinheiro) dos
 * Termos de Uso, redigidas pela assessoria jurídica em 21/09/2026 — ver
 * docs/juridico/parecer-lei-12865-2026-09-21.md.
 *
 * O TEXTO É DA ADVOGADA: o risco jurídico apontado por ela está na redação, não na
 * operação. Só mudam, e só aqui, os pontos que precisam vir da configuração da
 * plataforma (taxa, repasse, janela e teto). O app mobile espelha este arquivo em
 * `apps/mobile/lib/termosClausulas.ts` (não importa deste pacote) e um teste do
 * site compara os dois.
 *
 * Acréscimos nossos ao texto dela, ambos compromissos que a cláusula anterior já
 * publicava e que a redação nova não repetia: a janela de repasse (6.5) e o teto
 * por transação (6.4). Sem eles o texto novo apagaria dois números que o usuário
 * já leu.
 */

export type SubClausula = { titulo: string; paragrafos: string[] }

/** Fatia do locador em pontos percentuais, no mesmo formato de `feePct`: "15" → "85", "12,5" → "87,5". */
export function repassePctDe(feePct: string): string {
  const taxa = Number(feePct.replace(",", "."))
  return formatPercentValue(Math.round((100 - taxa) * 100) / 100)
}

export function clausulasIntermediacaoPagamento(v: {
  feePct: string
  payoutLabel: string
  maxPorTransacao: string
}): SubClausula[] {
  const repassePct = repassePctDe(v.feePct)
  return [
    {
      titulo: "6.1. Intermediação",
      paragrafos: [
        "A ShareO disponibiliza uma plataforma tecnológica destinada à aproximação entre locadores e locatários e à intermediação das locações realizadas por meio da plataforma.",
        "A ShareO não participa da relação de locação como locadora ou locatária e não assume a obrigação de entrega, conservação, manutenção ou devolução do bem objeto da locação, salvo quando expressamente previsto em contrato ou nas regras específicas da plataforma.",
      ],
    },
    {
      titulo: "6.2. Pagamento da locação",
      paragrafos: [
        "O pagamento realizado pelo locatário corresponde ao valor da locação contratada com o locador, acrescido, quando aplicável, das taxas cobradas pela ShareO e de outros valores expressamente informados antes da confirmação da reserva.",
        "O valor da locação é devido ao locador, descontada a remuneração da ShareO e eventuais valores cuja retenção ou desconto esteja expressamente prevista nestes Termos de Uso ou na contratação.",
        "A ShareO não adquire a propriedade dos valores destinados ao locador. Os pagamentos são processados por empresa especializada em serviços de pagamento, atualmente a Stripe, de acordo com os procedimentos e condições aplicáveis aos seus serviços.",
      ],
    },
    {
      titulo: "6.3. Processamento pela Stripe",
      paragrafos: [
        "Para viabilizar os pagamentos realizados por meio da plataforma, a ShareO utiliza os serviços da Stripe ou de outro provedor de pagamentos que venha a ser adotado.",
        "A Stripe é responsável pelo processamento das transações, inclusive pelas etapas relacionadas à autorização, processamento e liquidação dos pagamentos, conforme os serviços por ela disponibilizados.",
        "O usuário reconhece que determinadas informações necessárias ao processamento do pagamento poderão ser compartilhadas com o respectivo provedor de pagamentos, sempre nos limites necessários à execução da transação e de acordo com a legislação aplicável.",
      ],
    },
    {
      titulo: "6.4. Taxa de serviço",
      paragrafos: [
        "Pela utilização da plataforma e pelos serviços de intermediação, a ShareO cobrará do usuário a taxa de serviço informada no momento da contratação.",
        `Salvo indicação diferente apresentada antes da confirmação da locação, a taxa de serviço da ShareO corresponde a ${v.feePct}% do valor da locação.`,
        "O valor e a forma de cobrança da taxa serão apresentados ao usuário antes da conclusão da contratação.",
        `Cada transação está sujeita a um limite de ${v.maxPorTransacao}.`,
      ],
    },
    {
      titulo: "6.5. Repasse ao locador",
      paragrafos: [
        "Concluído o período de locação e não havendo pendência relacionada à devolução do bem, contestação, estorno, chargeback ou outra situação que justifique a suspensão do pagamento, o valor devido ao locador será liberado para repasse, observados os prazos e procedimentos do provedor de pagamentos.",
        `O repasse fica elegível ${v.payoutLabel} após a confirmação da devolução e é processado diariamente. Essa janela cobre o prazo de abertura de disputa.`,
        `Considerada a taxa de serviço de ${v.feePct}%, o valor destinado ao locador corresponderá, em regra, a ${repassePct}% do valor da locação, sem prejuízo de outros descontos ou valores expressamente previstos nestes Termos de Uso ou decorrentes de uma obrigação assumida pelo próprio locador.`,
        "A existência de uma disputa entre locador e locatário poderá suspender temporariamente o repasse até que a questão seja analisada e solucionada de acordo com as regras da plataforma.",
      ],
    },
    {
      titulo: "6.6. Estornos, chargebacks e contestação de pagamentos",
      paragrafos: [
        "O pagamento poderá ser estornado, bloqueado ou ter seu repasse suspenso quando houver cancelamento da locação, contestação da transação, chargeback, suspeita de fraude, determinação do provedor de pagamentos ou outra situação que, de acordo com a legislação aplicável ou com estes Termos de Uso, justifique a adoção da medida.",
        "Quando o valor já tiver sido repassado ao locador e posteriormente houver estorno, chargeback ou obrigação de restituição relacionada à locação, o locador poderá ser responsável pela devolução do valor correspondente, observado o procedimento informado pela ShareO.",
      ],
    },
    {
      titulo: "6.7. Ausência de serviços financeiros",
      paragrafos: [
        "A ShareO atua como plataforma de intermediação de locações e não presta serviços financeiros aos usuários.",
        "A ShareO não mantém contas de pagamento em nome dos usuários nem realiza, por conta própria, atividades que sejam privativas de instituições financeiras ou instituições de pagamento.",
        "Os serviços relacionados ao processamento e à liquidação dos pagamentos são realizados por provedores especializados contratados para essa finalidade.",
      ],
    },
    {
      titulo: "6.8. Alteração do provedor de pagamentos",
      paragrafos: [
        "A ShareO poderá substituir a Stripe ou contratar outros provedores de serviços de pagamento sempre que entender necessário para a operação da plataforma.",
        "A alteração do provedor não modifica as obrigações assumidas pelo locador ou pelo locatário perante a outra parte nem altera os valores da locação previamente contratados, salvo quando houver previsão expressa em sentido contrário.",
      ],
    },
  ]
}

export function clausulasPld(): SubClausula[] {
  return [
    {
      titulo: "7.1. Utilização regular da plataforma",
      paragrafos: [
        "A plataforma deverá ser utilizada exclusivamente para finalidades lícitas e de acordo com estes Termos de Uso.",
        "É proibida a utilização da ShareO para ocultar ou dissimular a origem, localização, disposição ou movimentação de valores provenientes de atividades ilícitas, bem como para qualquer outra finalidade que viole a legislação brasileira.",
      ],
    },
    {
      titulo: "7.2. Identificação dos usuários",
      paragrafos: [
        "Para realizar uma locação ou receber valores por meio da plataforma, o usuário poderá ser solicitado a fornecer informações necessárias à sua identificação e à segurança das transações.",
        "Entre essas informações poderão estar nome completo ou razão social, CPF ou CNPJ, endereço, telefone, e-mail e dados bancários ou de pagamento necessários para a realização dos repasses.",
        "A ShareO poderá solicitar informações ou documentos adicionais sempre que entender necessário para confirmar a identidade do usuário, prevenir fraudes ou cumprir obrigação legal.",
      ],
    },
    {
      titulo: "7.3. Verificação realizada pelo provedor de pagamentos",
      paragrafos: [
        "O usuário reconhece que a Stripe ou outro provedor de pagamentos utilizado pela ShareO poderá realizar procedimentos próprios de identificação e verificação, inclusive aqueles necessários para o processamento e a liquidação dos pagamentos.",
        "O fornecimento das informações solicitadas pelo provedor é condição necessária para a utilização de determinadas funcionalidades da plataforma, especialmente para o recebimento de valores pelo locador.",
      ],
    },
    {
      titulo: "7.4. Análise de transações",
      paragrafos: [
        "A ShareO poderá analisar transações e atividades realizadas na plataforma para identificar indícios de fraude, utilização indevida do serviço, movimentações incompatíveis com o perfil do usuário ou outras situações que possam representar risco à plataforma ou aos seus usuários.",
        "Para essa finalidade, poderão ser considerados, entre outros fatores, o valor e a frequência das transações, o histórico de utilização da plataforma, as informações cadastrais fornecidas e as características da operação.",
        "A ShareO poderá solicitar esclarecimentos ou documentos adicionais antes de concluir uma transação ou liberar determinado pagamento.",
      ],
    },
    {
      titulo: "7.5. Suspensão ou bloqueio",
      paragrafos: [
        "Quando houver indícios de fraude, irregularidade, utilização indevida da plataforma ou outra circunstância que justifique uma medida preventiva, a ShareO poderá suspender temporariamente a transação, restringir o acesso à conta ou interromper o repasse de valores até a conclusão da análise.",
        "A adoção dessas medidas não significa, por si só, que o usuário tenha cometido qualquer ilícito. A medida poderá ser adotada de forma preventiva para preservar a segurança da operação e dos demais usuários.",
        "Quando exigido por lei ou por determinação de autoridade competente, a ShareO poderá fornecer informações e documentos relacionados às transações realizadas na plataforma.",
      ],
    },
    {
      titulo: "7.6. Comunicação às autoridades",
      paragrafos: [
        "A ShareO poderá comunicar às autoridades competentes situações que, nos termos da legislação aplicável, devam ser comunicadas ou que apresentem indícios de prática ilícita.",
        "A ShareO não será obrigada a informar ao usuário a realização de comunicação quando a legislação aplicável determinar ou permitir que essa informação permaneça sob sigilo.",
      ],
    },
    {
      titulo: "7.7. Guarda de informações",
      paragrafos: [
        "A ShareO manterá os registros relacionados às transações realizadas por meio da plataforma pelo período necessário ao cumprimento de suas obrigações legais, contratuais e regulatórias.",
        "O tratamento das informações pessoais dos usuários será realizado de acordo com a legislação aplicável e com a Política de Privacidade da ShareO.",
      ],
    },
    {
      titulo: "7.8. Cooperação com autoridades",
      paragrafos: [
        "A ShareO poderá fornecer às autoridades competentes os dados, documentos e registros relacionados aos usuários e às transações realizadas na plataforma quando houver solicitação válida ou obrigação legal para tanto.",
        "O fornecimento de informações observará os limites estabelecidos pela legislação aplicável, inclusive as normas relativas à proteção de dados pessoais e ao sigilo das informações.",
      ],
    },
  ]
}
