# D4 — Material de cobrança do parecer jurídico **FORMAL**

**Atualizado:** 2026-06-29 · **Status:** **parecer PRELIMINAR recebido em 2026-06-28** (AI-assistido, construído sobre o `briefing-juridico-d4.md`, **em revisão com a advogada**) → **cobrando agora o parecer FORMAL** que confirme os ajustes e libere o go-live.
**Para:** fundadores encaminharem ao escritório/advogado responsável.
**Contexto interno:** D4 é o **único bloqueador** de go-live em produção do ShareO. Tudo o mais (código, infraestrutura, validação em staging) está pronto. O parecer preliminar concluiu que o **modelo é "juridicamente viável"** com **5 ajustes críticos**; falta a **versão FORMAL** (e o contrato com o PSP + Termos/Política revisados) para destravar.

> 🆕 **Decisão dos fundadores (28/06):** pagamentos passam a ser feitos via **PSP licenciado — Mercado Pago**, com repasse semanal e **conta de recebimento = PJ da ShareO** (substitui a chave PIX pessoal temporária de validação). Isso **afasta o maior risco** (Lei 12.865 / instituição de pagamento) e reposiciona a questão #1. Ver `checklist-conformidade-juridica.md` e a memória D4.

---

## 1. Mensagem pronta para enviar ao advogado (cobrança do parecer FORMAL)

> **Assunto: ShareO — parecer FORMAL e validação dos ajustes do go-live**
>
> Prezado(a) [nome],
>
> Obrigado pela **posição preliminar** já enviada. Com base nela, os fundadores **decidiram operar os pagamentos por um PSP licenciado (Mercado Pago)**, com **conta de recebimento na PJ da ShareO** e modelo de **split/repasse** — exatamente para afastar o enquadramento como instituição de pagamento (Lei 12.865/2013).
>
> Para liberar o go-live, precisamos do seu **parecer FORMAL** confirmando os **5 ajustes críticos** apontados e respondendo aos pontos abaixo. Poderia nos retornar a **versão formal** e um **prazo**?
>
> **Pontos a confirmar no parecer formal:**
>
> 1. **Pagamentos (Lei 12.865/2013):** o uso de **PSP licenciado (Mercado Pago) com split e conta na PJ** é suficiente para **afastar** o enquadramento da ShareO como instituição de pagamento? Há exigência adicional na contratação do PSP ou na estrutura de repasse?
> 2. **Fiscal:** confirmação de que a **taxa de 15% é receita** (incidência de ISS/PIS/COFINS + **emissão de NF**) e os **85% repassados não são receita** da ShareO; orientação a proprietários (PF declara IR / PJ emite NF).
> 3. **LGPD:** suficiência do **RIPD** (rascunho elaborado), da **formalização da transferência internacional** (Resend/Sentry/Mapbox/Vercel — EUA, art. 33) e do tratamento de **selfie de verificação** (possível dado biométrico — art. 11). DPO já designado (`privacidade@shareo.com.br`).
> 4. **CDC / Termos:** validação das cláusulas de **responsabilidade solidária**, **direito de arrependimento (art. 49 — 7 dias, antes da retirada)** e **limitação de responsabilidade** sem excluir o CDC. Texto dos Termos/Política para revisão final.
> 5. **PLD/FT (Lei 9.613/1998):** com o PSP licenciado assumindo parte do monitoramento, qual a **política mínima** que ainda cabe à ShareO (KYC/KYB leve, monitoramento, COAF)?
> 6. **Civil (CC, locação):** validação do **contrato de locação de bens móveis** aceito eletronicamente por locador e locatário e da **alocação do risco de dano/perda sem caução** (arts. 565+).
> 7. **Marco Civil (Lei 12.965/2014):** confirmação do regime de **guarda de logs de acesso por 6 meses (art. 15)** e do procedimento de **notificação e retirada** de conteúdo de terceiros (art. 19).
>
> Ficamos à disposição para uma call de 30 min para fechar os pontos pendentes. Agradecemos o retorno.
>
> Atenciosamente,
> [nome] — ShareO

---

## 2. As 7 questões-núcleo (versão de referência)

> As 5 originais foram endereçadas no parecer preliminar; **#6 e #7** surgiram na revisão pré-go-live (skill `/shareo-juridico`). O parecer **FORMAL** deve fechar todas.

| # | Tema | Pergunta-núcleo | Posição preliminar |
|---|---|---|---|
| 1 | **Lei 12.865/2013** | PSP licenciado (Mercado Pago) + split + conta PJ afasta o enquadramento como instituição de pagamento? | Modelo viável; PSP afasta o risco |
| 2 | **Fiscal** | ISS/PIS/COFINS + NF sobre a taxa de 15%? 85% repassado ≠ receita? | Taxa = receita (NF); 85% não é receita |
| 3 | **LGPD** | RIPD + transferência internacional (art. 33) + selfie biométrica (art. 11) suficientes? | Minimização OK; DPO+RIPD obrigatórios |
| 4 | **CDC / Termos** | Responsabilidade solidária + arrependimento art. 49 + limitação de responsabilidade. | Solidária; arrependimento 7 dias |
| 5 | **PLD/FT (Lei 9.613/1998)** | Com PSP, qual política mínima ainda cabe à ShareO? | Parte recai no PSP; manter política mínima |
| 6 | **Civil (CC)** | Contrato de locação eletrônico + risco de dano/perda sem caução (arts. 565+). | Risco alocado ao locatário |
| 7 | **Marco Civil** | Guarda de logs 6 meses (art. 15) + notificação/retirada (art. 19). | Art. 15 obrigatório |

---

## 3. Dados do modelo (para o advogado)

- **Negócio:** marketplace de aluguel local de itens entre particulares (C2C), lançamento nacional.
- **Fluxo de dinheiro:** locatário paga o total → plataforma **retém 15%** → **repassa o líquido** ao proprietário (repasse **semanal**, às segundas).
- **Meio de pagamento (DECIDIDO):** **Mercado Pago (PSP licenciado)**, modelo de **split/marketplace** — cada locador (inclusive PF) conecta conta MP via OAuth; conta de recebimento da plataforma = **PJ da ShareO**. (Antes, no MVP: PIX centralizado *merchant of record* + Stripe oculto — ambos a serem removidos após validação do MP em sandbox.)
- **Limites de risco já adotados:** **teto de R$ 500/transação**, **sem caução**, retenção de dados por 5 anos (CTN art. 173).

---

## 4. O que já está pronto do nosso lado (mitigações)

Para o advogado entender que a parte técnica não é o gargalo:

- **Taxa de 15% explícita** na interface e nos Termos (não embutida no preço).
- **Termos de Serviço** já detalham taxa, repasse semanal e teto de R$ 500.
- **LGPD — pilares técnicos implementados:** Encarregado designado (`privacidade@shareo.com.br`), consentimento versionado, **portabilidade** (art. 20), **eliminação/anonimização** (art. 18), **criptografia AES-256** de dados sensíveis. **Rascunhos** de RIPD e de formalização da transferência internacional já elaborados (a validar).
- **Marca "ShareO" registrada no INPI.**
- **KYB leve de PJ:** verificação de CNPJ na Receita + declaração de responsável legal (piso defensável, independente do parecer).
- **Aceite eletrônico do contrato de locação** e **registro de acesso (art. 15)** já implementados no código **atrás de flags (desligadas)** — prontos para ligar com o texto/política aprovados.
- **Informe de IR** meramente informativo, com aviso de ausência de validade legal.

---

## 5. O que está bloqueado até o parecer FORMAL (impacto da demora)

- Criação do ambiente de **produção** (Supabase/Upstash/Resend de produção — **não ativável** sem o parecer).
- **Ativação real de pagamentos** via Mercado Pago (após contrato com o PSP + conta PJ ativa).
- **DNS/domínio** de produção (`shareo.com.br`).
- **Captação de usuários reais** e início da operação comercial.
- **Tag de release `v1.x`** (go-live).

> Condições do próprio parecer para go-live: **parecer FORMAL + contrato PSP assinado + conta PJ ativa + Termos/Política revisados publicados + checklist 100%**. Cada semana de atraso adia o início da operação, com o MVP já 100% pronto em staging.

---

## 6. Acompanhamento

- Cobrança automatizada local roda diariamente às 9h (`cobranca-juridico-d4`) — deve refletir **"parecer preliminar recebido, aguardando FORMAL"** (não mais "consulta sem retorno").
- **Quando o parecer FORMAL chegar:** registrar o desfecho em `docs/STATUS.md` + memória D4, marcar o `checklist-conformidade-juridica.md` e **desativar** a cobrança automatizada.
- Sugestão: se não houver retorno em **3–5 dias úteis** após este envio, propor uma **call curta** para fechar os pontos pendentes.

> Ver também: `briefing-juridico-d4.md` (dossiê completo entregue ao advogado) · `checklist-conformidade-juridica.md` (8 áreas, rastreamento dos ajustes) · memória `project-d4-juridico`.
