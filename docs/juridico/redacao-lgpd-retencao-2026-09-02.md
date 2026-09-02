# LGPD — prazo de exclusão: o que o sistema faz e a redação proposta

**Para: Raimundo** · 2 de setembro de 2026 · item 2 da pauta de 02/09

Você recebeu este ponto como "duas páginas publicadas dizem prazos diferentes para o mesmo direito: 15 dias na Central de Ajuda, 90 dias na Política de Privacidade". Fui apurar qual dos dois descreve o sistema.

**Nenhum dos dois.** A exclusão é imediata.

---

## O que o sistema faz hoje, medido no código

`DELETE /api/users/me` roda no clique do titular, em **uma transação atômica**, sem fila, sem ticket e sem analista no meio. Nesse instante:

| O que acontece | Campos |
|---|---|
| Identificação anonimizada | nome, e-mail, telefone, bio, avatar |
| Localização removida | cidade, estado, bairro, latitude, longitude |
| Documentos removidos | CPF e CNPJ (hash e cifrado), URLs do documento e da selfie, status de verificação |
| Credenciais removidas | hash da senha |
| Texto livre apagado | comentários de avaliação, conteúdo das mensagens privadas |
| Reservas | pendentes e confirmadas são canceladas |
| Arquivos | documentos de identidade apagados do armazenamento privado |

Duas travas antes disso: a exclusão é recusada se houver **locação em andamento**, e registros financeiros dos últimos 5 anos são **retidos de forma anonimizada** por obrigação fiscal (CTN art. 173), com o titular informado na hora — art. 18 §3º.

Ou seja: o prazo publicado de 15 dias é 15 dias mais longo que a realidade, e o de 90 dias é 90.

---

## Por que provavelmente havia dois números

Suspeito que os dois textos tentavam dizer coisas diferentes sem explicitar o escopo, o que é comum no mercado:

- **15 dias** é o prazo do **art. 19 §2º da LGPD** — o prazo para *responder* a um pedido de acesso, não para eliminar. Para eliminação, a lei não fixa número.
- **90 dias** costuma ser o prazo escrito para **cópias de segurança**, que não podem ser editadas cirurgicamente e só somem por rotação.

O problema não é ter dois prazos: é os dois aparecerem sem dizer a que se referem, em páginas diferentes, parecendo contradição.

---

## Redação proposta

### Política de Privacidade, seção 8 (Retenção de Dados)

**Hoje:**

> Mantemos seus dados enquanto sua conta estiver ativa ou pelo período necessário para cumprir obrigações legais. Após a exclusão da conta, os dados são anonimizados ou apagados em até 90 dias, exceto onde a lei exige retenção por período maior.

**Proposta:**

> Mantemos seus dados enquanto sua conta estiver ativa ou pelo período necessário para cumprir obrigações legais. A exclusão da conta é processada **imediatamente**: seus dados de identificação, localização, documentos e textos escritos por você são anonimizados ou apagados no momento da solicitação. Registros de transações concluídas são preservados de forma anonimizada pelo prazo exigido pela legislação fiscal (5 anos), sem identificar você. Cópias de segurança operacionais, por sua natureza, são substituídas pelo ciclo de rotação do provedor de infraestrutura.

### Central de Ajuda — "Como excluir minha conta?"

**Hoje:**

> A exclusão remove todos os seus dados pessoais em até 15 dias (conforme a LGPD).

**Proposta:**

> A exclusão remove seus dados pessoais **na hora** — nome, e-mail, telefone, endereço, documentos e textos que você escreveu. Reservas em andamento precisam ser finalizadas antes da exclusão. O histórico de transações é mantido de forma anonimizada por até 5 anos para fins legais e fiscais.

### Central de Ajuda — tabela de prazos de atendimento

Sai a linha "Solicitações de exclusão de conta (LGPD): até 15 dias". A exclusão não é uma solicitação atendida por prazo — é uma ação do próprio titular, com efeito imediato. Manter uma linha de SLA sugere o contrário.

---

## Dois pontos abertos, que a apuração revelou

Nenhum dos dois impede aprovar a redação acima, mas você precisa saber.

### 1. A retenção de backup não está definida

Deixei a frase sobre cópias de segurança **sem número** de propósito. O prazo real depende da configuração de backup e PITR no provedor, e essa configuração **ainda não foi feita**: consta como item aberto no checklist de go-live (`docs/checklist-go-live.md`, "Backups/PITR + política de retenção + runbook de restauração").

Escrever "90 dias" sem ter configurado a rotação seria repetir exatamente o defeito que estamos eliminando — prometer procedimento que não existe. **Quando a retenção for definida, o número entra na frase.** Se preferir um número já, ele precisa vir da configuração, não do texto.

### 2. O expurgo automático dos 5 anos não existe

Ao excluir a conta, quando há retenção fiscal, o sistema informa ao titular:

> "Registros financeiros dos últimos 5 anos foram preservados de forma anonimizada conforme exigência fiscal (CTN art. 173). **Serão expurgados automaticamente após o prazo.**"

Existem rotinas automáticas de expurgo para logs administrativos, logs de acesso e IPs de consentimento — todas com 5 anos. **Não existe nenhuma para os registros financeiros retidos.** Hoje ninguém os apaga.

Como a plataforma tem menos de um ano, nada venceu ainda — o prazo prático para construir é longo. Mas a frase promete um automatismo que não existe, o que é a mesma família dos outros pontos.

**Caminhos:** (a) construir a rotina, do mesmo formato das três que já existem; (b) trocar "automaticamente" por "após o prazo", sem prometer o mecanismo. Recomendo (a): o padrão já está montado e é o comportamento que o titular espera.

---

## O que peço

1. Aprovar (ou ajustar) as três redações acima.
2. Dizer se aceita a frase de backup sem número até a retenção ser configurada.
3. Escolher entre (a) e (b) no ponto do expurgo dos 5 anos.

Nada foi alterado nas páginas. A alteração entra depois do seu retorno, junto com o item 4 (proteção/seguro), que também está com você.
