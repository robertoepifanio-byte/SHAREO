// Espelho PARCIAL de `lib/legal-config.ts` do site — a fonte da verdade é lá.
//
// 🪤 ESTE APP ESTÁ INTENCIONALMENTE UMA VERSÃO ATRÁS. O site já está em
// `marketing-v1.1`; aqui continua `marketing-v1.0` até a PRODUÇÃO deployar.
//
// Por quê: este app sobe sozinho, auto-deployado do `main`, e posta os leads em
// `NEXT_PUBLIC_SHAREO_API_URL` — que aponta para a PRODUÇÃO, cujo deploy é
// pulado pelo workflow (gated por D4). Quando a campanha passou a mandar v1.1
// em 06/09/2026, a produção ainda não conhecia essa versão: a rota
// `app/api/founders/leads` valida `consentVersion` contra
// `KNOWN_MARKETING_CONSENT_VERSIONS` e devolveu 422 UNKNOWN_CONSENT_VERSION em
// TODO lead capturado, por ~39h, com mídia paga rodando. Nenhum dos formulários
// trata esse código, então o visitante via só um erro genérico.
//
// E o texto abaixo é o VERDADEIRO para quem está na produção: lá o GET de
// `/api/founders/unsubscribe` ainda aplica o descadastro direto — um clique de
// fato. A confirmação em duas etapas só existe depois do deploy.
//
// COMO DESFAZER (na ordem):
//   1. Produção deploya.
//   2. PERGUNTAR À PRODUÇÃO se ela já aceita a versão nova — não inferir por
//      outro sinal. Editar este arquivo para v1.1 e rodar:
//
//        INTEGRATION_TEST_URL=https://shareo-prod.vercel.app npx jest --config apps/campanha/jest.config.ts --testPathIgnorePatterns "/node_modules/" --testPathPattern consent-version
//
//      Verde = pode subir. Vermelho (422 UNKNOWN_CONSENT_VERSION) = a produção
//      ainda não conhece; reverter e esperar.
//   3. Subir este arquivo para v1.1 (versão E texto), atualizar a tabela em
//      docs/juridico/historico-consentimento-marketing.md e rodar a sonda de
//      novo depois do deploy da campanha.
//
// 🪤 A trava que importa está em `__tests__/unit/lib/consentimento-marketing.test.ts`:
// a versão declarada aqui tem que estar em `KNOWN_MARKETING_CONSENT_VERSIONS`
// do site. Igualdade entre as cópias NÃO era o invariante certo — foi
// exatamente isso que ficou verde enquanto os leads eram recusados.

/**
 * Versão do consentimento de MARKETING enviada por este app.
 * Uma atrás do site, de propósito — ver o cabeçalho.
 */
export const MARKETING_CONSENT_VERSION = "marketing-v1.0"

/**
 * Texto exato do consentimento exibido no formulário de captação, e que
 * corresponde à versão declarada acima. Registrado por extenso em
 * `docs/juridico/historico-consentimento-marketing.md`.
 */
export const MARKETING_CONSENT_TEXT =
  "Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, " +
  "se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — " +
  "todo e-mail nosso traz um link de cancelamento em um clique."
