// Espelho PARCIAL de `lib/legal-config.ts` do site — a fonte da verdade é lá.
//
// 🪤 Só existe o que o app da campanha realmente usa: o formulário de captação
// (`components/FounderCaptureForm.tsx`) importa exatamente estas duas
// constantes. A versão anterior copiava sete, e as cinco não usadas viraram
// código morto que divergiu em silêncio — `POLICY_UPDATED_AT` ficou em "junho
// de 2026" enquanto o site já estava em "setembro", justamente o carimbo
// defasado que o site precisou corrigir. Copiar o que não se usa é criar
// superfície de divergência de graça.
//
// 🪤 O cabeçalho anterior dizia "atualizar SOMENTE aqui" e listava arquivos que
// não existem neste app. Era instrução ativa para editar a cópia e parar — o
// oposto do certo. Ao mudar qualquer uma destas constantes: alterar no site
// PRIMEIRO, replicar aqui, e conferir com
// `__tests__/unit/lib/consentimento-marketing.test.ts`, que reprova se as
// cópias divergirem.
//
// 🪤 ORDEM DE DEPLOY: este app sobe separado do site, e a rota
// `app/api/founders/leads` valida `consentVersion` contra a lista de versões
// conhecidas DO SITE. Subir a campanha antes do site faz todo lead virar 422 —
// captação de mídia paga perdida em silêncio. Site primeiro, sempre.

/**
 * Versão do consentimento de MARKETING da lista de interessados.
 * Espelha MARKETING_CONSENT_VERSION de `lib/legal-config.ts` — o histórico das
 * versões e a regra de bump moram lá.
 */
export const MARKETING_CONSENT_VERSION = "marketing-v1.1"

/**
 * Texto exato do consentimento exibido no formulário de captação.
 * Espelha MARKETING_CONSENT_TEXT de `lib/legal-config.ts`.
 */
export const MARKETING_CONSENT_TEXT =
  "Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, " +
  "se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — " +
  "todo e-mail nosso traz um link de cancelamento, sem precisar responder."
