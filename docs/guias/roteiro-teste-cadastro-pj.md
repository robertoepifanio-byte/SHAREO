# Roteiro de Teste — Cadastro de Empresa (PJ)

**Produto:** ShareO · **Ambiente:** `https://staging.shareo.com.br` (ambiente de testes — **não é o site real**)
**Versão do roteiro:** 1.0 · **Data:** 20/06/2026
**Tempo estimado:** 15–20 minutos

---

## Antes de começar — leia isto

- Este é o ambiente de **teste**. Pode cadastrar dados fictícios à vontade; **nenhum dinheiro real** é movimentado.
- O cadastro de empresa (**PJ = Pessoa Jurídica**) pede o **CNPJ**, e o sistema **consulta a Receita Federal** para confirmar se a empresa existe e está ativa.
- **Você vai precisar de um CNPJ de empresa ATIVA e real** para o teste passar (pode ser o CNPJ da sua própria empresa, ou de qualquer empresa ativa que você conheça). CNPJ inventado **não** funciona — e isso faz parte do que estamos testando.
- Há **duas formas** de virar empresa no ShareO. Teste as duas:
  1. **Forma 1 — Virar PJ depois** (a partir de uma conta de pessoa física já existente).
  2. **Forma 2 — Já entrar como PJ** (escolher "Empresa" ao completar o cadastro).
- Anote tudo que parecer estranho: mensagens confusas, lentidão, botão que não responde, texto cortado no celular.

### Dados úteis

| Item | Valor |
|---|---|
| Site de teste | `https://staging.shareo.com.br` |
| Login de admin (só para a Parte 3) | `admin@shareo.com.br` |
| Senha do admin | `Admin@shareo2026` |
| CNPJ ativo para o teste | _(use um CNPJ real e ativo da sua escolha)_ |

### Identificação do tester

- **Nome:** ______________________________  **Data:** ____ / ____ / ______
- **Aparelho:** ( ) Celular Android ( ) iPhone ( ) Computador — Navegador: __________________

---

## Forma 1 — Transformar uma conta de Pessoa Física em Empresa (PJ)

> **Cenário:** você já tem uma conta comum (pessoa física) e quer passar a usá-la como empresa.

**Pré-requisito:** a conta precisa estar com o **cadastro completo** (CPF e endereço preenchidos). Se ainda não estiver, o próprio sistema vai pedir para completar antes — isso também é um item de teste (passo 2).

| # | Passo | Resultado esperado | Passou? |
|---|---|---|---|
| 1.1 | Entre no site e **faça login** com uma conta de pessoa física (ou crie uma nova em **Criar conta**). | Você acessa a conta normalmente. | ( ) Sim ( ) Não |
| 1.2 | Se for uma conta nova/incompleta, tente **Anunciar** um item. | O sistema pede para **completar o cadastro** (CPF + endereço) antes de continuar. | ( ) Sim ( ) Não |
| 1.3 | Vá em **Perfil**. Procure o bloco que convida a migrar para **conta PJ / empresa**. | Aparece um formulário com o campo **CNPJ da empresa**. | ( ) Sim ( ) Não |
| 1.4 | Preencha o **CNPJ** (de uma empresa ativa real). | O campo aceita e formata o CNPJ (00.000.000/0000-00). | ( ) Sim ( ) Não |
| 1.5 | Preencha o **Nome do responsável legal** (nome de quem responde pela empresa). | Campo aceita o nome. | ( ) Sim ( ) Não |
| 1.6 | Marque a caixa de **declaração** (texto sobre representar a empresa). | Só depois de marcar é que o botão de confirmar **fica habilitado**. | ( ) Sim ( ) Não |
| 1.7 | Clique em **Confirmar upgrade para PJ** e aguarde. | Aparece **"✓ Conta atualizada para Pessoa Jurídica"** e a **razão social** (nome oficial) da empresa confirmada na Receita. | ( ) Sim ( ) Não |
| 1.8 | Observe o **Perfil** depois de concluir. | A conta passa a indicar **Pessoa Jurídica**. | ( ) Sim ( ) Não |

### Testes de "tentar errado" (Forma 1) — todos devem ser **bloqueados**

| # | O que tentar | Resultado esperado | Passou? |
|---|---|---|---|
| 1.9 | Informar um **CNPJ inativo / baixado**. | Mensagem clara: **"Este CNPJ não está ativo na Receita Federal."** O upgrade **não** acontece. | ( ) Sim ( ) Não |
| 1.10 | Informar um **CNPJ que não existe** (ex.: dígitos aleatórios). | O sistema recusa (CNPJ inválido / não encontrado). | ( ) Sim ( ) Não |
| 1.11 | **Não marcar** a caixa de declaração. | O botão de confirmar permanece **desabilitado** (não dá para enviar). | ( ) Sim ( ) Não |
| 1.12 | Usar um CNPJ **já cadastrado** em outra conta. | Mensagem: **"CNPJ já cadastrado em outra conta."** | ( ) Sim ( ) Não |

**Observações da Forma 1:**

_________________________________________________________________________________

_________________________________________________________________________________

---

## Forma 2 — Já entrar como Empresa (PJ) no momento do cadastro

> **Cenário:** um novo usuário quer começar já como empresa, sem passar por conta de pessoa física.

| # | Passo | Resultado esperado | Passou? |
|---|---|---|---|
| 2.1 | Crie uma **conta nova** (nome, e-mail, senha, cidade, estado). Use um e-mail que você consiga acessar. | Conta criada, você consegue navegar. | ( ) Sim ( ) Não |
| 2.2 | Vá **Anunciar** ou **Alugar** (ou acesse **Completar cadastro**). | Abre a tela **"Completar cadastro"**. | ( ) Sim ( ) Não |
| 2.3 | No campo **Tipo de conta**, escolha **Empresa (PJ)**. | A tela passa a pedir os dados de empresa. | ( ) Sim ( ) Não |
| 2.4 | Preencha o **CNPJ** da empresa (ativa, real). | Campo aceita o CNPJ. | ( ) Sim ( ) Não |
| 2.5 | Preencha o **CPF do responsável legal** e o **Nome do responsável legal**. | Campos aceitam os dados. | ( ) Sim ( ) Não |
| 2.6 | Marque a **declaração** de que representa a empresa. | A declaração precisa estar marcada para concluir. | ( ) Sim ( ) Não |
| 2.7 | Preencha telefone/endereço (se pedido) e clique em **Concluir cadastro**. | Cadastro é concluído e a conta fica como **empresa (PJ)**. | ( ) Sim ( ) Não |

### Testes de "tentar errado" (Forma 2) — todos devem ser **bloqueados**

| # | O que tentar | Resultado esperado | Passou? |
|---|---|---|---|
| 2.8 | Deixar o **CPF do responsável** em branco. | O sistema avisa que o CPF do responsável é obrigatório. | ( ) Sim ( ) Não |
| 2.9 | Informar um **CPF do responsável inválido**. | Mensagem de CPF inválido. | ( ) Sim ( ) Não |
| 2.10 | **Não marcar** a declaração. | O sistema não deixa concluir e avisa que é preciso aceitar a declaração. | ( ) Sim ( ) Não |
| 2.11 | Informar **CNPJ inativo / inexistente**. | O sistema recusa com mensagem clara. | ( ) Sim ( ) Não |

**Observações da Forma 2:**

_________________________________________________________________________________

_________________________________________________________________________________

---

## Parte 3 (opcional — apenas para quem tiver acesso de Admin)

> **O que é:** se a Receita Federal estiver **fora do ar** no momento do cadastro, a empresa é cadastrada mesmo assim e fica **"aguardando revisão"**, para um administrador conferir depois. Essa situação é difícil de provocar de propósito (depende de a Receita estar indisponível), então só faça esta parte **se houver alguma empresa em revisão na lista**.

| # | Passo | Resultado esperado | Passou? |
|---|---|---|---|
| 3.1 | Saia da conta de teste e **entre como admin** (dados na tabela "Dados úteis"). | Você acessa o painel de administração. | ( ) Sim ( ) Não |
| 3.2 | No menu do admin, abra **"Revisão PJ"**. | Abre a lista de empresas aguardando revisão (pode estar vazia — tudo bem). | ( ) Sim ( ) Não |
| 3.3 | Se houver itens, confira os dados: CNPJ (parcialmente oculto), responsável legal e demais informações. | As informações aparecem de forma legível e organizada. | ( ) Sim ( ) Não |
| 3.4 | Em um item, use **"Verificar na Receita"** ou **"Aprovar manualmente"**. | A empresa sai da fila e a ação é confirmada. | ( ) Sim ( ) Não |

**Observações da Parte 3:**

_________________________________________________________________________________

---

## Resumo final do tester

- **Funcionou bem, no geral?**  ( ) Sim  ( ) Em parte  ( ) Não
- **A Forma 1 ou a Forma 2 foi mais confusa?**  ________________________________________
- **Algo te deixou em dúvida ou travou?** (descreva)

_________________________________________________________________________________

_________________________________________________________________________________

- **Nota de facilidade (0 = muito difícil, 10 = muito fácil):**  ______

> Obrigado! Devolva este roteiro preenchido (ou mande um print/foto das anotações) para a equipe ShareO.
