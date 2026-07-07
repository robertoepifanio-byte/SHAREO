/**
 * Texto de consentimento específico para tratamento biométrico (selfie do KYC).
 * Base legal: LGPD art. 11, II, "a" (decisão jurídica C1, 2026-06-30).
 *
 * RASCUNHO gated D4 — só exibido/exigido quando a flag `biometricConsentRequired`
 * está ligada (default OFF). Fonte do texto: docs/juridico/consentimento-biometria-texto-c1.md
 * (revisão obrigatória do DPO/advogada antes do go-live).
 *
 * `BIOMETRIC_CONSENT_TEXT` é a string CANÔNICA: a UI a renderiza integralmente
 * (whitespace-pre-line) e o servidor calcula o SHA-256 da MESMA string como prova
 * de qual versão o titular leu. Não editar sem bumpar BIOMETRIC_CONSENT_VERSION.
 */

export const BIOMETRIC_CONSENT_TITLE = "Autorização para uso da sua selfie (dado biométrico)"

export const BIOMETRIC_CONSENT_SUBTITLE =
  "Para concluir a verificação da sua identidade, precisamos do seu consentimento específico para " +
  "tratar uma imagem do seu rosto. Isso é uma exigência legal porque a sua selfie é considerada um " +
  "dado pessoal sensível pela Lei Geral de Proteção de Dados (LGPD)."

/**
 * Texto integral (corpo) do consentimento. Exibido sem "leia mais" oculto.
 * Renderizar com `whitespace-pre-line` para preservar os parágrafos.
 */
export const BIOMETRIC_CONSENT_TEXT = [
  "1. O que vamos coletar. Uma fotografia do seu rosto (selfie), capturada por você neste fluxo, segurando o documento de identidade que já foi enviado na etapa anterior.",
  "2. Por que essa imagem é tratada como dado sensível. A LGPD classifica imagens faciais usadas para confirmar a identidade de uma pessoa como dado pessoal sensível de natureza biométrica (art. 5º, II e art. 11). Por isso, ela recebe uma proteção reforçada e não pode ser tratada com base em “interesse legítimo”: a própria lei exige que você consinta especificamente para esta finalidade.",
  "3. Finalidade. A sua selfie será utilizada exclusivamente para: confirmar que você é a pessoa do documento enviado na etapa anterior; e prevenir fraudes e o uso indevido de identidades de terceiros na plataforma. Sem uso secundário: sua selfie não será usada para reconhecimento facial em outras situações, para marketing, para treinar modelos de inteligência artificial, para enriquecer seu perfil público, nem será compartilhada com terceiros que não a própria equipe de verificação da ShareO.",
  "4. Base legal. Tratamento realizado com base no art. 11, inciso II, alínea “a” da LGPD (consentimento específico e destacado do titular para finalidades específicas).",
  "5. Quem vai ter acesso. Você, pelo seu painel “Minha Conta”; e apenas analistas autorizados da equipe ShareO (perfil SuperAdmin ou Operacional), exclusivamente para conduzir a verificação de identidade. Todo acesso de um analista à sua selfie é registrado em log de auditoria interno. Em hipótese alguma a selfie será publicada no seu perfil, em anúncios ou em qualquer área visível a outros usuários.",
  "6. Onde sua selfie fica armazenada. Em área privada e criptografada da infraestrutura da ShareO (bucket privado id-docs no Supabase, região Brasil), com acesso apenas pelo servidor — não por links públicos.",
  "7. Por quanto tempo. Sua selfie será mantida somente enquanto este consentimento estiver vigente. A imagem será apagada na primeira das seguintes situações: você revogar este consentimento; você solicitar a exclusão da sua conta; ou a ShareO concluir que não precisa mais da imagem para a finalidade declarada. Mesmo após a exclusão da imagem, manteremos por 5 anos apenas o registro de que você consentiu (data, hora, versão do texto lido, IP de origem) — sem a imagem em si — como prova de cumprimento legal.",
  "8. Seus direitos como titular. A qualquer momento e gratuitamente, você pode: confirmar o tratamento e acessar os dados relacionados; pedir correção ou substituição da imagem; revogar este consentimento (o tratamento é interrompido e a imagem apagada); pedir portabilidade dos dados do seu KYC; pedir informações sobre compartilhamento (não compartilhamos sua selfie com nenhum terceiro alheio à equipe de verificação da ShareO); e apresentar reclamação à Autoridade Nacional de Proteção de Dados (ANPD).",
  "9. Como revogar. A qualquer momento, sem justificar, por dois caminhos: pelo painel Minha Conta > Verificação de identidade > Revogar consentimento biométrico; ou pelo e-mail do Encarregado de Dados (DPO): privacidade@shareo.com.br. A revogação não apaga retroativamente os efeitos do uso lícito da imagem até aquele momento (se você já tinha sido aprovado no KYC, a aprovação continua válida — apenas a imagem é apagada).",
  "10. Consequências de não consentir. Você pode recusar sem qualquer penalidade na sua conta. Porém, a verificação de identidade exige a selfie. Sem ela, sua conta permanece não verificada, o que pode limitar funcionalidades específicas. Você continua podendo usar a ShareO nos limites de uma conta não verificada.",
  "11. Quem é o Controlador. ShareO Marketplace de Aluguel Ltda., na qualidade de Controladora dos seus dados pessoais para esta finalidade. Encarregada de Dados (DPO): canal privacidade@shareo.com.br.",
].join("\n\n")

/** Texto exato do checkbox de aceite (separado do aceite dos Termos). */
export const BIOMETRIC_CONSENT_CHECKBOX =
  "Eu li e consinto especificamente com o tratamento da minha selfie como dado pessoal sensível de " +
  "natureza biométrica, exclusivamente para a finalidade de verificação da minha identidade na ShareO, " +
  "conforme o texto acima e nos termos do art. 11, II, “a” da LGPD. Compreendo que posso revogar " +
  "este consentimento a qualquer momento."
