# Texto de Consentimento — Coleta de Selfie Biometrica (KYC)

> **DRAFT — gated D4, nao publicar.**
> Texto produzido em reacao a **decisao juridica de 2026-06-30 (resposta C1)**: a selfie do KYC e dado pessoal sensivel de natureza biometrica e exige consentimento especifico e destacado (LGPD art. 11, II, "a"), separado do aceite dos Termos de Uso e da Politica de Privacidade.
>
> Este texto deve ser revisado pelo DPO/advogada antes de publicacao. Quando aprovado, sera renderizado no fluxo de KYC conforme `docs/juridico/spec-consentimento-biometria-c1.md`. O texto **integral** (sem omissao de paragrafos) deve ser exibido ao titular no momento da coleta; a versao em vigor sera registrada como prova (hash SHA-256 + versao + timestamp + IP).

**Versao:** v1.0 (rascunho — definir versao final no aceite do D4)
**Idioma:** pt-BR (unica versao do produto)
**Forma de apresentacao:** modal/passo dedicado, antes da captura/upload da selfie. Checkbox de aceite **separado** do aceite dos Termos. Botao de captura desabilitado ate o aceite.

---

## Texto a ser exibido ao titular

### Titulo (h2 no modal)

**Autorizacao para uso da sua selfie (dado biometrico)**

### Subtitulo

Para concluir a verificacao da sua identidade, precisamos do seu **consentimento especifico** para tratar uma imagem do seu rosto. Isso e uma exigencia legal porque a sua selfie e considerada um **dado pessoal sensivel** pela Lei Geral de Protecao de Dados (LGPD).

### Corpo (paragrafos numerados — exibir todos)

**1. O que vamos coletar.**
Uma fotografia do seu rosto (selfie), capturada por voce neste fluxo, segurando o documento de identidade que ja foi enviado na etapa anterior.

**2. Por que essa imagem e tratada como dado sensivel.**
A LGPD classifica imagens faciais usadas para confirmar a identidade de uma pessoa como **dado pessoal sensivel de natureza biometrica** (art. 5o, II e art. 11). Por isso, ela recebe uma protecao reforcada e nao pode ser tratada com base em "interesse legitimo": a propria lei exige que voce **consinta especificamente** para esta finalidade.

**3. Finalidade — para que a ShareO vai usar a sua selfie.**
A sua selfie sera utilizada **exclusivamente** para:
- confirmar que voce e a pessoa do documento enviado na etapa anterior;
- prevenir fraudes e o uso indevido de identidades de terceiros na plataforma.

**Sem uso secundario.** Sua selfie **nao sera usada** para reconhecimento facial em outras situacoes, para marketing, para treinar modelos de inteligencia artificial, para enriquecer seu perfil publico, nem sera compartilhada com terceiros que nao a propria equipe de verificacao da ShareO.

**4. Base legal.**
Tratamento realizado com base no **art. 11, inciso II, alinea "a" da LGPD** (consentimento especifico e destacado do titular para finalidades especificas).

**5. Quem vai ter acesso.**
- Voce, pelo seu painel "Minha Conta".
- Apenas analistas autorizados da equipe ShareO, com perfil `SuperAdmin` ou `Operacional`, e exclusivamente para conduzir a verificacao de identidade. Todo acesso de um analista a sua selfie e registrado em log de auditoria interno.
- Em hipotese alguma a selfie sera publicada no seu perfil, em anuncios ou em qualquer area visivel a outros usuarios da plataforma.

**6. Onde sua selfie fica armazenada.**
A imagem e armazenada em area privada e criptografada da infraestrutura da ShareO (bucket privado `id-docs` no Supabase, regiao Brasil), com acesso apenas pelo servidor — nao por links publicos.

**7. Por quanto tempo.**
Sua selfie sera mantida **somente enquanto este consentimento estiver vigente**. A imagem sera apagada do nosso armazenamento na primeira das seguintes situacoes:
- voce revogar este consentimento (em "Minha Conta" ou pelo canal `privacidade@shareo.com.br`);
- voce solicitar a exclusao da sua conta na ShareO;
- a ShareO concluir que nao precisa mais da imagem para a finalidade declarada.

**Importante:** mesmo apos a exclusao da imagem, manteremos por **5 anos** apenas o **registro de que voce consentiu** (data, hora, versao do texto que voce leu, IP de origem) — sem a imagem em si — como prova de cumprimento legal. Isso nao permite reconstruir a sua selfie.

**8. Seus direitos como titular.**
Voce pode, a qualquer momento e gratuitamente:
- confirmar que tratamos a sua selfie e acessar os dados a ela relacionados;
- pedir a correcao ou substituicao da imagem;
- **revogar este consentimento** — o tratamento sera interrompido e a imagem sera apagada;
- pedir a portabilidade dos dados associados ao seu KYC;
- pedir informacoes sobre com quem compartilhamos dados (resposta: nao compartilhamos sua selfie com nenhum terceiro alheio a equipe de verificacao da ShareO);
- apresentar reclamacao a Autoridade Nacional de Protecao de Dados (ANPD).

**9. Como revogar este consentimento.**
A qualquer momento, sem precisar justificar, por dois caminhos:
- pelo painel **Minha Conta > Verificacao de identidade > Revogar consentimento biometrico**;
- pelo e-mail do nosso Encarregado de Dados (DPO): **privacidade@shareo.com.br**.

A revogacao **nao apaga retroativamente** os efeitos do uso licito da imagem ate aquele momento (por exemplo, se voce ja tinha sido aprovado no KYC, a aprovacao continua valida — apenas a imagem em si e apagada).

**10. Consequencias de nao consentir.**
Voce **pode recusar** sem qualquer penalidade na sua conta. Porem, a verificacao de identidade exige a selfie. Sem ela, sua conta permanece nao verificada, o que pode limitar funcionalidades especificas (como anunciar itens de valor mais alto ou alugar como locatario verificado). Voce continua podendo usar a ShareO nos limites de uma conta nao verificada.

**11. Quem e o Controlador.**
**ShareO Marketplace de Aluguel Ltda.**, na qualidade de Controladora dos seus dados pessoais para esta finalidade. Encarregada de Dados (DPO): canal **privacidade@shareo.com.br**.

---

### Checkbox de aceite (texto exato)

> [ ] Eu li e **consinto especificamente** com o tratamento da minha selfie como dado pessoal sensivel de natureza biometrica, exclusivamente para a finalidade de verificacao da minha identidade na ShareO, conforme o texto acima e nos termos do art. 11, II, "a" da LGPD. Compreendo que posso revogar este consentimento a qualquer momento.

### Botoes do modal

- **Botao primario (so habilita apos marcar o checkbox):** "Concordo e quero enviar minha selfie"
- **Botao secundario:** "Agora nao"

### Observacoes para a UI (instrucoes ao implementador)

- Este checkbox e **separado** do checkbox dos Termos de Uso/Politica de Privacidade. Em hipotese alguma o aceite dos Termos pode marcar este consentimento automaticamente.
- Por default o checkbox vem **desmarcado**.
- O texto deve ser exibido **integralmente**, sem "leia mais" oculto, sem scroll forcado e sem omissao de paragrafos.
- O botao primario deve permanecer **desabilitado** ate o checkbox ser marcado.
- "Agora nao" fecha o modal e **nao** envia nada ao servidor.
- Em telas pequenas (mobile, 375px), o modal e tela cheia com scroll do corpo — botoes sempre visiveis no rodape (sticky).
- A versao do texto (`v1.0`, etc.) deve ser exibida de forma discreta no rodape do modal ("Versao do consentimento: v1.0").

---

*Texto preparado pela Analista de Seguranca — ShareO. Revisao obrigatoria do DPO/advogada antes de publicacao. Nao usar em producao antes do sign-off do D4.*
