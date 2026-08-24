# Instalar o app ShareO no Android (APK de teste)

Guia para o testador instalar a versão mais recente do app **direto pelo celular**, sem cabo e sem ferramentas de desenvolvedor.

> **O que é este APK:** uma versão de teste que conversa com o ambiente de **staging** (`staging.shareo.com.br`), não com o site público. Dados criados aqui são de teste.

> **Se você gera os builds:** este guia cobre o APK publicado pelo GitHub Actions (`apk-build.yml`), que é o canal atual para testadores. O caminho pelo EAS está em [`docs/guia-testar-app-android.md`](../guia-testar-app-android.md) — **não misture os dois no mesmo aparelho**: eles assinam com chaves diferentes, e trocar de canal cria o conflito descrito na seção 3.

---

## 1. Baixar

Abra este endereço **no navegador do celular**:

<https://github.com/robertoepifanio-byte/SHAREO/releases/download/apk-preview/shareo-preview.apk>

O download começa sozinho (~50 MB). O Chrome costuma avisar que "este tipo de arquivo pode danificar seu dispositivo" — é o aviso padrão para qualquer APK fora da Play Store. Escolha **Fazer o download assim mesmo**.

O link **sempre aponta para a versão mais recente** — cada build novo substitui o anterior no mesmo endereço. Para saber de quando é a que você baixou, abra a [página do release](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/apk-preview): a data aparece ao lado do arquivo.

## 2. Instalar

Toque no arquivo baixado (na notificação, ou em **Downloads**).

Na primeira vez, o Android pede permissão: **"Instalar apps desconhecidos"** → ative para o navegador que você usou → volte e toque no arquivo de novo.

Se aparecer **Play Protect** dizendo que não reconhece o desenvolvedor, escolha **Instalar assim mesmo**. É esperado: o app não vem da Play Store.

---

## 3. Se aparecer "Conflito com pacote já existente"

Essa mensagem quer dizer que **já existe um ShareO instalado, assinado com outra chave**. O Android não troca a chave de um app instalado — é preciso remover o antigo primeiro.

**Isso apaga os dados locais do app: você vai precisar fazer login de novo.** Suas reservas, itens e mensagens estão no servidor e voltam depois do login.

1. Desinstale o ShareO normalmente (segure o ícone → **Desinstalar**).
2. Instale o APK de novo.

### Se o conflito continuar depois de desinstalar

Aí a causa é uma **segunda cópia num perfil separado** do aparelho — *Vault*, *Espaço seguro*, *Pasta segura*, *Espaço duplo*, dependendo da marca. O Android valida a assinatura **no aparelho inteiro**, então a cópia escondida bloqueia a instalação mesmo depois de você remover a visível.

É o motivo mais comum quando a desinstalação "não resolve", e a cópia é invisível na lista normal de apps.

O que fazer: entre nesse perfil/pasta segura, procure o ShareO **lá dentro**, desinstale também, e só então instale o APK.

Se não achar, avise — pelo cabo dá para listar os perfis e remover em segundos.

---

## 4. Confirmar que deu certo

Abra o app. Você deve ver a tela **"Entrar na sua conta"** com o logo e o slogan "USE MAIS. POSSUA MENOS.". Faça login com sua conta de teste de sempre.

---

## O que dá (e o que não dá) para testar nesta versão

**Dá:** explorar e anunciar itens, solicitar reserva, o fluxo de retirada e devolução com fotos, extensão de prazo pelo lado de quem recebe o pedido, chat, avaliações e a Central de Ajuda.

**Não dá: pagar pelo app.** O checkout ainda não foi portado para o Android — a tela de reserva mostra *"Pagamento disponível no site"*. Para pagar, use o site no navegador.

**O mapa nativo não vem neste build.** "Ver no mapa" abre o mapa pelo navegador. É intencional, não é defeito — não precisa reportar.

---

## Ao reportar um problema

Diga **a data do build que você instalou** junto com o relato — é a data que aparece na [página do release](https://github.com/robertoepifanio-byte/SHAREO/releases/tag/apk-preview), ao lado do arquivo. Sem isso não dá para saber se o que você viu já foi corrigido: um relato contra um APK antigo manda a gente caçar bug que não existe mais, e isso já custou tempo antes.
