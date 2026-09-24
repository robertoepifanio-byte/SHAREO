# Decisão de desbloqueio do D4 — risco assumido pelos fundadores (24/09/2026)

> **Não é parecer jurídico.** É o registro de uma decisão de negócio dos fundadores e da lista do que segue **aberto**. Nada abaixo foi resolvido por esta decisão: ela só retira o D4 como impedimento para o go-live.

## A decisão

- Em **24/09/2026** os fundadores decidiram **desbloquear o D4** e seguir para o **go-live em 01/10/2026**, **sem parecer jurídico assinado**.
- A advogada que orienta o projeto é amiga do Raimundo e o apoia **sem cobrar**. Ela **não assinará nenhum documento até o projeto "Decolar"** (informação do Roberto).
- O Raimundo (Encarregado/DPO e sócio) foi informado das implicações e **quer assumir o risco**.
- **E-mail enviado pelo Roberto em 24/09/2026, às 12:07** (horário de Brasília), ao Raimundo e a `marketing@shareo.com.br`, com o assunto "Go-live de 01/10: o que segue em aberto e o risco assumido sem parecer jurídico". Texto em [`email-raimundo-desbloqueio-d4-2026-09-24.md`](email-raimundo-desbloqueio-d4-2026-09-24.md).
- **Aceite escrito do Raimundo: RECEBIDO em 24/09/2026, às 16:15** (horário de Brasília), como resposta ao e-mail acima, no mesmo fio, para o Roberto e `marketing@shareo.com.br`. Texto, na íntegra: "Li, entendi as pendências acima e assumo o risco do go-live em 01/10 sem parecer jurídico assinado."
  - **O que é:** resposta por e-mail, de uma linha, sobre as pendências listadas no e-mail das 12:07. **Não é documento assinado** e não substitui o parecer nem a assinatura do RIPD (pendência 7).
  - **Fonte:** captura de tela do Gmail do Roberto (24/09). O e-mail original fica na caixa dele; **guardar o fio completo (PDF ou .eml) no dossiê fora do repositório**, porque contém dados pessoais e a análise de risco.
  - **O que o aceite cobre:** o go-live de 01/10 sem parecer assinado, com as 11 pendências abaixo abertas. Não cobre pendência nova nem mudança de escopo (por exemplo, abrir a divulgação pública antes de 01/10): nesses casos, novo registro.
- O RIPD que ele assinou em 21/09 (Seção I) diz que a ShareO **não deve abrir o marketplace ao público** enquanto as pendências "bloqueia go-live" estiverem abertas. Esta decisão **excepciona** essa frase: registrar a exceção e refazer o RIPD conforme a Seção I ("refazer quando houver… resposta da advogada às pendências 1 e 2").
- Cada passo de produção **com efeito público** (apontar `shareo.com.br` para o app, Stripe em modo live, tag `web-v*`) continua exigindo instrução explícita do fundador.

## O que segue aberto em 24/09/2026

| # | Pendência | Estado | Dono | Quando |
|---|---|---|---|---|
| 1 | **Transferência internacional (LGPD art. 33; Res. CD/ANPD 19/2024).** Só a Stripe adota as cláusulas-padrão brasileiras. Sem elas: Vercel, Resend, Sentry, Mapbox, Upstash, Google (GTM) e Supabase (dado em sa-east-1, matriz nos EUA). Prazo da ANPD venceu em 23/08/2025. Cartas aos fornecedores **não enviadas** (`art33-fornecedores-recheck-2026-09-23.md`) | Aberta | Raimundo | Pode ser depois do go-live |
| 2 | **Plano de resposta a incidentes (Cláusulas 15 e 16).** Só rascunho; falta adoção pelo Encarregado, exercício de mesa e conferir na fonte o prazo (3 dias úteis) e o canal de comunicação à ANPD (`plano-resposta-incidentes-e-direitos-titular.md`) | Rascunho | Raimundo | **Antes de 01/10** |
| 3 | **Recifragem da `ENCRYPTION_KEY`** (contenção de vazamento da chave). Script e runbook no PR #500, testados só com banco falso | Nunca exercitada em banco | Técnico | Ensaiar em staging antes de 01/10 |
| 4 | **Termos, seções 6 e 7 (Lei 12.865 / PLD).** Texto da advogada aplicado e no ar, com desvios nossos que ela não revisou (taxa dinâmica; quem paga a taxa em 6.2 × Políticas 1.7 × Ajuda; Ajuda ainda cita repasse manual por PIX; 6.3/6.8 permitem trocar de provedor). A resposta dela de 21/09 põe o risco na **redação** | Sem revisão final | Roberto | Alinhar os textos antes de 01/10 |
| 5 | **Biometria (selfie do KYC, F-09).** O texto de consentimento cita razão social que nunca existiu e "Encarregada"; a flag `biometricConsentRequired` está desligada | Aberta | Técnico + Raimundo | **Decidir antes de 01/10:** desligar a verificação por selfie **ou** corrigir o texto (nova versão) e ligar a flag |
| 6 | **Registros de acesso (Marco Civil art. 15).** As Políticas §2.1/§2.4 declaram guarda de 6 meses, mas `accessLogsEnabled` está desligada e, ligada, cobre só 8 rotas. Hoje a Política promete o que não é feito | Aberta | Técnico | **Antes de 01/10:** ligar (com testes) **ou** corrigir o texto |
| 7 | **RIPD:** falta a assinatura do representante legal do controlador; Seção A e item 7 da Seção I ficaram desatualizadas (o nome do Encarregado já está publicado) | Aberta | Roberto | Antes de 01/10 |
| 8 | **`CONSENT_VERSION` e aviso de 30 dias** (Políticas §1.8) para alterações substanciais desde 20/08. Sem usuários reais hoje, o aviso não alcança ninguém no go-live; reavaliar quando houver base | Pergunta sem resposta | Raimundo | Depois |
| 9 | **Google Tag Manager:** declaração confirmada pelo Raimundo em 24/09 (verbal). **Não cobre** o console do GTM (gatilho de formulário, Enhanced Conversions); a trava de código é o PR #499 | Declaração ok; console a revisar | Roberto | Revisar o container `GTM-5TQLGHFT` |
| 10 | **Backup do Storage e cópia local de documentos de identidade (F-17)** | Aberta | Roberto | Antes da 1ª locação real |
| 11 | F-14 (chave PIX e segredo de webhook em claro), F-15 (fotos em bucket público), F-16 (fila de e-mail sem prazo), F-10 (autodeclaração de maioridade), nota de "agente de pequeno porte" | Abertas | — | Não bloqueiam |

## O que já está de pé

RIPD assinado pelo Encarregado (21/09); Encarregado publicado na Política (24/09, no ar); GTM declarado nas Políticas (no ar); 2FA de administrador verificado em produção (24/09); segredos de produção rotacionados (24/09); Stripe com as cláusulas-padrão brasileiras; parecer da advogada de 21/09 sobre a Lei 12.865 e o PLD/FT; Termos com as seções 6 e 7 dela (no ar).

## Riscos que o aceite não elimina

- Os direitos dos titulares e a possibilidade de denúncia à ANPD ou de ação continuam existindo. As sanções da LGPD estão no art. 52 (advertência, multa, publicização). **Isto não é parecer**: a extensão real do risco deve ser confirmada com a advogada.
- O Encarregado é o ponto de contato com titulares e com a ANPD a partir do go-live, sem o plano de incidentes adotado (item 2).
- Se a advogada ou outro profissional passar a orientar formalmente, refazer o RIPD e reabrir os itens 1, 4 e 5.
