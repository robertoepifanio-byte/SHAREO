# Processo de Verificação de Contas PIX

**Versão:** 1.0 — 2026-06-12
**Responsável:** ADMIN_FINANCEIRO (ou SUPERADMIN)
**Tela:** `/admin/financeiro/contas-pix`

## Contexto

No MVP, a verificação de chaves PIX é **manual** — não há integração com a API DICT do
Banco Central (planejada para H2). O objetivo do processo é garantir que o repasse
chegue à pessoa certa: a chave deve pertencer ao **titular da conta ShareO** que vai
receber os repasses.

## Checklist obrigatório antes de marcar "Verificada"

1. **Titularidade do nome** — `holderName` informado deve corresponder ao nome do
   usuário na plataforma (tolerar abreviações; desconfiar de nomes totalmente diferentes).
2. **Coerência da chave com o tipo:**
   - `CPF`: 11 dígitos válidos; deve ser o CPF do próprio usuário (comparar com o
     cadastro se disponível).
   - `EMAIL`: idealmente o mesmo e-mail da conta ShareO. Se for outro, exigir
     justificativa via chat/suporte.
   - `PHONE`: formato +55 com DDD; idealmente o telefone do perfil.
   - `EVP` (chave aleatória): não tem titularidade aparente — **fazer transferência
     de teste** (ver passo 4) obrigatoriamente.
3. **Histórico do usuário** — conta criada há menos de 7 dias com chave de terceiro é
   sinal de alerta; verificar e-mail confirmado e ao menos 1 anúncio real.
4. **Transferência de teste (R$0,01)** — para chaves EVP ou qualquer caso de dúvida:
   enviar R$0,01 via app bancário da ShareO e confirmar que o nome do recebedor exibido
   pelo banco bate com o `holderName`. O comprovante fica arquivado na pasta do
   financeiro (Drive).
5. **Registrar decisão** — aprovar ou rejeitar pela UI. Toda ação fica no `AdminLog`.
   Em caso de rejeição, descrever o motivo (o proprietário verá o status e pode
   cadastrar nova chave).

## Sinais de fraude — rejeitar e escalar

- Nome do recebedor (banco) diferente do `holderName` informado
- Mesmo CPF/chave cadastrado em múltiplas contas ShareO
- Usuário pressionando por aprovação urgente via chat/suporte
- Chave alterada repetidamente em curto intervalo

Escalar para o SUPERADMIN com print da tela + dados do `AdminLog`.

## SLA

- Verificação em até **2 dias úteis** após o cadastro da chave.
- Repasses só são executados para contas `VERIFIED` — chave pendente atrasa o payout
  do proprietário, então a fila pendente deve ser zerada antes do cron de segunda-feira.

## Evolução (H2)

- Integração com API DICT/Bacen para validação automática de titularidade
- Bloqueio automático de chave duplicada entre contas
