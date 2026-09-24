# Plano de resposta a incidentes e atendimento ao titular

**Rascunho de 23/09/2026** · fecha o risco **F-11** do RIPD (item 5 da Seção I) e a atividade **C2.8** de `atividades-dpa-ripd-dpo.md` (Cláusulas 15 e 16 do Módulo 2 das CPC da ANPD).

> ⚠️ **Estado: rascunho técnico; o item 5 da Seção I do RIPD segue aberto até cumprir a Parte 3.** Um plano nunca exercitado é hipótese escrita em prosa — mesmo aviso do `docs/runbook-restauracao-backup.md`.
>
> Este documento **não entra na Política nem nos Termos**. É procedimento interno. Repositório é público: **nenhum dado pessoal, segredo ou telefone pessoal aqui** — os contatos de emergência ficam num arquivo fora do repositório (item 1.2).

---

## Parte 1 — Incidente de segurança (Cláusula 16)

### 1.1 O que conta

Qualquer evento que exponha, altere, apague ou torne indisponível dado pessoal sem autorização: chave ou segredo vazado, acesso indevido ao painel admin ou ao banco, bucket lido por quem não devia, qualquer fornecedor que nos avise de violação, e-mail enviado ao destinatário errado com dado pessoal.

Na dúvida, **abre-se o registro** (1.4). Fechar como "não era incidente" custa uma linha; não ter registro custa a defesa.

### 1.2 Quem faz o quê

| Papel | Quem | Responsabilidade |
|---|---|---|
| **Encarregado (DPO)** | Raimundo Gomes da Silva (RIPD, seção A) | Decide se há risco ou dano relevante; conduz a comunicação à ANPD e aos titulares; guarda o registro |
| **Técnico de plantão** | Roberto Epifanio | Contém, investiga, preserva evidência, aplica a correção |
| **Assessoria jurídica** | Advogada (via Raimundo) | Valida o texto da comunicação antes do envio |

Canais públicos: `seguranca@shareo.com.br` (recebe o relato) e `privacidade@shareo.com.br` (Encarregado).

### 1.3 Relógio

O prazo começa no **conhecimento**, não na causa: quando alguém da equipe sabe que dado pessoal foi afetado.

| Marco | Prazo | Origem |
|---|---|---|
| Registro aberto e Encarregado avisado | **no mesmo dia** | interno |
| Decisão "há risco ou dano relevante?" | **até 24 h** do conhecimento | interno, para sobrar prazo |
| Comunicação à ANPD e aos titulares afetados | **3 dias úteis** do conhecimento 🔎 | Res. CD/ANPD nº 15/2024 (regulamento do art. 48 da LGPD) — **a advogada confirma o prazo vigente e o formulário** |
| Complemento à ANPD, se faltou informação | conforme a Resolução 🔎 | idem |

Como o **Módulo 2 das CPC atribui a comunicação de incidente ao exportador (nós, não a Stripe)** — `dpa-apuracao-2026-09-03.md`, item 2.1 —, incidente em dado que passou pela Stripe **não** é comunicado por ela em nosso nome.

### 1.4 Passo a passo

**1. Conter (primeiras horas).** Alavancas que existem hoje no código:

| Situação | Ação | Observação verificada |
|---|---|---|
| Sessão de um usuário ou admin comprometida | Trocar a senha / rebaixar-desativar o admin grava um *epoch* em `lib/redis-admin-blocklist.ts`; tokens anteriores caem no middleware | ⚠️ **Falha aberta:** se o Upstash estiver fora, a sessão vale até expirar (`maxAge` = 30 dias) |
| **Todas** as sessões | Trocar `AUTH_SECRET` na Vercel e redeployar | Derruba todo JWT. **Nunca exercitado** — testar em staging antes de precisar |
| Admin sem acesso ao autenticador / conta suspeita | "Reiniciar 2FA" por outro superadmin (`PATCH /api/admin/users/admins/:id`) ou `scripts/reset-admin-2fa.ts` | O script **não** derruba sessões abertas |
| Segredo vazado (`CRON_SECRET`, `E2E_SECRET`, chaves Stripe, `RESEND_API_KEY`, service role do Supabase) | Rotacionar no provedor, na Vercel **e** nos GitHub Secrets (os dois lados, como no CLAUDE.md) | Na Vercel, usar o nome da variável que o **código** lê, não o do secret |
| `ENCRYPTION_KEY` vazada (CPF/CNPJ, segredo TOTP) | 🟡 **Script e runbook escritos em 23/09 (PR #500), nunca exercitados em banco** — rotacionar a chave sem recifrar torna os dados ilegíveis. Falta o ensaio em staging; a rotação da HMAC não está implementada; o procedimento tem janela de indisponibilidade | Runbook: `docs/runbook-rotacao-encryption-key.md`. Era **P2/H2** no `ADR-005` e no RIPD F-01; este plano propõe **fechar o ensaio antes do go-live**: sem ele, o incidente mais grave não tem contenção comprovada |
| Perda ou corrupção de dado (indisponibilidade) | Restaurar conforme `docs/runbook-restauracao-backup.md` | ⚠️ Restauração **nunca testada**; o Storage não entra no backup do banco |
| Vazamento por bucket (`booking-photos` é público por desenho; `id-docs` é privado) | Tornar o bucket privado / revogar URLs assinadas no painel do Supabase | — |
| Fornecedor avisa violação | Pedir por escrito o escopo (quais dados, quais titulares, quando) | Sem isso não há como decidir a comunicação |

**2. Preservar evidência** antes de corrigir: exportar logs da Vercel, do Sentry e do Supabase do período; anotar hora e quem viu. `access_logs` grava atrás da flag `accessLogsEnabled` (**desligada** — RIPD, seção E): sem ela, **não há trilha de quem leu o quê**. Decidir a flag é pré-requisito do go-live.

**3. Avaliar.** Encarregado responde: quais dados (categoria: CPF/CNPJ, documento de identidade, selfie, endereço, mensagens, dados financeiros), quantos titulares, se estavam cifrados, se há indício de uso, e se há **risco ou dano relevante** (dado sensível, documento de identidade, financeiro, ou volume grande → presumir que sim).

**4. Comunicar** (só se houver risco ou dano relevante; na dúvida, a advogada decide):
- **ANPD:** pelo formulário/peticionamento eletrônico da ANPD 🔎, com o conteúdo do modelo abaixo.
- **Titulares:** e-mail (Resend) a todos os afetados, em português simples, **antes de qualquer nota pública**. Não usar o mesmo canal de marketing.
- Conteúdo mínimo (art. 48, §1º da LGPD): natureza dos dados; titulares envolvidos; medidas técnicas de proteção adotadas; riscos; motivos da demora, se houver; medidas de reversão ou mitigação.

**5. Corrigir e fechar.** Causa raiz, correção, teste que teria pegado, lição em memória do projeto. Registro fechado só com o Encarregado assinando.

### 1.5 Registro do incidente (modelo)

Um por incidente, mesmo o que virou "não era incidente". Guardar com o Encarregado, fora do repositório.

```
ID:                       INC-AAAA-NNN
Conhecimento (data/hora): 
Quem detectou e como:     
Descrição:                
Dados afetados:           (categorias; cifrados? sim/não)
Titulares afetados:       (nº ou estimativa; perfis: locador/locatário/admin)
Contenção (o quê/quando): 
Evidência preservada:     (onde)
Risco ou dano relevante?  sim/não — quem decidiu, quando, por quê
ANPD comunicada:          (data/hora, protocolo) ou "não — motivo"
Titulares comunicados:    (data/hora, canal) ou "não — motivo"
Causa raiz:               
Correção:                 
Encerrado por / data:     
```

---

## Parte 2 — Pedido do titular (Cláusula 15)

O RIPD lista o que já existe: **exclusão imediata, exportação (`/api/users/me/export`), edição e canal publicado**. Falta o procedimento **escrito** para o pedido que chega por e-mail.

| Etapa | Regra |
|---|---|
| **Canal** | `privacidade@shareo.com.br` (publicado na Política, seções 2.7 e 9). O pedido feito pela própria conta (exportar, editar, excluir) é atendido pelo produto, sem passar pelo Encarregado |
| **Identificar** | Responder **só** ao e-mail cadastrado. Se vier de outro endereço, pedir que envie do cadastrado. **Não pedir documento** para provar quem é: seria coletar dado novo para atender pedido de privacidade |
| **Prazo** | Como na Seção G do RIPD: **pedido de acesso** em até **15 dias** (art. 19, §2º); **eliminação é imediata** (`DELETE /api/users/me`) e não depende de prazo 🔎 |
| **Direitos** | Os da Seção G do RIPD (art. 18) e como cada um é atendido. Ao responder, explicar também o **direito de peticionar à ANPD**, que a Cláusula 14 exige constar |
| **O que não se apaga** | Registros de transação preservados anonimizados por 5 anos (Política, seção 8); dado exigido por obrigação legal. Dizer isso ao titular, com a base |
| **Registro** | Data, tipo de direito, quem atendeu, data da resposta — planilha restrita ao Encarregado, **sem** copiar o dado do titular |
| **Pedido que vem via fornecedor** | Se o titular escrever à Stripe/Vercel/etc., o fornecedor nos repassa (Módulo 2). A resposta ao titular continua sendo nossa |

---

## Parte 3 — Para dar como resolvido

1. ☐ Encarregado lê e adota (assinatura ou e-mail de aceite arquivado).
2. ☐ Advogada confirma os itens 🔎 (prazo de 3 dias úteis, canal da ANPD, prazo de 15 dias).
3. ☐ **Exercício de mesa** com um cenário real: *"`SUPABASE_SERVICE_ROLE_KEY` apareceu num commit público."* Cronometrar: quanto até o registro aberto, a chave rotacionada nos três lugares e a decisão do Encarregado. Anotar o que travou.
4. ☐ Testar em **staging**: trocar `AUTH_SECRET` derruba as sessões (nunca exercitado).
5. ☐ **Ensaiar em staging** a recifragem de `ENCRYPTION_KEY` (script e runbook prontos no PR #500, testados só com banco falso) e decidir sobre `ENCRYPTION_KEY_PREVIOUS` (evita a janela) e a rotação da HMAC.
6. ☐ Decidir a flag `accessLogsEnabled` (sem ela não há trilha de acesso).
7. ☐ Criar o arquivo de contatos de emergência **fora** do repositório.

