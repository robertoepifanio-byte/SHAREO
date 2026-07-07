# Relatório de Impacto à Proteção de Dados Pessoais (RIPD / DPIA)
## ShareO Marketplace de Aluguel Ltda.

> **RASCUNHO — pendente de revisão do DPO/advogada (D4); nao e documento final.**
> Este rascunho foi elaborado pela equipe de produto/tecnologia como insumo para o parecer juridico (D4). Nao substitui o RIPD formal. A versao final deve ser validada e assinada pela Encarregada (DPO) e pela assessoria juridica responsavel.

**Versao do rascunho:** 2026-06-28
**Preparado por:** Equipe de Produto — ShareO
**Base legal de referencia:** LGPD (Lei 13.709/2018), Resolucao CD/ANPD no 02/2022 (RIPD)

---

## Secao A — Identificacao do Controlador e do Encarregado

| Campo | Informacao |
|---|---|
| **Controlador** | ShareO Marketplace de Aluguel Ltda. |
| **CNPJ** | A confirmar com o juridico antes da finalizacao |
| **Endereco** | A confirmar com o juridico antes da finalizacao |
| **Atividade principal** | Plataforma digital de intermediacao de aluguel de bens moveis entre particulares (C2C) |
| **Encarregado (DPO)** | A ser formalmente designado — canal publico ja operacional |
| **Canal do Encarregado** | privacidade@shareo.com.br |
| **Site da plataforma** | https://shareo.com.br (producao — a ativar pos-D4) |

> **Nota para o DPO:** verificar se a designacao formal do Encarregado (art. 41 LGPD) esta documentada internamente e publicada na Politica de Privacidade.

---

## Secao B — Descricao do Tratamento e Finalidades

O ShareO e um marketplace de aluguel local que conecta **Proprietarios** (PF ou PJ que anunciam bens moveis subutilizados) a **Locatarios** (PF ou PJ que buscam alugar itens por periodo determinado). A plataforma atua como **intermediadora e merchant of record** no fluxo financeiro, retendo 15% de taxa de servico e repassando o liquido ao proprietario.

### Finalidades do tratamento de dados pessoais

| Finalidade | Descricao | Necessidade |
|---|---|---|
| **Cadastro e autenticacao** | Criar e manter conta de usuario; autenticar sessoes | Essencial — sem isso nao ha acesso a plataforma |
| **Perfil e navegacao** | Exibir nome, cidade, avatar e vitrine do proprietario | Essencial para o funcionamento do marketplace |
| **Verificacao de identidade** | Confirmar CPF/CNPJ para permitir anunciar ou alugar | Prevencao a fraudes; base legal art. 7 IX (interesse legitimo) e cumprimento de obrigacao |
| **Geolocalizacao** | Busca de itens por proximidade; geocoding do endereco | Essencial para a proposta de valor central da plataforma |
| **Intermediacao de locacao** | Processar reservas, pagamentos e repassar valores | Execucao de contrato (art. 7 V LGPD) |
| **Chat in-app** | Comunicacao entre locatario e proprietario sobre a locacao | Essencial para o servico |
| **Avaliacoes e reputacao** | Publicar avaliacoes mutuas apos cada locacao | Interesse legitimo da plataforma (confianca no marketplace) |
| **Notificacoes transacionais** | E-mails e alertas sobre status de reserva, pagamento, devolucao | Execucao de contrato |
| **Cumprir obrigacoes legais** | Retencao de dados fiscais/transacionais conforme CTN art. 173 | Obrigacao legal (art. 7 II LGPD) |
| **Marketing e comunicacoes** | Newsletter, campanhas, Programa Fundadores | Consentimento explicito (art. 7 I LGPD) — opt-in destacado |
| **Prevencao a fraudes e PLD/FT** | Monitorar transacoes suspeitas, KYC/KYB | Interesse legitimo / cumprimento de obrigacao legal |
| **Administracao e auditoria interna** | Logs de acoes administrativas, resolucao de disputas | Interesse legitimo; obrigacao legal |

---

## Secao C — Inventario de Categorias de Dados Pessoais

Inventario extraido do modelo de dados (`prisma/schema.prisma`) em vigor na data deste rascunho.

### C.1 Dados de identificacao e cadastro (model `users`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `name` | Nome completo | Dado pessoal | Art. 7 V (execucao de contrato) |
| `email` | Endereco de e-mail | Dado pessoal | Art. 7 V (execucao de contrato) |
| `phone` | Numero de telefone | Dado pessoal | Art. 7 V (execucao de contrato) + verificacao SMS |
| `passwordHash` | Hash da senha (bcrypt) | Dado pessoal derivado | Art. 7 V (execucao de contrato) |
| `cpfEncrypted` | CPF criptografado (AES-256-GCM) | Dado pessoal sensivel (documento) | Art. 7 V (execucao de contrato) + art. 7 IX (interesse legitimo — prevencao a fraude) |
| `cpfHash` | HMAC-SHA256 do CPF (unicidade, sem CPF em claro) | Dado pessoal derivado | Art. 7 V + art. 7 IX |
| `cnpjEncrypted` | CNPJ criptografado (AES-256-GCM) — PJ | Dado pessoal/empresarial | Art. 7 V + art. 7 IX |
| `cnpjHash` | HMAC-SHA256 do CNPJ | Dado pessoal derivado | Art. 7 V + art. 7 IX |
| `cnpjResponsavelLegalEncrypted` | Dados do responsavel legal PJ (AES-256-GCM) | Dado pessoal | Art. 7 V + art. 7 IX |
| `avatarUrl` | URL da foto de perfil (bucket publico) | Dado pessoal | Art. 7 V |
| `bio` | Texto livre de apresentacao | Dado pessoal | Art. 7 V + consentimento implicito pela acao do titular |
| `slug` | URL da vitrine publica | Dado pessoal | Art. 7 V |

### C.2 Dados de localizacao (model `users`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `cep` | CEP (somente digitos) | Dado pessoal | Art. 7 V (execucao de contrato — busca por proximidade) |
| `street`, `neighborhood`, `city`, `state` | Endereco base do usuario | Dado pessoal | Art. 7 V |
| `latitude`, `longitude` | Coordenadas geograficas do endereco | Dado pessoal / localizacao | Art. 7 V (geocoding automatico de endereco informado) |

> **Nota para o DPO:** coordenadas de localizacao derivam do endereco informado pelo proprio usuario. A Politica de Privacidade deve informar que o endereco e convertido em coordenadas geograficas e utilizado para exibir proximidade a outros usuarios (resolucao no nivel de cidade, sem expor o endereco exato).

### C.3 Dados de verificacao de identidade (model `users`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `idDocumentUrl` | URL do documento de identidade (RG/CNH) — bucket privado `id-docs` | Dado pessoal sensivel (documento) | Art. 7 IX (interesse legitimo — KYC) |
| `idSelfieUrl` | URL da selfie para verificacao — bucket privado `id-docs` | Dado pessoal — imagem (potencialmente biometrico) | Art. 7 IX (interesse legitimo — KYC) |
| `idVerificationStatus` | Status da verificacao (UNVERIFIED/PENDING/VERIFIED/REJECTED) | Dado pessoal derivado | Art. 7 V + art. 7 IX |
| `idSubmittedAt`, `idVerifiedAt`, `idRejectionReason` | Auditoria do processo de verificacao | Dado pessoal | Art. 7 II (obrigacao legal) + art. 7 IX |

> **Nota para o DPO:** imagens de selfie podem ser enquadradas como dado biometrico (art. 5 II LGPD), categoria especial (art. 11). Verificar se a base legal art. 7 IX e suficiente ou se e necessario consentimento especifico (art. 11 II a). Ponto a confirmar com a advogada no parecer D4.

### C.4 Dados de consentimento e auditoria LGPD (model `users`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `consentAt` | Momento do consentimento ao cadastro | Dado de auditoria | Art. 7 I (consentimento) |
| `consentIp` | IP no momento do consentimento | Dado pessoal | Obrigacao legal — registro do consentimento |
| `consentVersion` | Versao da politica aceita | Dado de auditoria | Obrigacao legal |
| `ageDeclaredAt` | Declaracao de maioridade (18+) | Dado de auditoria | Art. 14 LGPD (protecao de menores) |
| `profileCompletedAt` | Momento da conclusao do cadastro completo | Dado operacional | Art. 7 V |

### C.5 Dados transacionais de locacao (models `bookings`, `booking_items`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| Identificadores das partes (`borrowerId`, `ownerId`) | Vinculo entre usuarios e reservas | Dado pessoal | Art. 7 V (execucao de contrato) |
| `startDate`, `endDate`, `totalDays` | Periodo de locacao | Dado transacional | Art. 7 V |
| `dailyPrice`, `totalPrice` | Valores contratados | Dado financeiro | Art. 7 V + art. 7 II (retencao fiscal) |
| `platformFeeAmount`, `ownerNetAmount` | Retencao e repasse financeiro | Dado financeiro | Art. 7 V + art. 7 II |
| `pixDeclaredAt` | Declaracao de pagamento via PIX | Dado financeiro/transacional | Art. 7 V |
| `borrowerNote`, `ownerNote` | Notas textuais entre as partes | Dado pessoal | Art. 7 V |
| `cancelReason` | Motivo de cancelamento | Dado pessoal | Art. 7 V |
| `pickupToken` | Codigo de retirada segura (6 digitos) | Dado operacional de seguranca | Art. 7 V |
| `lateFeeAmount` | Taxa de atraso na devolucao | Dado financeiro | Art. 7 V |
| `returnRequestedAt`, `returnedAt` | Timestamps do fluxo de devolucao | Dado transacional | Art. 7 V |
| `contractSignedAt` | Aceite eletronico do contrato | Dado juridico | Art. 7 V + art. 7 II |

### C.6 Dados de pagamento (models `owner_payment_accounts`, `platform_transactions`, `payouts`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `pixKey` | Chave PIX do proprietario (CPF/CNPJ/e-mail/telefone/aleatoria) | Dado financeiro sensivel | Art. 7 V (execucao de contrato — repasse) + art. 7 II (fiscal) |
| `pixKeyType` | Tipo da chave PIX | Dado financeiro | Art. 7 V |
| `holderName`, `bankName` | Dados da conta bancaria do proprietario | Dado financeiro | Art. 7 V + art. 7 II |
| `amount`, `status`, `processedAt` | Valores e status de repasse | Dado financeiro | Art. 7 V + art. 7 II |

### C.7 Dados de comunicacao (models `conversations`, `messages`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| Identificadores dos participantes | Vinculo usuario-conversa | Dado pessoal | Art. 7 V (execucao de contrato) |
| `content` | Conteudo das mensagens de chat | Dado pessoal potencialmente sensivel | Art. 7 V (execucao de contrato) |
| `readAt`, `createdAt` | Metadados de comunicacao | Dado pessoal | Art. 7 V |
| `deletedAt` | Soft delete de mensagem (LGPD) | Dado de controle | Art. 18 LGPD (exclusao pelo titular) |

> **Nota para o DPO:** mensagens privadas entre usuarios sao potencialmente sensiveis. Formalizar na Politica de Privacidade as circunstancias em que a equipe interna pode acessar conversas (ex.: resolucao de disputas) e garantir que o acesso seja logado em `admin_logs`.

### C.8 Dados de avaliacao e reputacao (model `reviews`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `rating`, `comment` | Nota e comentario da avaliacao | Dado pessoal | Art. 7 V (execucao de contrato) + interesse legitimo (confianca no marketplace) |
| `sentiment`, criterios de avaliacao | Criterios multidimensionais | Dado pessoal | Art. 7 V |
| `photoUrl` | Foto do item em uso (opcional, enviada pelo locatario) | Dado pessoal / imagem | Consentimento implicito pela acao + art. 7 V |

### C.9 Dados do Programa Fundadores e marketing (models `founder_leads`, `users`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `email`, `name` (FounderLead) | Dados do interessado na lista de espera | Dado pessoal | Art. 7 I (consentimento explicito — opt-in) |
| `intent`, `city`, `state` | Interesse e localizacao do lead | Dado pessoal | Art. 7 I (consentimento) |
| `marketingConsentAt`, `consentVersion`, `consentIp` | Auditoria do consentimento de marketing | Dado de auditoria | Obrigacao legal (registro do consentimento — art. 7 I LGPD) |
| `utmSource`, `utmMedium`, `utmCampaign` | Origem da campanha de marketing | Dado de comportamento | Art. 7 I (consentimento) |
| `signupSource`, `signupSourceMeta` | Canal de cadastro do usuario | Dado de comportamento | Art. 7 V + interesse legitimo |

### C.10 Dados do Programa de Embaixadores (models `ambassador_profiles`, `referrals`, `ambassador_commissions`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `consentAt`, `consentVersion`, `consentIp` (AmbassadorProfile) | Opt-in auditavel do programa | Dado de auditoria | Art. 7 I (consentimento explicito) |
| `pixKey`, `pixKeyType` (AmbassadorProfile) | Chave PIX para pagamento de comissoes | Dado financeiro | Art. 7 V (execucao de contrato — comissoes) |
| `revokedAt` | Revogacao do opt-in | Dado de controle | Art. 18 LGPD |
| Identificadores de Referral e Commission | Vinculo entre embaixador, indicado e reserva | Dado pessoal | Art. 7 V |

### C.11 Dados de controle de acesso e auditoria administrativa (models `admin_logs`, `contract_acceptances`)

| Campo no banco | Descricao | Classificacao | Base legal provavel |
|---|---|---|---|
| `action`, `entityType`, `entityId`, `metadata` (AdminLog) | Registro de acoes administrativas | Dado operacional de auditoria | Art. 7 II (obrigacao legal) + interesse legitimo |
| `acceptedAt`, `ipAddress`, `userAgent` (ContractAcceptance) | Aceite eletronico do contrato de locacao | Dado de auditoria juridica | Art. 7 II + art. 7 V |
| `cnpjDeclaracaoAt`, `cnpjDeclaracaoIp`, `cnpjDeclaracaoVersion` | Auditoria da declaracao KYB PJ | Dado de auditoria | Art. 7 II + art. 7 IX |

---

## Secao D — Fluxo de Dados

### D.1 Coleta

| Momento | Dados coletados | Meio |
|---|---|---|
| Cadastro inicial | Nome, e-mail, senha, cidade, UF, tipo de usuario | Formulario web (Next.js) |
| Conclusao do cadastro | CPF/CNPJ, endereco completo, telefone | Formulario web (progressivo) |
| Verificacao de identidade | Foto do documento, selfie | Upload via UI — armazenado no Supabase Storage (`id-docs`, privado) |
| Anuncio de item | Titulo, descricao, fotos, precos, localizacao do item | Formulario web — fotos no Supabase Storage (`item-images`, publico) |
| Solicitacao de locacao | Periodo, nota ao proprietario, aceitacao do contrato | Plataforma web |
| Pagamento | Declaracao de PIX (fase MVP); chave PIX do proprietario (para repasse) | Plataforma web |
| Chat | Mensagens entre as partes | Supabase Realtime |
| Fotos de check-in/check-out | Registro visual do estado do item | Upload via UI — Supabase Storage (`booking-photos`, publico) |
| Lista de Fundadores | E-mail, nome, cidade, intencao, consentimento de marketing | Formulario web |

### D.2 Uso e processamento

Os dados sao processados pelo backend da plataforma (Next.js API Routes rodando na Vercel) e armazenados no PostgreSQL via Supabase (regiao sa-east-1, Brasil). O processamento ocorre em servidores da Vercel (EUA/global), com os dados persistidos no banco localizado no Brasil.

Transmissao para terceiros:
- **Geocoding:** CEP/endereco convertido em coordenadas via Mapbox Geocoding API (EUA) — apenas o texto do endereco e transmitido, sem identificadores do usuario.
- **Notificacoes transacionais:** nome, e-mail e informacoes minimas sobre o status da reserva transmitidos via Resend (EUA).
- **Monitoramento de erros:** stacktraces e contexto de erros transmitidos via Sentry (EUA), com filtro ativo de PII — nenhum dado pessoal identificavel deve constar nos eventos.

### D.3 Armazenamento

| Tipo de dado | Local | Protecao |
|---|---|---|
| Dados cadastrais e transacionais | PostgreSQL — Supabase sa-east-1 (Brasil) | Criptografia em repouso (Supabase); AES-256-GCM para campos sensiveis (CPF/CNPJ/responsavel legal) no nivel de aplicacao |
| Fotos de itens | Supabase Storage — bucket `item-images` (publico) | Acesso publico; sem dados pessoais diretos |
| Fotos de check-in/check-out | Supabase Storage — bucket `booking-photos` (publico) | Acesso publico; contexto de locacao especifico |
| Documentos de identidade e selfies | Supabase Storage — bucket `id-docs` (privado) | Acesso apenas via service role key server-side; URLs pre-assinadas com expiracao de curto prazo |
| Sessoes de autenticacao | JWT em cookie HTTP-only `__Secure-authjs.session-token` (HTTPS) | Nao persistido no banco (estrategia sem PrismaAdapter); expira automaticamente |

### D.4 Eliminacao e anonimizacao

| Dado | Gatilho de eliminacao | Tratamento |
|---|---|---|
| Conta de usuario (art. 18) | Requisicao pelo titular via `DELETE /api/users/me` | Soft delete (`deletedAt`) + anonimizacao de PII (nome, e-mail, CPF/CNPJ, documentos, avatar) |
| Mensagens privadas | Exclusao pelo remetente | Soft delete (`deletedAt`); eliminacao fisica pos-prazo fiscal |
| Dados fiscais/transacionais | Expirado o prazo de 5 anos | Eliminacao fisica pos-cumprimento da retencao |
| Lead da lista Fundadores | Solicitacao de descadastro (`UNSUBSCRIBED`) | `deletedAt` + remocao da lista de envios |
| Opt-out do programa de embaixadores | Revogacao do opt-in | `revokedAt` preenchido; dados de comissoes historicas retidos para auditoria fiscal |
| Documentos de identidade | Exclusao da conta (salvo disputa ou obrigacao legal pendente) | Eliminacao dos arquivos no Supabase Storage + anonimizacao dos campos no banco |

---

## Secao E — Medidas de Seguranca Implementadas

| Medida | Descricao | Alcance |
|---|---|---|
| **Criptografia de campos sensiveis** | AES-256-GCM para CPF, CNPJ e dados do responsavel legal PJ | Banco de dados (nivel de aplicacao) |
| **Hash para unicidade** | HMAC-SHA256 para indexacao de CPF/CNPJ sem armazenar o dado em claro | Banco de dados |
| **Bucket privado de documentos** | `id-docs` acessivel somente via service role server-side; URLs pre-assinadas com TTL curto | Supabase Storage |
| **Autenticacao JWT HTTP-only** | Cookie `__Secure-authjs.session-token` em HTTPS — nao acessivel por JavaScript no navegador | Sessoes de usuario |
| **Guards server-side** | Toda requisicao de dado verifica `resource.ownerId === session.user.id` — retorna 403 em caso de divergencia | API Routes (Next.js) |
| **Mascaramento de PII em logs** | PII nao e registrada em logs de aplicacao, nem em URLs, nem em localStorage | Toda a stack |
| **Filtro de PII no Sentry** | Eventos enviados ao Sentry passam por filtro para remover dados pessoais identificaveis | Monitoramento de erros |
| **CSP (Content Security Policy)** | Headers restritivos no middleware Next.js; dominios externos explicitamente listados em `connect-src` | Frontend |
| **Consentimento versionado** | `consentVersion` registrada com IP e timestamp no cadastro e em cada opt-in especifico | Banco de dados |
| **Soft delete obrigatorio** | `deletedAt` em usuarios, reservas, itens e mensagens — dados nao sao apagados fisicamente antes do prazo legal | Banco de dados |
| **RLS desabilitado com guards equivalentes** | RLS incompativel com PgBouncer; seguranca equivalente implementada por guards server-side (documentado em ADR) | Banco de dados / API |
| **Verificacao de e-mail** | Token SHA-256 com expiracao de 48h exigido antes de habilitar o uso pleno da conta | Autenticacao |
| **Validacao de tipo MIME em uploads** | Uploads verificam tipo de arquivo no servidor antes de armazenar no Storage | Supabase Storage |

---

## Secao F — Riscos aos Titulares e Mitigacoes

| # | Risco identificado | Probabilidade | Impacto | Mitigacao existente | Lacuna / acao necessaria |
|---|---|---|---|---|---|
| F-01 | Vazamento de CPF/CNPJ por falha no banco | Baixa | Alto | AES-256-GCM no nivel da aplicacao; acesso via service role | Avaliar rotacao periodica das chaves de criptografia; plano de resposta a incidentes (art. 48 LGPD) |
| F-02 | Acesso nao autorizado a documentos de identidade | Baixa | Alto | Bucket `id-docs` privado; URLs pre-assinadas com TTL curto | Definir TTL maximo das URLs pre-assinadas; implementar log de acessos ao bucket |
| F-03 | Exposicao de PII em logs ou relatorios de erro | Baixa | Medio | Filtro Sentry; PII nao gravada em logs | Auditar periodicamente a efetividade do filtro; testar com dados sinteticos |
| F-04 | Uso de dados para finalidade diversa da declarada | Baixa | Alto | Consentimento versionado; finalidades declaradas na Politica | Nao ampliar finalidades sem nova coleta de consentimento especifico |
| F-05 | Dificuldade do titular em exercer direitos (art. 18) | Medio | Medio | `DELETE /api/users/me`; `GET /api/users/me/export` implementados | Publicar canal de atendimento destacado na Politica; definir SLA de resposta (15 dias — ANPD) |
| F-06 | Transferencia internacional sem adequacao formal | Medio | Alto | Dados persistidos em sa-east-1 (Brasil); subprocessadores EUA para funcoes auxiliares limitadas | Formalizar DPAs e/ou clausulas contratuais padrao com Resend, Sentry, Mapbox e Vercel (ver `docs/juridico/transferencia-internacional-dados.md`) |
| F-07 | Retencao excessiva de dados apos prazo legal | Baixo | Medio | Politica de retencao definida (5 anos fiscal; demais na exclusao de conta) | Implementar processo automatizado de eliminacao pos-prazo |
| F-08 | Acesso interno injustificado a mensagens privadas | Baixo | Alto | Acesso restrito a roles ADMIN_SUPERADMIN e ADMIN_OPERACIONAL (disputas) | Formalizar politica interna de acesso a conversas; garantir log em `admin_logs` de todo acesso |
| F-09 | Imagens de selfie classificadas como dado biometrico | Medio | Alto | Bucket privado; acesso restrito server-side | Confirmar com DPO/advogada se exige base legal art. 11 LGPD (dado sensivel) em vez de art. 7 IX |
| F-10 | Dados de menores de 18 anos | Baixo | Alto | Declaracao de maioridade (`ageDeclaredAt`) no cadastro | Verificar se a autodeclaracao e suficiente perante a ANPD ou se exige verificacao adicional (art. 14 LGPD) |
| F-11 | Incidente de seguranca sem notificacao tempestiva | Baixo | Alto | Monitoramento via Sentry | Formalizar plano de resposta a incidentes e procedimento de notificacao a ANPD e titulares (art. 48 LGPD — 72h) |

---

## Secao G — Direitos dos Titulares

A LGPD (arts. 17 a 22) garante ao titular os seguintes direitos, todos operacionalizados na plataforma:

| Direito | Base legal | Implementacao no ShareO | Canal |
|---|---|---|---|
| Confirmacao de existencia de tratamento | Art. 18 I | Painel "Minha Conta" exibe dados cadastrais | App + privacidade@shareo.com.br |
| Acesso aos dados | Art. 18 II | `GET /api/users/me` + exportacao de perfil | App |
| Correcao de dados incompletos ou inexatos | Art. 18 III | Edicao de perfil no App | App |
| Anonimizacao, bloqueio ou eliminacao | Art. 18 IV | `DELETE /api/users/me` com soft delete + anonimizacao | App + privacidade@shareo.com.br |
| Portabilidade | Art. 20 | `GET /api/users/me/export` (JSON estruturado) | App |
| Eliminacao dos dados tratados com consentimento | Art. 18 VI | `DELETE /api/users/me` — elimina dados nao sujeitos a retencao legal | App + privacidade@shareo.com.br |
| Revogacao do consentimento de marketing | Art. 18 IX | Descadastro de newsletter; status `UNSUBSCRIBED` no FounderLead | App + link de descadastro no e-mail |
| Informacao sobre compartilhamento | Art. 18 VII | Politica de Privacidade + `docs/juridico/transferencia-internacional-dados.md` | /privacidade |
| Peticao a ANPD | Art. 18 VIII | Informado na Politica de Privacidade | Externo (ANPD) |

> **Nota para o DPO:** definir e publicar SLA interno de resposta a requisicoes de titulares. A ANPD recomenda 15 dias corridos (prorrogavel por igual periodo mediante justificativa). O canal `privacidade@shareo.com.br` deve estar monitorado e com resposta garantida.

---

## Secao H — Politica de Retencao de Dados

| Categoria de dado | Prazo de retencao | Base legal | Tratamento apos o prazo |
|---|---|---|---|
| **Dados fiscais e transacionais** (valores, taxas, repassses, NF, splits) | **5 anos** contados do ano seguinte ao lancamento fiscal | CTN art. 173 (prescricao tributaria) | Eliminacao fisica ou anonimizacao irreversivel |
| **Registros de acoes de usuarios e admins** (`admin_logs`, `contract_acceptances`) | **5 anos** | Interesse legitimo (defesa em juizo) + CTN art. 173 | Eliminacao fisica |
| **Logs de conexao e acesso** (IP de consentimento, IP de declaracao KYB) | **6 meses** (minimo legal) a **5 anos** (fiscal) | Marco Civil art. 15 + CTN art. 173 | Eliminacao fisica |
| **Dados de comunicacao (mensagens de chat)** | Ate exclusao de conta ou solicitacao do titular; minimo 6 meses (Marco Civil) | Art. 18 LGPD + Marco Civil art. 15 | Soft delete imediato; eliminacao fisica pos-prazo |
| **Dados de verificacao de identidade** | Ate exclusao de conta (salvo disputa ou obrigacao legal pendente) | Art. 18 LGPD | Eliminacao dos arquivos no Supabase Storage + anonimizacao dos campos no banco |
| **Dados de marketing / leads (FounderLead)** | Ate revogacao do consentimento ou status `UNSUBSCRIBED` | Art. 7 I LGPD (revogavel pelo titular) | Soft delete + remocao das listas de envio |
| **Registros de consentimento** (audit trail dos opt-ins) | **5 anos** apos a revogacao | Prova de cumprimento legal (defesa judicial) | Eliminacao fisica |
| **Demais dados de perfil** (nome, cidade, bio, avatar) | Ate exclusao de conta pelo titular | Art. 18 LGPD | Anonimizacao irreversivel via `DELETE /api/users/me` |

---

## Proximos Passos (acoes necessarias antes do go-live)

1. **Revisao e validacao pelo DPO/advogada** — este rascunho deve ser revisado, complementado (CNPJ/endereco do controlador) e assinado antes de ter valor formal.
2. **Confirmar base legal para selfies/dados biometricos** (Secao C.3, risco F-09) — verificar se exige art. 11 LGPD.
3. **Formalizar DPAs com subprocessadores internacionais** (ver `docs/juridico/transferencia-internacional-dados.md`).
4. **Publicar canal de atendimento a titulares** de forma destacada na Politica de Privacidade (`/privacidade`).
5. **Definir SLA de resposta** a requisicoes de titulares (art. 18) — recomendado 15 dias.
6. **Elaborar plano de resposta a incidentes** com procedimento de notificacao a ANPD e titulares (art. 48 — 72h).
7. **Implementar processo de eliminacao pos-prazo** para dados que atingirem o fim do periodo de retencao.
8. **Arquivar o RIPD finalizado** internamente conforme exigencia da ANPD (Resolucao CD/ANPD no 02/2022).

---

*Documento preparado pela equipe de Produto/Tecnologia — ShareO Marketplace de Aluguel.*
*Versao para revisao juridica — nao publicar nem distribuir sem aprovacao do DPO.*
