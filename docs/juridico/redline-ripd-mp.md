# REDLINE — RIPD: incluir Mercado Pago como Operador e corrigir "merchant of record"

> **RASCUNHO GATED — nao publicar.** Este documento lista as edicoes concretas a fazer em [`rascunho-ripd.md`](rascunho-ripd.md) para refletir o Mercado Pago como operador de dados financeiros e corrigir a descricao de "merchant of record". Aplicar apos validacao do DPO/advogada. Complementa [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md) Secao B.3.

**Data:** 2026-06-30 (s41)
**Base:** [`parecer-juridico-revisado-mp.md`](parecer-juridico-revisado-mp.md) item 3 (LGPD) + [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) item 3 + texto atual [`rascunho-ripd.md`](rascunho-ripd.md).

---

## Como usar este documento

Cada edicao abaixo indica:
- **Secao do RIPD:** referencia ao cabecalho em `rascunho-ripd.md`.
- **Texto atual:** trecho a ser substituido ou complementado (exato o suficiente para localizar no arquivo).
- **Texto proposto:** nova redacao.
- **Motivo:** fundamento legal ou fático.

As edicoes sao independentes entre si e podem ser aplicadas na ordem que for mais conveniente. Todas devem ser validadas pelo DPO/advogada antes de o RIPD ser considerado finalizado.

---

## Edicao 1 — Secao B: corrigir "merchant of record"

**Secao do RIPD:** `## Secao B — Descricao do Tratamento e Finalidades`, segundo paragrafo.

**Texto atual:**
> "A plataforma atua como **intermediadora e merchant of record** no fluxo financeiro, retendo 15% de taxa de servico e repassando o liquido ao proprietario."

**Texto proposto:**
> "A plataforma atua como **intermediadora** no fluxo de locacao. Os pagamentos sao processados pelo **Mercado Pago (Mercado Pago Instituicao de Pagamento Ltda.)**, que atua como **operador de dados financeiros** e e responsavel pelo split do valor (taxa de servico da ShareO + liquido do locador) e pelo repasse semanal ao locador. A ShareO **nao e *merchant of record*** e **nao custodia** os valores das transacoes — esta funcao e exercida pelo Mercado Pago como PSP licenciado pelo Banco Central. A ShareO permanece como **controladora** dos dados pessoais que coleta para a intermediacao."

**Motivo:** o parecer D4 formalizado confirma que a ShareO deixa de ser merchant of record com a adocao do Modelo B (split via Mercado Pago — ADR-026). Manter "merchant of record" no RIPD e factualmente incorreto apos essa decisao e pode induzir a ANPD/advogada a erros na avaliacao do tratamento de dados financeiros.

---

## Edicao 2 — Secao B, tabela de finalidades: atualizar "Intermediacao de locacao"

**Secao do RIPD:** `## Secao B — Descricao do Tratamento e Finalidades`, tabela de finalidades, linha "Intermediacao de locacao".

**Texto atual:**
> | **Intermediacao de locacao** | Processar reservas, pagamentos e repassar valores | Execucao de contrato (art. 7 V LGPD) |

**Texto proposto:**
> | **Intermediacao de locacao** | Processar reservas e facilitar pagamentos via Mercado Pago (PSP). O processamento financeiro (split, custodia e repasse) e responsabilidade do Mercado Pago como operador. A ShareO trata os dados de identidade e reserva necessarios para acionar o PSP. | Execucao de contrato (art. 7 V LGPD) |

**Motivo:** distinguir o tratamento de dados feito pela ShareO (intermediacao) do tratamento feito pelo MP (financeiro). Essa distincao e relevante para o mapeamento de responsabilidades entre controlador e operador (LGPD art. 37-40).

---

## Edicao 3 — Secao C.6: atualizar dados de pagamento para o modelo MP

**Secao do RIPD:** `### C.6 Dados de pagamento (models owner_payment_accounts, platform_transactions, payouts)`.

**Texto atual (tabela completa):**
> | `pixKey` | Chave PIX do proprietario (CPF/CNPJ/e-mail/telefone/aleatoria) | Dado financeiro sensivel | Art. 7 V (execucao de contrato — repasse) + art. 7 II (fiscal) |
> | `pixKeyType` | Tipo da chave PIX | Dado financeiro | Art. 7 V |
> | `holderName`, `bankName` | Dados da conta bancaria do proprietario | Dado financeiro | Art. 7 V + art. 7 II |
> | `amount`, `status`, `processedAt` | Valores e status de repasse | Dado financeiro | Art. 7 V + art. 7 II |

**Texto proposto — substituir a tabela por:**

> **Situacao atual (fase de validacao em staging):**
> | Campo | Descricao | Classificacao | Base legal |
> |---|---|---|---|
> | `pixKey` | Chave PIX do proprietario (CPF/CNPJ/e-mail/telefone/aleatoria) | Dado financeiro sensivel | Art. 7 V + art. 7 II |
> | `pixKeyType` | Tipo da chave PIX | Dado financeiro | Art. 7 V |
> | `holderName`, `bankName` | Dados da conta bancaria do proprietario | Dado financeiro | Art. 7 V + art. 7 II |
> | `amount`, `status`, `processedAt` | Valores e status de repasse (PIX manual — provisorio) | Dado financeiro | Art. 7 V + art. 7 II |
>
> **Situacao pos-integracao Mercado Pago (Modelo B):**
> | Campo | Descricao | Classificacao | Base legal |
> |---|---|---|---|
> | `mpAccessTokenEncrypted` | Token OAuth do proprietario no Mercado Pago (AES-256-GCM) | Dado financeiro sensivel / credencial | Art. 7 V (execucao de contrato — viabiliza o split/repasse pelo MP) |
> | `mpRefreshTokenEncrypted` | Token de renovacao OAuth do MP (AES-256-GCM) | Dado financeiro sensivel / credencial | Art. 7 V |
> | `mpUserId` | Identificador do proprietario no ecossistema Mercado Pago | Dado pessoal / referencia | Art. 7 V |
> | `amount`, `status`, `processedAt` | Valores e status de repasse processado pelo MP | Dado financeiro | Art. 7 V + art. 7 II |
> | `platformTransactions.*` | Registro de cada split (fee, liquido, booking) | Dado financeiro | Art. 7 V + art. 7 II (retencao fiscal 5 anos) |
>
> **Nota para o DPO:**
> Os tokens OAuth (`mpAccessTokenEncrypted`, `mpRefreshTokenEncrypted`) sao credenciais de acesso a conta do proprietario no Mercado Pago. Sao criptografados em AES-256-GCM no nivel da aplicacao e nunca exibidos ou logados. O acesso e restrito ao processamento do checkout e webhook. Confirmar se esses tokens exigem base legal adicional (interesse legitimo com avaliacao de necessidade) alem da execucao de contrato.

**Motivo:** a Secao C.6 atual descreve apenas o fluxo de PIX manual (provisorio, usado em staging). Apos a integracao do Mercado Pago (Modelo B), os dados de pagamento mudam substancialmente — os tokens OAuth sao dados novos que precisam ser documentados no RIPD.

---

## Edicao 4 — Secao D.2: incluir Mercado Pago na transmissao a terceiros

**Secao do RIPD:** `### D.2 Uso e processamento`, bloco "Transmissao para terceiros:".

**Texto atual:**
> Transmissao para terceiros:
> - **Geocoding:** CEP/endereco convertido em coordenadas via Mapbox Geocoding API (EUA)...
> - **Notificacoes transacionais:** nome, e-mail e informacoes minimas... via Resend (EUA).
> - **Monitoramento de erros:** stacktraces e contexto de erros... via Sentry (EUA)...

**Texto proposto — adicionar item antes de "Geocoding":**
> Transmissao para terceiros:
> - **Processamento de pagamentos (Mercado Pago):** dados de identidade do locatario (nome, CPF/e-mail, quando necessario para antifraude), valor da transacao e dados de split sao transmitidos ao **Mercado Pago Instituicao de Pagamento Ltda.** (Brasil) para processamento do pagamento, divisao do valor (split) e repasse ao locador. O Mercado Pago atua como **operador de dados financeiros**, conforme contrato de servicos a ser formalizado (condicao de go-live). Os tokens OAuth do proprietario sao armazenados criptografados e transmitidos ao MP somente para autorizar o split em cada transacao. O tratamento pelo Mercado Pago rege-se tambem pela politica de privacidade do proprio Mercado Pago.
> - **Geocoding:** (manter texto atual sem alteracao)
> - **Notificacoes transacionais:** (manter texto atual sem alteracao)
> - **Monitoramento de erros:** (manter texto atual sem alteracao)

**Motivo:** a transmissao de dados ao Mercado Pago e a mais relevante do ponto de vista do RIPD — envolve dados financeiros sensiveis e e exigida pelo parecer D4 (item 3 — LGPD). A omissao atual do MP na Secao D.2 e uma lacuna critica.

> CONSULTAR ADVOGADA: verificar se o contrato com o Mercado Pago precisa incluir clausulas de DPA (Data Processing Agreement) especificas para fins de LGPD, considerando que o MP e uma empresa brasileira mas pode ter infra fora do Brasil.

---

## Edicao 5 — Secao D.1: atualizar coleta de dados de pagamento

**Secao do RIPD:** `### D.1 Coleta`, linha "Pagamento".

**Texto atual:**
> | Pagamento | Declaracao de PIX (fase MVP); chave PIX do proprietario (para repasse) | Plataforma web |

**Texto proposto:**
> | Pagamento (locatario) | Dados de pagamento transmitidos ao Mercado Pago (redirecionamento para Checkout MP); a ShareO nao armazena dados de cartao | Redirecionamento para ambiente seguro do Mercado Pago |
> | Pagamento (locador — tokens OAuth) | Token de acesso OAuth ao Mercado Pago do proprietario, necessario para habilitar o split e o repasse; armazenado criptografado (AES-256-GCM) | Fluxo OAuth do Mercado Pago, concluido pelo proprietario em `/perfil/recebimentos` |

**Motivo:** a coleta de dados de pagamento muda estruturalmente com o Modelo B. O RIPD precisa refletir que: (a) a ShareO nunca ve os dados de cartao do locatario (eles vao direto ao MP); (b) a ShareO armazena tokens OAuth do proprietario (dado novo e sensivel).

---

## Edicao 6 — Secao F: adicionar risco de vazamento de tokens OAuth

**Secao do RIPD:** `## Secao F — Riscos aos Titulares e Mitigacoes`, adicionar nova linha apos F-01.

**Nova linha F-01b:**
> | F-01b | Vazamento ou uso indevido de tokens OAuth do proprietario no Mercado Pago | Baixa | Alto | Tokens armazenados com AES-256-GCM; acesso restrito a rotas autenticadas do servidor | Definir TTL de rotacao dos tokens; implementar revogacao automatica em caso de suspeita de comprometimento; registrar em `admin_logs` todo acesso aos tokens OAuth; confirmar politica de revogacao do MP |

**Motivo:** os tokens OAuth representam um vetor de ataque novo — comprometimento desses tokens poderia permitir a um atacante realizar transferencias financeiras em nome do proprietario. Nao consta no RIPD atual porque o modelo Stripe (checkout centralizado) nao usava tokens de terceiros desta forma.

---

## Edicao 7 — Secao H: atualizar retencao de dados de pagamento

**Secao do RIPD:** `## Secao H — Politica de Retencao de Dados`, linha "Dados fiscais e transacionais".

**Texto atual:**
> | **Dados fiscais e transacionais** (valores, taxas, repassses, NF, splits) | **5 anos** ... |

**Texto proposto — complementar a descricao:**
> | **Dados fiscais e transacionais** (valores, taxas, repasses, NF, splits, registros de transacao do Mercado Pago) | **5 anos** contados do ano seguinte ao lancamento fiscal | CTN art. 173 (prescricao tributaria) | Eliminacao fisica ou anonimizacao irreversivel. **Nota:** os tokens OAuth do Mercado Pago devem ser revogados e excluidos quando o proprietario desconectar sua conta MP ou excluir sua conta ShareO — nao ha razao para retencao de tokens alem do periodo em que o proprietario e ativo na plataforma. |

**Motivo:** adicionar clareza sobre o tratamento dos tokens OAuth no contexto de retencao/eliminacao de dados.

---

## Edicao 8 — Secao G: verificar direito de portabilidade para dados financeiros do MP

**Secao do RIPD:** `## Secao G — Direitos dos Titulares`, linha "Portabilidade".

**Texto atual:**
> | Portabilidade | Art. 20 | `GET /api/users/me/export` (JSON estruturado) | App |

**Texto proposto — adicionar nota:**
> | Portabilidade | Art. 20 | `GET /api/users/me/export` (JSON estruturado). **Nota:** a exportacao atual (item identificado como incompleta na auditoria s40) omite dados financeiros. Incluir no export: historico de `platformTransactions`, `payouts` e referencia aos tokens OAuth (sem expor o token em claro). Dados de pagamento do Mercado Pago (transacoes processadas no ambiente MP) sao portaveis pela propria interface do Mercado Pago — informar o titular. | App + privacidade@shareo.com.br |

**Motivo:** a auditoria s40 ja identificou que o export do art. 20 e incompleto. Com a integracao do MP, o escopo de dados financeiros a exportar aumenta. Esta edicao documenta a lacuna no RIPD para que seja endereçada junto com a correcao tecnica do export.

---

## Checklist de edicoes — resumo

| # | Secao do RIPD | Tipo de edicao | Prioridade |
|---|---|---|---|
| Edicao 1 | B — Descricao: "merchant of record" | Correcao critica | P0 — antes de qualquer validacao formal do RIPD |
| Edicao 2 | B — Tabela de finalidades: "Intermediacao de locacao" | Complementar | P0 |
| Edicao 3 | C.6 — Dados de pagamento | Atualizar (modelo MP) | P0 — apos integracao MP |
| Edicao 4 | D.2 — Transmissao a terceiros | Adicionar MP como operador | P0 — critico pelo parecer D4 |
| Edicao 5 | D.1 — Coleta de dados | Atualizar fluxo MP | P0 — apos integracao MP |
| Edicao 6 | F — Riscos: tokens OAuth | Novo risco | P1 |
| Edicao 7 | H — Retencao: tokens OAuth | Complementar | P1 |
| Edicao 8 | G — Portabilidade: dados financeiros | Nota de lacuna tecnica | P2 |

---

## Proximo passo

1. Aplicar as edicoes P0 em `docs/juridico/rascunho-ripd.md` (Edicoes 1, 2, 4 podem ser aplicadas imediatamente — nao dependem da integracao tecnica do MP estar completa; Edicoes 3 e 5 dependem do contrato MP assinado e da integracao funcional).
2. Submeter o `rascunho-ripd.md` revisado ao DPO/advogada para validacao formal.
3. Arquivar o RIPD finalizado internamente conforme Resolucao CD/ANPD no 02/2022.

> Relacionado: [`rascunho-ripd.md`](rascunho-ripd.md), [`draft-clausulas-mp-termos-privacidade.md`](draft-clausulas-mp-termos-privacidade.md) Secao B.3, [`checklist-conformidade-juridica.md`](checklist-conformidade-juridica.md) item 3, [`transferencia-internacional-dados.md`](transferencia-internacional-dados.md).
