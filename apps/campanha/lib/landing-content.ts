import { FOUNDER_FORM_ANCHOR_ID } from "@/lib/config"
import type { ItemIconName } from "@/components/landing/icons/ItemIcon"

/**
 * Conteúdo da landing em um arquivo só.
 *
 * Vive separado dos componentes por um motivo específico: os números aqui têm
 * fonte da verdade em OUTRO app (o marketplace, que esta landing não importa) e
 * precisam ser testáveis sem montar árvore React. O teste de guarda-corpo em
 * __tests__/unit/lib/landing-content.test.ts trava cada um deles.
 *
 * Regras que valem para toda copy deste arquivo:
 *
 * 1. TEMPO FUTURO. Nada está no ar: descrever o serviço no presente seria
 *    anunciar algo que ainda não existe (CDC art. 30/37). Os títulos de seção
 *    estabelecem o enquadramento ("Como vai funcionar", "vai ser") e as frases
 *    internas podem então descrever a mecânica.
 * 2. Sem taxa de plataforma. O percentual é configurável no banco do ShareO
 *    (getPlatformFeeRate) e esta landing não tem banco — citá-lo aqui seria
 *    hardcode de um valor que o admin pode mudar.
 * 3. Sem projeção de renda. "Renda média por proprietário" foi removida do
 *    produto por risco CDC art. 30/37 e não volta pela porta dos fundos.
 */

export const ANCORAS = {
  paraQuem: "para-quem",
  comoFunciona: "como-funciona",
  seguranca: "seguranca",
  fundadores: "fundadores",
  faq: "faq",
} as const

export const CTA_HREF = `#${FOUNDER_FORM_ANCHOR_ID}`

/**
 * Âncoras que a página precisa continuar honrando mesmo sem ninguém linkar
 * para elas aqui dentro.
 *
 * Eram os destinos dos banners de programa, aposentados neste redesenho, e
 * podem estar em anúncio já publicado — link quebrado ali cai numa página que
 * não rola para lugar nenhum, e quem pagou pelo clique não descobre.
 *
 * Estão declaradas (e não só comentadas no JSX) porque a invariante precisa
 * MORDER: o teste de PreLaunchHome exige cada uma presente no documento. Sem
 * isso, a próxima limpeza apaga as duas e a suíte continua verde.
 */
export const ANCORAS_LEGADO = ["programa-fundadores", "programa-embaixadores"] as const

export const NAV_LINKS = [
  { rotulo: "Como funciona", href: `#${ANCORAS.comoFunciona}` },
  { rotulo: "Para quem é", href: `#${ANCORAS.paraQuem}` },
  { rotulo: "Segurança", href: `#${ANCORAS.seguranca}` },
  { rotulo: "Fundadores", href: `#${ANCORAS.fundadores}` },
  { rotulo: "FAQ", href: `#${ANCORAS.faq}` },
] as const

/** Microcopy que acompanha os CTAs principais. */
export const CTA_MICROCOPY = "Cadastro gratuito · Sem compromisso · Acesso antecipado"

export const HERO_BENEFICIOS = [
  {
    icone: "moeda" as const,
    titulo: "Ganhe uma renda extra",
    texto: "com coisas que você já tem em casa.",
  },
  {
    icone: "local" as const,
    titulo: "Alugue perto de você",
    texto: "sem precisar comprar aquilo que usa poucas vezes.",
  },
  {
    icone: "escudo" as const,
    titulo: "Negocie com mais segurança",
    texto: "com avaliações, suporte e regras combinadas antes.",
  },
] as const

/**
 * Os dois lados do marketplace.
 *
 * Os CTAs não pré-selecionam a intenção: os dois levam ao mesmo formulário, e a
 * escolha "quero anunciar / quero alugar" é o primeiro campo dele. Pré-seleção
 * exigiria mexer no FounderCaptureForm, que é intocável.
 */
export const DOIS_LADOS = [
  {
    lado: "proprietario" as const,
    titulo: "Eu tenho algo para alugar",
    texto: "Transforme coisas que estão paradas em renda extra. Anuncie seus itens, defina suas condições e encontre pessoas interessadas perto de você.",
    cta: "Quero ganhar dinheiro",
    altFoto: "Pessoa segurando uma furadeira",
  },
  {
    lado: "locatario" as const,
    titulo: "Eu preciso de algo",
    texto: "Use o que você precisa sem precisar comprar. Encontre itens perto de você, compare opções e alugue pelo período de que realmente precisa.",
    cta: "Quero alugar",
    altFoto: "Pessoa procurando um item pelo celular",
  },
] as const

/**
 * Itens citados no texto da seção "coisas paradas".
 *
 * Ficam no corpo do texto, não nos chips: o objetivo é a pessoa se reconhecer
 * ("eu tenho uma furadeira"). Os chips ao lado mostram CATEGORIAS — e as
 * categorias reais são as de PRECOS, não as do mockup (que trazia "Veículos",
 * "Equipamentos", "Câmeras" e "Som e imagem", nenhuma das quais existe no
 * banco do ShareO).
 */
export const ITENS_PARADOS_EXEMPLOS = "Furadeira. Câmera. Bicicleta. Projetor. Caixa de som. Escada."

/** Último tile do grid de categorias — o catálogo não se esgota nas 6. */
export const CATEGORIAS_EXTRA_ROTULO = "E muito mais…"

/**
 * Preços de referência por categoria.
 *
 * Fonte da verdade: CATEGORY_DATA em app/ganhar/_EarningsCalc.tsx (diárias) e
 * CATEGORIAS em app/anunciar/estimativa/_Calculadora.tsx (exemplos de item).
 * As categorias são exatamente as 6 que existem em prisma/seed.ts — `veiculos`
 * e `bebes` aparecem no _EarningsCalc mas NÃO existem no banco, então ficam de
 * fora para a landing não prometer uma categoria inexistente.
 *
 * ⚠️ `casa-jardim` é slug legado: o nome de exibição é "Eletrodomésticos".
 */
export const PRECOS: ReadonlyArray<{
  slug: string
  nome: string
  icone: ItemIconName
  diaria: number
  exemplos: string
}> = [
  { slug: "casa-jardim", nome: "Eletrodomésticos", icone: "lavadora", diaria: 30, exemplos: "geladeira, micro-ondas, lavadora" },
  { slug: "ferramentas", nome: "Ferramentas", icone: "furadeira", diaria: 35, exemplos: "furadeira, serra, esmeril" },
  { slug: "construcao", nome: "Construção", icone: "escada", diaria: 45, exemplos: "escada, betoneira, andaime" },
  { slug: "esporte", nome: "Esporte/Lazer", icone: "bicicleta", diaria: 60, exemplos: "bicicleta, barraca, SUP" },
  { slug: "festas", nome: "Festas", icone: "som", diaria: 80, exemplos: "som, tendas, mesas" },
  { slug: "eletronicos", nome: "Eletrônicos", icone: "projetor", diaria: 100, exemplos: "câmera, projetor, drone" },
]

/**
 * Obrigatório sempre que os preços aparecerem: quem define o preço é o
 * anunciante, e estes são valores de referência — não uma tabela da plataforma
 * nem uma promessa de ganho.
 */
export const PRECOS_DISCLAIMER =
  "Valores de referência para você ter uma ideia. Quem define o preço de cada item é o próprio anunciante."

export const TRILHAS = {
  tem: {
    etiqueta: "Para quem tem",
    passos: [
      { titulo: "Anuncie", texto: "Você cadastra seu item em poucos passos, com fotos e descrição." },
      { titulo: "Encontre", texto: "Pessoas próximas encontram o que você tem a oferecer." },
      { titulo: "Combine", texto: "Vocês combinam preço, período e condições antes de fechar." },
      { titulo: "Alugue", texto: "A locação acontece e aquilo que estava parado vira renda." },
    ],
  },
  precisa: {
    etiqueta: "Para quem precisa",
    passos: [
      { titulo: "Procure", texto: "Você encontra o que precisa perto de onde está." },
      { titulo: "Escolha", texto: "Compara itens, preços e condições antes de decidir." },
      { titulo: "Reserve", texto: "Combina o período pelo qual vai usar." },
      { titulo: "Use", texto: "Paga apenas pelo tempo de que realmente precisa." },
    ],
  },
} as const

/**
 * Pilares de confiança. Descrevem o que a plataforma VAI oferecer — nenhum
 * deles cita valor, prazo ou percentual, justamente para não virar promessa
 * mensurável antes do lançamento.
 */
export const PILARES = [
  { icone: "estrela" as const, titulo: "Avaliações", texto: "Você vai conhecer a reputação de quem está do outro lado antes de fechar negócio." },
  { icone: "perfil" as const, titulo: "Perfis verificados", texto: "Mais informações sobre quem aluga e quem anuncia, para decidir com segurança." },
  { icone: "suporte" as const, titulo: "Suporte", texto: "Uma equipe acompanhando as locações e disponível quando algo fugir do combinado." },
  { icone: "escudo" as const, titulo: "Registro por fotos", texto: "Fotos na entrega e na devolução documentam o estado do item nos dois momentos." },
  { icone: "documento" as const, titulo: "Condições claras", texto: "Preço, período e condições ficam combinados por escrito antes da retirada." },
] as const

export const FUNDADORES_VAGAS = 1000

export const FUNDADORES_CHAMADA =
  "Os primeiros usuários ajudam a construir o marketplace. Faça parte dessa jornada."

/**
 * O que o Fundador recebe.
 *
 * Nenhum item aqui é uma promessa financeira quantificada — de propósito. A
 * arte antiga do programa citava "taxa reduzida", que NÃO foi trazida: não
 * existe percentual definido em lugar nenhum do código, e inventar um número
 * criaria uma promessa sem lastro. "Condições especiais de lançamento" é o
 * mesmo compromisso que a ListaVIP já fazia, no mesmo grau de precisão.
 */
export const FUNDADORES_BENEFICIOS = [
  "Conheça o ShareO antes do lançamento oficial",
  "Teste novas funcionalidades em primeira mão",
  "Ajude a definir melhorias do produto",
  "Condições especiais de lançamento",
  "Acesso prioritário a novidades",
  "Verificação de perfil gratuita",
] as const

/**
 * Faixas do Programa Embaixadores.
 *
 * 2/3/5% — fonte da verdade é getTierCommissionRateBp em lib/ambassador.ts.
 * ⚠️ 3/5/7 circulou em material antigo e está MORTO desde 12/08/2026.
 *
 * O percentual incide sobre a comissão que a plataforma recebe, NUNCA sobre o
 * valor da locação. Ver EMBAIXADORES_NOTA — a nota não é opcional: sem ela a
 * copy sugere um ganho muito maior do que o real.
 */
export const EMBAIXADOR_TIERS = [
  { nome: "Bronze", faixa: "1 a 10 indicados", percentual: 2 },
  { nome: "Prata", faixa: "11 a 50 indicados", percentual: 3 },
  { nome: "Ouro", faixa: "acima de 50 indicados", percentual: 5 },
] as const

export const EMBAIXADORES_NOTA =
  "O percentual incide sobre a comissão que a ShareO recebe em cada locação do seu indicado — não sobre o valor do aluguel."

/**
 * FAQ. Respostas encurtadas a partir de app/ajuda/page.tsx, com duas
 * adaptações: nenhuma cita a taxa de serviço (ver regra 2 no topo) e todas
 * falam no futuro.
 *
 * A primeira pergunta é a mais importante da página: quem chega pela mídia paga
 * precisa entender em dez segundos que ainda não dá para alugar nada.
 */
export const FAQ = [
  {
    p: "O ShareO já está funcionando?",
    r: "Ainda não. Estamos em pré-lançamento e abrindo as cidades por etapas. Quem entra na lista agora é avisado assim que os cadastros abrirem na sua região.",
  },
  {
    p: "Vou pagar alguma coisa para anunciar?",
    r: "Não. Criar anúncios, receber solicitações e conversar pelo chat serão gratuitos. A ShareO só é remunerada quando uma locação é concluída com sucesso.",
  },
  {
    p: "Como vou definir o preço do meu item?",
    r: "Você define o preço por dia. A referência que sugerimos é uma diária entre 3% e 5% do valor do bem; o preço semanal equivale a 3 diárias e o mensal a 15. O formulário de anúncio vai calcular isso para você.",
  },
  {
    p: "Como o pagamento vai funcionar?",
    r: "O locatário paga pela plataforma e o valor fica retido — não vai direto para o proprietário. Ele só é liberado depois que a devolução é confirmada, o que protege os dois lados.",
  },
  {
    p: "Vai existir caução?",
    r: "Não nesta primeira versão. A proteção será feita por fotos de check-in e check-out vinculadas à reserva e por um canal de disputas em que a equipe ShareO media casos de dano.",
  },
  {
    p: "Entrar na lista me compromete com alguma coisa?",
    r: "Não. É gratuito, não pedimos dados de pagamento e você pode sair da lista quando quiser.",
  },
] as const

/**
 * Artes que o fundador vai entregar. Enquanto forem `false`, os componentes
 * renderizam ArtePlaceholder — uma caixa com a proporção EXATA da arte final,
 * para o CLS não mudar quando a imagem entrar.
 *
 * Passo a passo para ligar: ver a seção "Artes" no plano do redesign e o
 * cabeçalho de scripts/generate-campaign-banners.mjs.
 */
export const ARTE = {
  heroPronta: false,
  fotosProntas: false,
} as const
