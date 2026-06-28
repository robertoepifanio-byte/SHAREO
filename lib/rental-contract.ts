/**
 * lib/rental-contract.ts
 *
 * TEXTO DO CONTRATO DE LOCAÇÃO DE BENS MÓVEIS — ShareO
 *
 * ⚠️  RASCUNHO — PENDENTE DE REVISÃO JURÍDICA (D4)
 *     Este texto NÃO deve ser apresentado como contrato definitivo ou com valor
 *     jurídico final. Aguarda parecer do consultor/advogado responsável pelo D4.
 *     Questão #6 do briefing: "Civil — contrato de locação e risco sem caução
 *     (Código Civil, locação de coisas — arts. 565+)."
 *
 * Versão:  v1.0-rascunho
 * Vigente: pendente de aprovação jurídica (D4)
 *
 * Ao publicar a versão final, incrementar RENTAL_CONTRACT_VERSION e atualizar
 * RENTAL_CONTRACT_TEXT — isso invalida os hashes anteriores e força novo aceite
 * (o guard no POST /api/bookings rejeita a versão antiga quando a feature está ON).
 */

import crypto from "crypto"

/**
 * Versão vigente do contrato de locação.
 * Formato: semver semântico com sufixo de estado.
 * Exemplos: "v1.0-rascunho" → "v1.0" (pós-D4, versão final).
 */
export const RENTAL_CONTRACT_VERSION = "v1.0-rascunho"

/**
 * Texto integral do modelo de Contrato de Locação de Bens Móveis.
 *
 * ⚠️  RASCUNHO — PENDENTE DE REVISÃO JURÍDICA (D4)
 *
 * Estruturado com base na Questão #6 do briefing D4 e nos arts. 565–578 do
 * Código Civil (locação de coisas). Cláusulas marcadas com [REVISAR] indicam
 * pontos específicos que dependem do parecer jurídico.
 */
export const RENTAL_CONTRACT_TEXT = `
CONTRATO DE LOCAÇÃO DE BEM MÓVEL — ShareO

⚠️ RASCUNHO — PENDENTE DE REVISÃO JURÍDICA (D4)
Este documento é um modelo preliminar elaborado pela equipe ShareO para fins
de implementação técnica. Não constitui aconselhamento jurídico e não deve ser
tratado como contrato definitivo até a aprovação do parecer jurídico (D4).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PARTES

(a) LOCATÁRIO: o usuário que solicita a reserva, identificado pelo cadastro na
    plataforma ShareO (nome, e-mail, CPF/CNPJ verificados).

(b) LOCADOR (PROPRIETÁRIO): o usuário que anuncia o bem, identificado pelo
    cadastro na plataforma ShareO (nome, e-mail, CPF/CNPJ verificados).

(c) INTERMEDIADORA: ShareO Marketplace de Aluguel LTDA (CNPJ a inserir após
    constituição formal — [REVISAR: pendente D4 societário]), doravante
    denominada "ShareO", que atua como plataforma intermediadora e não é parte
    no contrato de locação em si.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 1 — OBJETO

1.1. O presente contrato tem por objeto a locação temporária do(s) bem(ns)
     móvel(is) descrito(s) no anúncio da plataforma ShareO (adiante "Item"),
     pelo período e nas condições definidas no ato da reserva.

1.2. O contrato de locação é celebrado diretamente entre Locatário e Locador,
     sendo a ShareO mera intermediadora tecnológica, nos termos dos arts. 565
     e seguintes do Código Civil.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 2 — PRAZO E RETIRADA

2.1. O prazo de locação, a data/hora de retirada e a data/hora de devolução
     estão especificados na reserva confirmada pela plataforma.

2.2. A retirada é condicionada à validação do código de retirada gerado pela
     plataforma, que comprova o início da locação.

2.3. O atraso na devolução sujeita o Locatário à taxa de atraso conforme
     política da plataforma vigente na data da reserva.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 3 — PREÇO E PAGAMENTO

3.1. O valor total da locação é o exibido na tela de reserva, calculado com
     base na modalidade (diária/semanal/mensal) e no período selecionado.

3.2. A ShareO retém taxa de serviço de 15% (quinze por cento) sobre o valor
     da locação, repassando o valor líquido ao Locador conforme política de
     repasse da plataforma. [REVISAR: estrutura de repasse — enquadramento
     Lei 12.865/2013 depende do parecer D4.]

3.3. O teto por transação no período de lançamento é de R$ 500,00 (quinhentos
     reais). [REVISAR: manter ou ajustar pós-D4.]

3.4. Não há caução exigida no presente contrato. [REVISAR: alocação do risco
     de dano/perda sem caução — arts. 569–570 CC — depende do parecer D4.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 4 — OBRIGAÇÕES DO LOCATÁRIO (arts. 569 CC)

4.1. Usar o Item conforme sua destinação e com diligência de "bom pai de
     família" (CC, art. 569, II).

4.2. Não sublocar, emprestar ou ceder o Item a terceiros sem consentimento
     expresso do Locador.

4.3. Restituir o Item no estado em que o recebeu, ressalvado o desgaste
     natural decorrente do uso normal.

4.4. Comunicar ao Locador, via chat da plataforma, qualquer dano, avaria ou
     fato superveniente que afete o Item durante o período de locação.

4.5. Devolver o Item na data e hora acordadas, sob pena de taxa de atraso.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 5 — OBRIGAÇÕES DO LOCADOR (arts. 566–567 CC)

5.1. Entregar o Item em perfeitas condições de uso, conforme descrito no
     anúncio (condição, voltagem, acessórios, regras de uso).

5.2. Garantir ao Locatário o uso pacífico do Item durante a locação.

5.3. Responder por vícios ou defeitos do Item anteriores à locação.

5.4. Não alterar as condições do anúncio após a confirmação da reserva.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 6 — RESPONSABILIDADE E RISCO [REVISAR COM JURÍDICO — D4]

6.1. O Locatário responde pelos danos causados ao Item durante o período de
     locação, exceto os decorrentes de uso normal ou de vício preexistente.

6.2. Disputas sobre danos ou estado do Item são submetidas ao painel
     administrativo da ShareO, cuja decisão é final para fins da plataforma,
     sem prejuízo das vias judiciais.

6.3. A ShareO, na qualidade de intermediadora, não responde por danos diretos
     decorrentes de atos do Locatário ou do Locador, ressalvada a
     responsabilidade nos termos do CDC e do Marco Civil da Internet.
     [REVISAR: regime CDC art. 14 × Marco Civil art. 19 — pendente D4.]

6.4. [REVISAR: ausência de caução — mecanismo alternativo de garantia a
     definir com base no parecer D4 (arts. 569–570 CC).]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 7 — CANCELAMENTO E ARREPENDIMENTO

7.1. Cancelamentos seguem a política vigente na plataforma no momento da
     reserva (prazos e percentuais de reembolso disponíveis nos Termos de Uso).

7.2. [REVISAR: direito de arrependimento (art. 49 CDC) aplicável a contratos
     celebrados fora do estabelecimento — aplicabilidade a aluguel de bens
     móveis intermediado online depende do parecer D4.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 8 — PRIVACIDADE E DADOS

8.1. O tratamento de dados pessoais das partes segue a Política de Privacidade
     da ShareO, em conformidade com a LGPD (Lei 13.709/2018).

8.2. O registro de aceite deste contrato (data, hora, versão e IP) é mantido
     pela plataforma como trilha de auditoria pelo prazo legal aplicável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CLÁUSULA 9 — FORO

9.1. As partes elegem o foro da comarca do domicílio do Locatário para dirimir
     eventuais controvérsias decorrentes deste contrato, renunciando a qualquer
     outro, por mais privilegiado que seja.
     [REVISAR: foro de eleição em contrato de adesão eletrônico — CDC art. 51.]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ RASCUNHO — PENDENTE DE REVISÃO JURÍDICA (D4)
Versão: ${RENTAL_CONTRACT_VERSION}
`.trim()

/**
 * Calcula o hash SHA-256 do texto do contrato.
 * Usado para registro forense no ContractAcceptance.contractTextHash.
 * O hash muda automaticamente se o texto mudar — garantia de integridade.
 */
export function hashContractText(text: string): string {
  return crypto.createHash("sha256").update(text, "utf8").digest("hex")
}

/** Hash pré-computado do texto vigente (evita recalcular a cada request). */
export const RENTAL_CONTRACT_TEXT_HASH = hashContractText(RENTAL_CONTRACT_TEXT)
