# Como etiquetar os links dos anúncios

**Para quem monta as campanhas.** Leva 2 minutos por anúncio e é o que permite saber qual canal traz cadastro.

---

## Por que isso importa

Quando alguém clica no anúncio e se cadastra, o ShareO precisa saber **de onde essa pessoa veio**. Ele descobre isso por uma etiqueta colada no fim do link.

**Sem a etiqueta certa, o cadastro é creditado ao canal errado** — ou ao próprio site, como se a pessoa tivesse chegado sozinha. Aí o relatório diz que o anúncio não trouxe ninguém, e você desliga o canal que estava funcionando.

Não usamos Google Analytics nem nenhuma ferramenta parecida. Essa etiqueta é a **única** forma de o ShareO saber a origem.

---

## A regra

No link do anúncio, acrescente `?utm_source=` seguido do nome do canal.

```
https://www.shareo.com.br/?utm_source=youtube
```

É isso. O resto desta página são detalhes.

---

## Os nomes exatos de cada canal

Use **exatamente** um destes. Escrever diferente joga o cadastro no balde errado.

| Canal | O que escrever |
|---|---|
| YouTube | `utm_source=youtube` |
| LinkedIn | `utm_source=linkedin` |
| Instagram / Facebook | `utm_source=instagram` |

Maiúscula ou minúscula não importa: `YouTube` e `youtube` funcionam igual.

### ⚠️ A armadilha do YouTube

Anúncio de YouTube é comprado **dentro do Google Ads**. Se a ferramenta preencher sozinha a etiqueta, ela costuma escrever `utm_source=google` — e aí o cadastro entra como **Google Ads**, não como YouTube.

**Troque para `utm_source=youtube` na mão.** É o erro mais fácil de cometer e o mais difícil de perceber depois.

---

## O que acontece se errar

| Você escreve | Onde o cadastro cai |
|---|---|
| `utm_source=youtube` | ✅ YouTube |
| `utm_source=google` num anúncio de YouTube | ❌ Google Ads |
| `utm_source=youtube-setembro` | ✅ YouTube (basta **conter** a palavra) |
| `utm_source=yt_ads` | ❌ Cai no balde errado — só `yt` **sozinho** é aceito |
| Nada, link limpo | ❌ Entra como se a pessoa tivesse chegado direto ao site |

> **Na dúvida, escreva o nome do canal por extenso:** `youtube`, `linkedin`, `instagram`. Contendo a
> palavra inteira sempre funciona, com qualquer coisa antes ou depois. Abreviação só funciona se for
> a palavra sozinha — por isso `yt` dá certo e `yt_ads` não.

---

## Dois extras que valem a pena

Opcionais, mas cada um responde uma pergunta a mais.

**`utm_campaign`** — o nome da campanha. Aparece no painel, com a contagem de cadastros de cada uma.

```
?utm_source=instagram&utm_campaign=lancamento-setembro
```

**`utm_content`** — qual peça/criativo. Não aparece no painel, mas sai na planilha de exportação, na coluna "criativo". Serve para comparar duas artes do mesmo anúncio.

```
?utm_source=instagram&utm_campaign=lancamento-setembro&utm_content=video-a
```

Regra de escrita: **sem espaços e sem acentos**. Use hífen no lugar do espaço.

---

## Links prontos para copiar

```
https://www.shareo.com.br/?utm_source=youtube&utm_campaign=lancamento-setembro
https://www.shareo.com.br/?utm_source=linkedin&utm_campaign=lancamento-setembro
https://www.shareo.com.br/?utm_source=instagram&utm_campaign=lancamento-setembro
```

O primeiro parâmetro leva `?`. Os seguintes levam `&`.

---

## Como conferir se funcionou

**Teste antes de publicar:** abra o link etiquetado no celular, preencha o formulário com um e-mail seu, e confira em `/admin/fundadores` se o cadastro apareceu no canal certo.

**Depois de publicar:** o painel mostra a contagem por canal e por campanha. Se um canal aparece com zero cadastros mas você sabe que teve cliques, o primeiro suspeito é a etiqueta — não o anúncio.

---

## O que a etiqueta não faz

Ela diz **de onde a pessoa veio**. Não diz quantas pessoas viram o anúncio, nem quantas clicaram — isso o painel do próprio Instagram, YouTube ou LinkedIn já mostra.

Juntando os dois você tem a conta completa: o painel do canal dá os **cliques**, o ShareO dá os **cadastros**.

---

## Detalhe técnico, para quem for mexer no código

O canal é decidido **só** pelo `utm_source` (`lib/founders-attribution.ts`, função `deriveSource`). O `utm_medium` é guardado, mas não influencia a classificação — por isso a armadilha do YouTube existe.

A origem é guardada na primeira página que a pessoa abre e sobrevive se ela navegar antes de preencher o formulário.

Canais reconhecidos hoje: YouTube, LinkedIn, Instagram/Facebook/Meta, Google Ads, indicação e orgânico. Acrescentar um canal novo exige mexer no enum `SignupSource` e nos rótulos do painel — há um teste que reprova se esquecerem o rótulo.
