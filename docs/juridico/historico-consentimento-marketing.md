# Histórico do consentimento de marketing

Texto **integral** de cada versão do consentimento da lista de interessados
(campanha de pré-lançamento), na ordem em que esteve vigente.

## Por que este arquivo existe

`lib/legal-config.ts` guarda apenas a **versão vigente**. O que o banco grava em
`FounderLead.consentVersion` é a string da versão — não o texto. Sem este
arquivo, responder *"o que exatamente eu aceitei em `marketing-v1.0`?"* (LGPD
art. 9º, VIII) dependeria de reconstituir o `git blame` do arquivo de
configuração: auditável, mas frágil a squash-merge, reescrita de branch ou
migração de repositório.

🪤 **Ao subir `MARKETING_CONSENT_VERSION`, colar aqui o texto novo antes de
mesclar.** `__tests__/unit/lib/consentimento-marketing.test.ts` reprova se o
texto vigente no código não bater com o registrado aqui para a mesma versão.

---

## Estado atual das superfícies

| Superfície | Versão | Por quê |
|---|---|---|
| Site (`lib/legal-config.ts`) | `marketing-v1.1` | fonte da verdade |
| App mobile | `marketing-v1.1` | espelho do site |
| Campanha (www.shareo.com.br) | `marketing-v1.0` | **uma atrás, de propósito** |

🪤 A campanha sobe sozinha, auto-deployada do `main`, e posta os leads na
PRODUÇÃO, cujo deploy é pulado (gated por D4). Quando ela passou a mandar v1.1
em 06/09/2026, a produção ainda não conhecia essa versão e recusou **todo lead
capturado com 422** por ~39h, com mídia paga rodando. Voltou para v1.0 até a
produção deployar. O texto de v1.0 é o verdadeiro para quem está na produção:
lá o descadastro por GET ainda é de um clique.

Para religar, **perguntar à produção** em vez de inferir por outro sinal:
edite `apps/campanha/lib/legal-config.ts` para v1.1 e rode a sonda

```
INTEGRATION_TEST_URL=https://shareo-prod.vercel.app npx jest --config apps/campanha/jest.config.ts --testPathIgnorePatterns "/node_modules/" --testPathPattern consent-version
```

Verde = a produção aceita, pode subir. Vermelho (422 `UNKNOWN_CONSENT_VERSION`)
= ainda não, reverter e esperar. Depois de subir a campanha, rodar a sonda outra
vez e atualizar a tabela acima.

🪤 O app **mobile** está em v1.1 e não quebrou por acidente de configuração, não
por trava: `apps/mobile/lib/api.ts` e os dois perfis de `apps/mobile/eas.json`
apontam para o **staging**, que deploya do `main`. No dia em que o EAS apontar
para a produção — mudança de uma linha, esperada no go-live — o APK em campo
passa a gerar o mesmo 422, e APK não se atualiza sozinho.

---

## `marketing-v1.1` — vigente desde 2026-09-06

> Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — todo e-mail nosso traz um link de cancelamento, sem precisar responder.

**O que mudou em relação à v1.0:** só a descrição do mecanismo de revogação. O
link do **corpo** do e-mail passou a abrir uma página de confirmação, porque
scanners corporativos (Microsoft Defender SafeLinks e similares) abrem links
automaticamente e descadastravam quem nunca havia clicado. O botão do provedor
de e-mail (header `List-Unsubscribe`, RFC 8058) segue em um clique.

**Escopo do tratamento: inalterado.** Mesma finalidade, mesmos canais (e-mail e
WhatsApp), mesmos dados. Por isso **leads gravados em `marketing-v1.0` seguem
válidos e não foram reconsentidos** — eles aceitaram um texto que era verdadeiro
à época, e o mecanismo de revogação ficou *mais* protetivo, não menos.

**Lição registrada:** texto de consentimento versionado não deve especificar
mecânica de UX. "Em um clique" amarrou uma declaração jurídica a um detalhe de
implementação, e um ajuste de produto virou evento de compliance. A redação
nova descreve a existência do caminho de cancelamento, não sua contagem de
passos.

**Pendente (próxima sprint):** o texto descreve **um** dos três caminhos de
revogação em produção — o link no corpo. Os outros dois são o botão do provedor
(`List-Unsubscribe`) e o canal do Encarregado (`privacidade@shareo.com.br`).
Omitir não é irregular (LGPD art. 8º §5º exige revogação facilitada e gratuita,
e o link cumpre), mas citar o canal do DPO cobriria o cenário em que o e-mail
cai no spam.

---

## `marketing-v1.0` — vigente de 2026-08-07 a 2026-09-06

> Concordo em receber comunicações sobre o lançamento do Shareo por e-mail e, se eu informar meu telefone, por WhatsApp. Posso cancelar quando quiser — todo e-mail nosso traz um link de cancelamento em um clique.

**O que introduziu:** a coleta de telefone/WhatsApp, dita explicitamente no
texto. É o marco que separa quem consentiu contato por WhatsApp de quem não
consentiu.

---

## `v1.1` — legado, até 2026-08-07

Antes desta data, os leads da campanha gravavam em `consentVersion` a versão dos
**Termos de Uso** (`CONSENT_VERSION`), não uma versão própria de marketing — a
trilha das duas coisas estava misturada. O texto exibido falava **somente de
e-mail**.

🪤 **Leads com `consentVersion = "v1.1"` NÃO consentiram contato por WhatsApp.**
Não incluir esses telefones em disparo por telefone, mesmo que o número esteja
preenchido no cadastro.

---

## Versões aceitas pela API

`KNOWN_MARKETING_CONSENT_VERSIONS` em `lib/legal-config.ts` lista todas as
versões acima. Nenhuma é removida: o APK em campo e o cache do app da campanha
continuam enviando a versão anterior por semanas depois de um bump, e recusá-la
derrubaria leads reais. A rota `app/api/founders/leads` aceita qualquer versão
conhecida e registra `console.warn` quando recebe uma legada.
