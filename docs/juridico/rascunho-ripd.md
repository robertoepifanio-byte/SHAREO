# Relatório de Impacto à Proteção de Dados Pessoais (RIPD)

## SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA

> **Versão 2.0, de 21/09/2026 — para leitura e assinatura do Encarregado.**
> Substitui o rascunho de 28/06/2026. Foi reescrito contra o sistema como ele é hoje (Stripe como processador de pagamentos, seleção de fornecedores medida, retenção efetivamente implementada). Cada afirmação sobre o sistema foi conferida no código ou nos documentos da pasta `docs/juridico/`.
> **O que o Encarregado assina:** que leu o relatório, concorda com a descrição do tratamento e dos riscos, e **toma ciência das pendências da seção I**, que continuam abertas.
>
> **✅ Assinado por Raimundo Gomes da Silva (Encarregado) em 21/09/2026.** A via assinada foi enviada como PDF em 22/09 e **não entra neste repositório** (é público) — conferir a Seção K para o procedimento de arquivamento. ⚠️ No PDF recebido, só a assinatura do Encarregado foi identificada; o campo "Representante legal do controlador" da Seção J não veio preenchido — confirmar se essa assinatura ainda falta antes de considerar o RIPD integralmente executado.

**Base legal do relatório:** LGPD (Lei 13.709/2018), art. 5º, XVII (definição de RIPD) e art. 38 (a ANPD pode exigi-lo do controlador).
**Preparado por:** Equipe de Produto e Tecnologia — ShareO.
**Situação do produto:** o marketplace **ainda não está aberto ao público**. Roda em staging e em produção de uso interno. O que está no ar para o público é a **landing de captação de interessados** (`shareo.com.br`, desde 31/08/2026). Nenhuma locação com pagamento real foi realizada; os testes usam contas de teste e testadores convidados.

> **Nota sobre a base normativa.** O rascunho anterior citava a Resolução CD/ANPD nº 2/2022 como norma do RIPD. Essa resolução trata de agentes de tratamento de pequeno porte. Foi retirada como base. **A advogada confirma** se a ShareO se enquadra como agente de pequeno porte e se isso altera alguma obrigação deste relatório.

---

## Seção A — Identificação do controlador e do Encarregado

| Campo | Informação |
|---|---|
| **Controlador** | SHAREO MARKETPLACE DE INTERMEDIACAO DE NEGOCIOS LTDA (razão social conforme a Receita Federal) |
| **CNPJ** | 68.512.556/0001-09 (ativo desde 11/08/2026) |
| **Endereço da sede** | Rua Pais Leme, 215, conj. 1713 — Pinheiros, São Paulo/SP, CEP 05424-150 |
| **Regime tributário** | Simples Nacional (CNAE 7490-1/04 — intermediação) |
| **Atividade** | Plataforma digital de intermediação de aluguel de bens móveis entre particulares e empresas |
| **Encarregado (DPO)** | Raimundo Gomes da Silva — nomeado em 04/08/2026, para o período de MVP e o primeiro ano de atividade |
| **Canal do Encarregado** | privacidade@shareo.com.br (já configurado e publicado na Política de Privacidade) |

> **Pendência (art. 41, §1º):** a Política publica o **canal**, mas ainda não o **nome** do Encarregado. A publicação do nome está prevista para o go-live (item C3.8 do plano de governança).

---

## Seção B — Descrição do tratamento e finalidades

A ShareO conecta **proprietários** (pessoa física ou jurídica que anuncia bens móveis) a **locatários** (quem aluga por período determinado). Cobra **15% de taxa de serviço**, que é a sua receita, e repassa o restante ao proprietário.

### Como o dinheiro se move

1. O locatário paga o valor **cheio** da locação, **somente com cartão**, em uma página de pagamento da **Stripe**. Os dados do cartão são digitados na Stripe e **nunca passam pelos servidores da ShareO**.
2. O valor entra no **saldo da ShareO dentro da Stripe** (uma conta da Stripe em nome da ShareO).
3. **Três dias após a devolução** do item, a Stripe transfere **85%** ao proprietário. Os 15% ficam com a ShareO. A retenção existe para permitir a análise de eventual disputa por dano.
4. O proprietário recebe pelo **Stripe Connect**: a verificação de identidade e os dados bancários dele são coletados **dentro da Stripe**. A ShareO guarda apenas o identificador da conta e o status (`stripeConnectStatus`), nunca os documentos.
5. Se o Connect do proprietário não estiver ativo, existe um **repasse manual por PIX**, com a chave PIX guardada na ShareO.

> **O enquadramento legal desse fluxo** (se o saldo na Stripe configura custódia para efeito da Lei 12.865/2013) teve **resposta parcial em 21/09/2026** — ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md) e a pendência 2 da Seção I. Este relatório descreve o fato e **não afirma conclusão jurídica própria** sobre ele.

### Finalidades

| Finalidade | Descrição | Base legal (LGPD) |
|---|---|---|
| **Cadastro e autenticação** | Criar conta, autenticar sessões. Administradores usam também um segundo fator (2FA) | Art. 7º, V (execução de contrato) |
| **Perfil e busca** | Nome, cidade, avatar, vitrine do proprietário; busca por proximidade com coordenadas do endereço informado | Art. 7º, V |
| **Verificação de identidade — documento** | Foto de RG/CNH para permitir anunciar ou alugar; prevenção a fraude | Art. 7º, V e IX (interesse legítimo) |
| **Verificação de identidade — selfie (biometria)** | Confirmar que o titular do documento é quem opera a conta | **Art. 11, II, "a" — consentimento específico e destacado.** Decisão jurídica C1 de 30/06/2026. Só será tratada com esse consentimento; ver risco F-09 |
| **Verificação de PJ (KYB leve)** | Consulta do CNPJ à Receita (BrasilAPI / MinhaReceita) e declaração do responsável | Art. 7º, V e IX |
| **Intermediação da locação** | Reservas, contrato eletrônico, pagamento pela Stripe, repasse, taxa de atraso, extensão de prazo | Art. 7º, V |
| **Chat** | Mensagens entre locatário e proprietário sobre a locação | Art. 7º, V |
| **Avaliações** | Notas e comentários mútuos após a locação | Art. 7º, V e IX |
| **Disputas** | Fotos de retirada e devolução, abertura e mediação de reclamação | Art. 7º, V e IX; art. 7º, VI (exercício de direitos em processo) |
| **Notificações e e-mails transacionais** | Status de reserva, pagamento, devolução, cobrança | Art. 7º, V |
| **Reengajamento por e-mail** | Resumo de favoritos, lembretes. Tem opt-out em `/perfil/notificacoes` | Art. 7º, IX, com descadastro |
| **Obrigações fiscais** | Retenção de registros financeiros por 5 anos; **Relatório de Intermediações mensal** enviado à Contabilizei (exigência do contador) | Art. 7º, II (obrigação legal) |
| **Prevenção à fraude e PLD/FT** | Verificação de identidade, teto de R$ 500 por transação; KYC do recebedor feito pela Stripe | Art. 7º, II e IX |
| **Captação de interessados (Programa Fundadores, landing)** | E-mail, nome, cidade, intenção e origem da campanha (UTM), com registro de IP, versão do texto e data do consentimento | Art. 7º, I (consentimento, com opt-in destacado) |
| **Programa de Embaixadores** | Link de indicação, comissão, chave PIX para pagamento | Art. 7º, I e V |
| **Medição da landing** | Contagem agregada por dia (sem IP, sem cookie) e Google Tag Manager (ver risco F-13) | Contagem própria: art. 7º, IX. GTM: em análise |
| **Administração e auditoria** | Registro de ações de administradores (`admin_logs`), registros de acesso (Marco Civil, art. 15) | Art. 7º, II e IX |

---

## Seção C — Inventário de dados pessoais

Conferido contra `prisma/schema.prisma` em 21/09/2026.

### C.1 Cadastro e identificação (`users`)

| Campo | Descrição | Classificação | Proteção |
|---|---|---|---|
| `name`, `email`, `phone` | Identificação e contato | Pessoal | — |
| `passwordHash` | Senha (bcrypt) | Pessoal derivado | Hash |
| `cpfEncrypted`, `cnpjEncrypted`, `cnpjResponsavelLegalEncrypted` | Documentos | Pessoal (documento) | **AES-256-GCM** |
| `cpfHash`, `cnpjHash` | Unicidade sem guardar o número | Derivado | HMAC-SHA256, chave separada |
| `avatarUrl`, `bio`, `slug` | Perfil público | Pessoal | Público por natureza |
| `referralCode`, `referredById` | Indicação | Pessoal | — |
| `engagementEmailsOptOut` | Descadastro de e-mail de reengajamento | Controle | — |
| `reputationPoints` | Pontuação de reputação | Pessoal derivado | — |

### C.2 Localização (`users`, `items`)

`cep`, `street`, `neighborhood`, `city`, `state`, `latitude`, `longitude`. O endereço informado é convertido em coordenadas (Mapbox). **Ao público, as coordenadas saem truncadas (cerca de 110 m) e o endereço é omitido**; o endereço exato só é entregue ao dono do anúncio e a administradores.

### C.3 Verificação de identidade (`users`)

| Campo | Descrição | Classificação | Base legal |
|---|---|---|---|
| `idDocumentUrl` | Caminho do documento no bucket **privado** `id-docs` | Pessoal (documento) | Art. 7º, V e IX |
| `idSelfieUrl` | Caminho da selfie no bucket **privado** `id-docs` | **Sensível — biométrico (art. 5º, II)** | **Art. 11, II, "a"** |
| `idVerificationStatus`, `idSubmittedAt`, `idVerifiedAt`, `idRejectionReason` | Andamento da verificação | Pessoal derivado | Art. 7º, V e IX |
| `idSelfieConsentAt`, `idSelfieConsentVersion`, `idSelfieConsentTextHash`, `idSelfieConsentIp` | **Prova do consentimento biométrico** | Auditoria | Art. 11, II, "a" |
| `cnpjRazaoSocial`, `cnpjSituacao` e afins | Resultado da consulta KYB | Empresarial | Art. 7º, IX |

### C.4 Consentimento e auditoria (`users`)

`consentAt`, `consentIp`, `consentVersion`, `ageDeclaredAt` (declaração de maioridade), `profileCompletedAt`, `legalHoldConsent*` (retenção legal por ordem judicial).

### C.5 Segundo fator dos administradores (`users`) — **novo desde o rascunho anterior**

| Campo | Descrição | Proteção |
|---|---|---|
| `totpSecretEnc` | Segredo do aplicativo autenticador | AES-256-GCM |
| `totpEnabledAt`, `totpLastStep` | Ativação e último código aceito (anti-reuso) | — |
| `totpRecoveryHashes` | Códigos de recuperação | Só o hash SHA-256; o código em claro é mostrado uma única vez |

Só existe para quem tem `role=ADMIN`.

### C.6 Locação e financeiro (`bookings`, `platform_transactions`, `payouts`, `owner_payment_accounts`)

| Dado | Descrição | Observação |
|---|---|---|
| Partes, datas, valores, taxa, repasse | Dados da locação | Retenção fiscal de 5 anos |
| `stripeSessionId`, `stripePaymentIntentId`, `stripeConnectedAccountId`, `stripeFee` | Identificadores na Stripe | **Nenhum dado de cartão** na ShareO |
| `stripeAccountId`, `stripeConnectStatus`, flags de habilitação | Situação do Connect do proprietário | Documentos e conta bancária ficam **só na Stripe** |
| `pixKey`, `pixKeyType`, `holderName`, `bankName` | Chave PIX para repasse manual | **Chave PIX em texto claro no banco** (risco F-14) |
| `lateFeeAmount`, datas de cálculo | Taxa de atraso | — |
| `disputeStatus`, datas, `cancelReason` | Disputa e cancelamento | Texto livre pode conter dado pessoal |
| Campos de extensão de prazo | Pedido e pagamento de extensão | — |
| `contractSignedAt`, `contract_acceptances` (`ipAddress`, `userAgent`) | Aceite eletrônico do contrato | Atrás de flag, desligada até o go-live |
| `stripe_event_queue` | Eventos recebidos da Stripe (com `payload`) | Fila técnica |

### C.7 Comunicação, avaliações e fotos

- `messages.content` — conteúdo do chat, **sem cifra em repouso** (a cifra quebraria o Supabase Realtime; decisão de arquitetura registrada). Apagado na exclusão da conta.
- `reviews` — nota, comentário, foto opcional.
- `booking_photos` — fotos de retirada e devolução do item, **prova das disputas**. O bucket `booking-photos` é **público** (risco F-15).
- `notifications`, `email_queue` (`to`, `payloadJson`), `engagement_emails` — filas e histórico de e-mail. **A fila de e-mail guarda destinatário e conteúdo; o prazo de limpeza dela não está definido** (risco F-16).

### C.8 Captação e programas (`founder_leads`, `ambassador_*`, `referrals`)

`founder_leads`: e-mail, nome, telefone, cidade, UF, CEP, bairro, intenção, `utm_*`, `referrerUrl`, `marketingConsentAt`, `consentVersion`, **`consentIp`, `consentUserAgent`**. Embaixadores: consentimento, chave PIX, comissões.

### C.9 Auditoria e acesso

- `admin_logs` — ação, entidade, metadados. Inclui, desde 21/09/2026, ativação e reinício do 2FA e uso de código de recuperação.
- `access_logs` — IP, usuário, caminho, método, status (Marco Civil, art. 15). **Gravação atrás da flag `accessLogsEnabled`, desligada.** O Encarregado deve confirmar o estado antes da assinatura.
- `founder_audit_logs`, `outbound_webhooks` (URL e **segredo em claro**, risco F-14).

---

## Seção D — Fluxo de dados

### D.1 Onde os dados vivem

- **Banco:** PostgreSQL no Supabase, região **sa-east-1 (São Paulo)**.
- **Arquivos:** Supabase Storage — `item-images` (público), `booking-photos` (**público**), `id-docs` (**privado**, acesso só pelo servidor, com URL assinada de curta duração).
- **Execução:** funções na Vercel (EUA/global).
- **Sessões:** JWT em cookie HTTP-only (30 dias), sem tabela de sessões. A troca de senha ou de e-mail encerra as sessões anteriores.

### D.2 Fornecedores e transferência internacional (LGPD, art. 33)

A Resolução CD/ANPD nº 19/2024 tornou **obrigatórias e inalteráveis** as Cláusulas-Padrão Contratuais (CPC) da ANPD. O prazo de adequação terminou em **23/08/2025**. Medição feita em 03/09/2026 nas páginas públicas dos fornecedores (não nos contratos assinados):

| Fornecedor | Dados que recebe | Local | Adota as CPC? |
|---|---|---|---|
| **Stripe** | Identidade e dados de pagamento; documentos e conta bancária do proprietário | EUA | **Sim** (adendo de 18/11/2025, Módulos 1 e 2) |
| **Vercel** | Tráfego e logs de execução | EUA | Não publica |
| **Resend** | Nome, e-mail, conteúdo de e-mails transacionais | EUA | Não publica |
| **Sentry** | Erros, com filtro de dados pessoais (retenção de 30 dias) | EUA | Não publica |
| **Mapbox** | Texto do endereço (geocodificação) e coordenadas (mapa) | EUA | Não publica |
| **Upstash** | IP e identificadores para limite de acessos; contadores | EUA | Não publica (evidência de fonte única) |
| **Supabase** | Todo o banco e os arquivos | Brasil (repouso) | A definir se o acesso lógico pela matriz configura transferência |
| **Google Tag Manager** | Dados de navegação da **landing** (desde 15/09/2026) | EUA | **Não** — não publica CPC para esse produto |
| BrasilAPI / MinhaReceita | Apenas o **CNPJ** consultado | Brasil | Não se aplica (dado empresarial) |
| Google (planilhas) | URL de planilha informada pelo usuário na importação de itens PJ | EUA | Não medido; dado do anúncio, não do titular |
| Zenvia (SMS) | Telefone | Brasil | **Integração ainda não ativa** |
| Meta Pixel | — | — | **Desligado** (sem variável de ambiente; exigiria parecer antes) |
| Google Analytics | — | — | **Nunca esteve ligado**; travado no código |

**Já feito:** documento da **Cláusula 14** publicado na Política (04/09/2026). A Política foi corrigida em 04/09 (o Analytics deixou de ser declarado, porque nunca carregou).
**Decisão da advogada, pendente:** o caminho para **Vercel, Resend, Sentry, Mapbox e Upstash**, e a situação do Supabase.
**Pendência nossa:** a **Política de Privacidade ainda não declara o Google Tag Manager** (risco F-13).

### D.3 Eliminação e anonimização

| Dado | Gatilho | O que acontece |
|---|---|---|
| **Conta do usuário** | Clique do titular em "Excluir conta" (`DELETE /api/users/me`) | **Imediato**, em uma transação: anonimiza nome, e-mail, telefone, bio, avatar, localização, documentos (hash e cifra), senha, comentários e mensagens; em segundo plano, logo após a resposta, apaga do Storage o documento e a selfie (`id-docs`) e os uploads do titular em `uploads/<id>` (avatar e fotos de avaliação ou de relato de problema). **Não** são apagadas por essa rotina as fotos de anúncio e as de reserva/disputa (retenção a decidir; ver `docs/checklist-go-live-2026-10-01.md`, item 6). *Correção de 24/09: até aqui a remoção de `id-docs` procurava o prefixo errado e não apagava nada; o conserto está implementado, aguardando verificação em staging.* Recusada se houver locação em andamento. Registros financeiros dos últimos 5 anos ficam **anonimizados**, com o titular informado na hora |
| **Registros financeiros** | 5 anos | `purge-fiscal-records` (mensal). **Só apaga quando todos os titulares do registro excluíram a conta** — uma transação tem duas partes |
| **`admin_logs`** | 5 anos | `purge-admin-logs` |
| **IPs de consentimento** | 5 anos | `purge-consent-ips` |
| **`access_logs`** | 180 dias | `purge-access-logs` (a gravação está desligada) |
| **Retenção legal** | Ordem judicial, litígio, investigação | Coluna `legalHold` suspende o expurgo do registro |
| **Backup do banco** | 7 backups diários (Supabase Pro) | Rotação natural |
| **Lead da landing** | Descadastro | Marcado como excluído e removido dos envios |

**Lacunas:** o **Storage não tem backup automático** (só o banco tem); a fila de e-mail não tem prazo de limpeza definido; a restauração do banco **nunca foi ensaiada**.

---

## Seção E — Medidas de segurança em vigor

Todas conferidas no código e nos registros do projeto.

| Medida | Descrição |
|---|---|
| **Cifra de campos sensíveis** | CPF, CNPJ, responsável legal e segredo do 2FA em AES-256-GCM; chave de hash separada |
| **Bucket privado de identidade** | `id-docs` só pelo servidor, URL assinada de curta duração; visualização da selfie pelo admin é **registrada** (`kyc.selfie.view`) |
| **Guards de acesso no servidor** | Como o RLS está desabilitado (incompatível com o PgBouncer), cada rota verifica quem chama. Duas rotas administrativas que ignoravam o tipo de administrador foram corrigidas em 02/09/2026 |
| **2FA obrigatório para administradores** | **Implementado (PR #488), aguardando deploy e verificação em staging.** Até o deploy, o painel é protegido só por senha |
| **Sessões** | Cookie HTTP-only; troca de senha ou e-mail invalida as anteriores; usuário desativado perde acesso |
| **Tokens de uso único** | Verificação de e-mail e redefinição de senha guardados **como hash** (correção de 11/09/2026) |
| **Limite de tentativas** | Login, cadastro, redefinição, upload, exportação e códigos do 2FA |
| **Entrada e saída** | Escape de HTML em e-mails; escape no JSON-LD; escape de fórmula em CSV; validação de tipo e assinatura de arquivo em uploads; proteção contra SSRF nos webhooks de PJ |
| **Pagamentos** | Assinatura e idempotência dos eventos da Stripe; dados de cartão só na Stripe |
| **Cabeçalhos** | CSP com nonce, HSTS, X-Frame-Options, Permissions-Policy |
| **Logs e erros** | Máscara de dados pessoais em logs e no Sentry |
| **Cron** | Todas as rotas agendadas exigem segredo, sem falha aberta |
| **Consentimento versionado** | Versão, data e IP em cada opt-in |
| **Exclusão suave** | `deletedAt` em usuários, reservas, itens e mensagens |
| **Dependências** | Varredura e correção de vulnerabilidades com alcance real (RCE do Next corrigido em 10/09/2026) |
| **Backup** | 7 diários do banco. **Storage sem backup automático** |

---

## Seção F — Riscos aos titulares e mitigações

Escala: probabilidade e impacto em Baixo / Médio / Alto.

| # | Risco | Prob. | Impacto | Mitigação existente | O que falta |
|---|---|---|---|---|---|
| F-01 | Vazamento de CPF/CNPJ | Baixa | Alto | Cifra AES-256-GCM; acesso só pelo servidor | Rotação periódica de chaves; **plano de incidentes** (F-11) |
| F-02 | Acesso indevido a documentos de identidade | Baixa | Alto | Bucket privado, URL assinada, log de visualização da selfie | TTL máximo definido; log de acesso ao bucket |
| F-03 | Dado pessoal em log ou no Sentry | Baixa | Médio | Filtro e máscara | Auditoria periódica do filtro |
| F-04 | Uso para finalidade diversa | Baixa | Alto | Finalidades declaradas; consentimento versionado | Não ampliar finalidade sem novo consentimento |
| F-05 | Titular não consegue exercer direitos | Média | Médio | Exclusão imediata, exportação, edição, canal publicado | Procedimento escrito de resposta (**Cláusula 15**) |
| **F-06** | **Transferência internacional sem o mecanismo exigido** | **Alta** | **Alto** | Só a **Stripe** adota as CPC; **Cláusula 14** publicada | **Prazo vencido em 23/08/2025.** Cinco fornecedores sem CPC e o Supabase em definição. **Decisão da advogada.** Ver seção D.2 |
| F-07 | Retenção além do necessário | Baixa | Médio | Exclusão imediata; expurgos automáticos; retenção legal | Prazo da fila de e-mail; confirmar o estado da flag `accessLogsEnabled` |
| F-08 | Acesso interno indevido a mensagens | Baixa | Alto | Só papéis administrativos de disputa | Política interna escrita; log de todo acesso a conversas |
| **F-09** | **Selfie (biometria) sem consentimento específico** | Média | **Alto** | Consentimento específico **implementado atrás de flag** (`biometricConsentRequired`, desligada): 412 sem consentimento, registro de versão/data/IP/hash do texto, revogação com eliminação | **O texto de consentimento cita "ShareO Marketplace de Aluguel Ltda.", nome que nunca existiu.** Corrigir (exige nova versão e revisão jurídica) **antes** de ligar a flag. Enquanto isso, o tratamento real da selfie fica só em teste e uso interno |
| F-10 | Dados de menores | Baixa | Alto | Declaração de maioridade | A advogada confirma se a autodeclaração basta |
| **F-11** | **Incidente sem comunicação no prazo** | Baixa | Alto | Monitoramento pelo Sentry | **Não existe plano de resposta a incidentes** nem procedimento de comunicação à ANPD e aos titulares (Cláusula 16) |
| **F-12** | **Painel administrativo protegido só por senha** | Média | Alto | Guards por rota; 2FA implementado | **Deploy e verificação do 2FA em staging.** Após o deploy, todos os admins precisam cadastrar o autenticador |
| **F-13** | **Google Tag Manager na landing, sem declaração na Política** | Alta | Médio | Contagem própria sem cookie; GA4 e Meta Pixel desligados | Declarar na Política **ou** desligar (é uma linha, `GTM_LIBERADO`). Sem etiqueta que capture formulário sem parecer. Risco de acesso: quem publica no GTM injeta script sem passar pelo código |
| F-14 | Chave PIX e segredo de webhook em texto claro no banco | Baixa | Médio | Acesso só pelo servidor | Cifrar (migração dos dados existentes) |
| F-15 | Fotos de locação em bucket público | Baixa | Médio | Nenhuma específica; o bucket é público por desenho | Confirmar se devem ser privadas, com URL assinada |
| F-16 | Fila de e-mail com destinatário e conteúdo sem prazo de limpeza | Baixa | Médio | Acesso só pelo servidor | Definir prazo e expurgo |
| F-17 | Cópia local de documentos de identidade de usuários reais | Baixa | Alto | Pasta fora do controle de versão | Definir destino do backup do Storage (BKP-01) e apagar a cópia local |

---

## Seção G — Direitos dos titulares

| Direito (art. 18) | Como é atendido | Canal |
|---|---|---|
| Confirmação e acesso | Tela "Minha Conta" e exportação em JSON (`/api/users/me/export`, art. 20) | App e site |
| Correção | Edição de perfil | App e site |
| Eliminação | `DELETE /api/users/me` — **imediata** (seção D.3) | App e site |
| Portabilidade | Exportação estruturada | App e site |
| Revogação do consentimento de marketing | Link de descadastro; `UNSUBSCRIBED` | E-mail |
| Revogação do consentimento **biométrico** | Botão na tela de documentos (com a flag ligada); elimina a selfie | App e site |
| Informação sobre compartilhamento | Política de Privacidade, com a Cláusula 14 | `/privacidade` |
| Petição à ANPD | Informada na Política | Externo |

**Prazo de resposta:** o prazo de 15 dias (art. 19, §2º) vale para **pedido de acesso**. A eliminação é imediata e não depende de prazo.

---

## Seção H — Retenção

| Categoria | Prazo | Base |
|---|---|---|
| Registros financeiros e fiscais | 5 anos | CTN, art. 173 |
| `admin_logs`, aceites de contrato | 5 anos | Interesse legítimo (defesa em juízo) |
| IPs de consentimento | 5 anos | Prova do consentimento |
| Registros de acesso (Marco Civil, art. 15) | 180 dias | Marco Civil (a gravação depende da flag) |
| Mensagens e dados de perfil | Até a exclusão da conta | Art. 18 |
| Documentos e selfie | Até a exclusão da conta ou a revogação do consentimento | Art. 18; art. 11, II, "a" |
| Leads da landing | Até o descadastro | Art. 7º, I |
| Backup do banco | 7 dias | Rotação |

---

## Seção I — Avaliação geral e pendências que o Encarregado assina ciente

**Avaliação.** O tratamento é de **risco moderado a alto**, principalmente porque envolve documentos de identidade, dado biométrico (ainda não em uso real), dados financeiros e fornecedores nos EUA. As proteções técnicas centrais (cifra, bucket privado, guards, exclusão imediata, expurgo automático) estão em vigor. **A ShareO não deve abrir o marketplace ao público enquanto as pendências marcadas "bloqueia go-live" estiverem abertas.**

| # | Pendência | Responsável | Bloqueia go-live? |
|---|---|---|---|
| 1 | Decisão sobre os 5 fornecedores sem CPC e sobre o Supabase (F-06) | Advogada | **Sim** |
| 2 | Enquadramento legal do fluxo do dinheiro pela Stripe (seção B) e efeito neste relatório | Advogada | **Parcialmente respondido em 21/09/2026** — a ShareO não precisaria de autorização do Banco Central, condicionado à redação dos Termos (ver [`parecer-lei-12865-2026-09-21.md`](parecer-lei-12865-2026-09-21.md)). |
| 3 | Declarar ou desligar o Google Tag Manager (F-13) | Fundadores + advogada | **Sim** |
| 4 | Deploy e verificação do 2FA de administradores (F-12) | Técnico | **Sim** |
| 5 | Plano de resposta a incidentes e procedimentos das Cláusulas 15 e 16 (F-11) | Encarregado | **Sim** |
| 6 | Corrigir o texto de consentimento biométrico antes de ligar a flag (F-09) | Advogada + técnico | Sim, se a selfie for usada |
| 7 | Publicar o nome do Encarregado na Política | Técnico | No go-live |
| 8 | Backup do Storage e destino das cópias (F-17) | Fundadores | Antes da 1ª locação real |
| 9 | Cifrar chave PIX e segredo de webhook (F-14); prazo da fila de e-mail (F-16); política do bucket de fotos (F-15) | Técnico | Não |
| 10 | Confirmar se a ShareO é agente de pequeno porte (nota da capa) | Advogada | Não |

**Revisão deste relatório.** Refazer quando houver: novo fornecedor ou troca de fornecedor; ativação da biometria; mudança no fluxo do dinheiro (por exemplo, pagamento direto ao proprietário); nova finalidade; resposta da advogada às pendências 1 e 2. **No mínimo, uma vez por ano.**

---

## Seção J — Aprovação

| | |
|---|---|
| **Encarregado (DPO)** | Raimundo Gomes da Silva |
| **Assinatura** | ✅ Assinado — PDF recebido em 22/09/2026, mantido fora do repositório |
| **Data e local** | 21 / 09 / 2026 — São Paulo |

| | |
|---|---|
| **Representante legal do controlador** | ____________________________________ |
| **Assinatura** | ____________________________________ |
| **Data e local** | ____ / ____ / 2026 — ____________________ |

| | |
|---|---|
| **Ciência da assessoria jurídica** (recomendado) | ____________________________________ |
| **Assinatura** | ____________________________________ |
| **Data** | ____ / ____ / 2026 |

---

## Seção K — Depois da assinatura

1. **Arquivar a via assinada** num local privado da empresa (pasta corporativa com acesso restrito), em PDF, com a data e a versão (2.0). **Não colocar no repositório do código: ele é público.**
2. **Gerar o hash SHA-256 do PDF assinado** e anotá-lo no registro. Assim é possível provar depois que o documento não mudou.
3. **Registrar no checklist de conformidade** (`checklist-conformidade-juridica.md`, linha C3) com a data e a versão.
4. **Transformar as pendências da seção I em plano de ação**, com responsável e data. O RIPD assinado não as resolve, só as torna conhecidas e assumidas.
5. **Manter o relatório à disposição da ANPD.** Não se envia por iniciativa própria; a ANPD pode pedi-lo (art. 38).
6. **Publicar o nome do Encarregado** na Política de Privacidade no go-live.
7. **Nova versão e nova assinatura** sempre que ocorrer um dos gatilhos de revisão da seção I.

*Documento preparado pela equipe de Produto e Tecnologia da ShareO. Não publicar. Não distribuir fora do Encarregado, dos sócios e da assessoria jurídica.*
