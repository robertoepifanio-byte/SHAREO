/**
 * Identificação da pessoa jurídica que opera a plataforma, e a data de
 * atualização dos documentos legais.
 *
 * Moradia: este pacote, e não `lib/legal-config.ts` do marketplace, porque a
 * landing da campanha (`apps/campanha`) publica os MESMOS documentos e não
 * importa nada da raiz. `lib/legal-config.ts` reexporta daqui, então todo
 * import antigo do site continua funcionando.
 */

/** Data da última atualização dos documentos (exibição amigável). */
// 🪤 Esteve em "junho de 2026" enquanto a Política mudou de substância três vezes
// (02/09 retenção, 03/09 transferência internacional, 04/09 cookies e analytics).
// Carimbo de data que não acompanha o texto faz o leitor pular a versão nova.
export const POLICY_UPDATED_AT = "setembro de 2026"

/**
 * Data da última revisão do documento /politicas, que tem ciclo próprio e é
 * mais específica (dia, não só mês) que a data dos demais.
 *
 * JURÍDICO: a confirmar no sign-off do D4 — §1.8 promete aviso prévio de 30 dias
 * para alterações substanciais, e a revisão de 2026-08-20 (ADR-028: PSP passa a
 * ser Stripe) altera as seções de pagamento, compartilhamento de dados e
 * reembolso. Avaliar com a advogada se exige bump de CONSENT_VERSION.
 * 04/09/2026: §2.3 (Vercel e Upstash entram, Google Analytics sai) e §5.2
 * (analytics de terceiros não existe; contagem agregada de visualizações existe).
 * 23/09/2026: §5.2 declara o Google Tag Manager da landing (F-13 do RIPD).
 */
export const POLITICAS_UPDATED_AT = "23 de setembro de 2026"

/**
 * Identificação da pessoa jurídica que opera a plataforma.
 *
 * Obrigação legal, não enfeite: o CDC (art. 44) e o Decreto 7.962/2013 (art. 2º, I —
 * comércio eletrônico) exigem que razão social, CNPJ e endereço da sede apareçam
 * em local de destaque. Sem isso, os Termos ficam sujeitos a alegação de nulidade
 * já no primeiro dia de operação.
 *
 * Fonte única de propósito: os mesmos dados aparecem nos Termos, na Política de
 * Privacidade (onde identificam o CONTROLADOR, LGPD art. 9º, I) e em /politicas —
 * e agora também nas três páginas da landing da campanha. Cópias literais
 * divergiriam na primeira alteração de endereço. O app mobile espelha esta
 * constante em `apps/mobile/lib/legalConfig.ts` (o app não importa deste pacote)
 * e um teste compara os dois valores.
 *
 * 🪤 `razaoSocial` é a da RECEITA, não a de rascunho. Os documentos jurídicos
 * escritos ANTES da constituição (RIPD, consentimento de biometria) dizem
 * "ShareO Marketplace de Aluguel Ltda." — nome que nunca existiu no registro.
 * O CNPJ 68.512.556/0001-09 saiu em 11/08/2026 com outra denominação. Num bloco
 * cuja única função é identificar a PJ, a razão social errada anula o propósito.
 */
const ENDERECO_SEDE = "Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, CEP 05424-150"

export const LEGAL_ENTITY = {
  razaoSocial: "SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA",
  cnpj: "68.512.556/0001-09",
  /**
   * Endereço da sede, conforme o **Comprovante de Inscrição e de Situação
   * Cadastral** da Receita (confirmado pelo fundador em 2026-08-24). Campos do
   * comprovante: R PAIS LEME · 215 · CONJ 1713 · 05.424-150 · PINHEIROS ·
   * SAO PAULO · SP.
   *
   * 🪤 A fonte é o comprovante, não busca em agregador de CNPJ — site de
   * terceiro fica desatualizado, e endereço errado aqui é o mesmo defeito da
   * razão social de rascunho que quase entrou (ver a nota acima).
   *
   * O tipo continua aceitando `null` de propósito: os componentes omitem a
   * linha em vez de renderizar vazio, e os testes exercitam os dois estados.
   */
  enderecoSede: ENDERECO_SEDE as string | null,
  emailContato: "suporte@shareo.com.br",
} as const
