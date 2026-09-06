-- Os dois campos que transformam "esta disponivel" em evento.
--
-- favorites.priceReference
--   Preco da diaria (centavos) contra o qual a PROXIMA queda e medida. Nasce
--   como o preco no dia do favorito e avanca a cada aviso enviado — catraca, so
--   desce. Nao existe historico de preco de item no schema, entao sem esta
--   copia a queda e invisivel; e com referencia FIXA o gatilho dispararia em
--   alta (item cai de 6000 para 4000, sobe para 5000, e o segundo e-mail diz
--   "17% mais barato" depois de ter dito 33%).
--
-- items.availableSince
--   Momento da ultima transicao PARA AVAILABLE. Sem ele so da para saber que o
--   item ESTA disponivel — o que e sempre verdade para o item listado, e por
--   isso nao e noticia. O e-mail antigo dizia "esta disponivel!" justamente
--   sobre um fato que nunca mudava.
--
-- 🪤 As duas colunas nascem NULL e NAO ha backfill, de proposito:
--   • priceReference = NULL nos favoritos antigos -> o gatilho de queda nao
--     dispara para eles, em vez de comparar com um preco inventado.
--   • availableSince = NULL nos itens existentes -> o gatilho "voltou ao
--     catalogo" nao dispara. Um backfill com now() faria o catalogo INTEIRO
--     parecer que acabou de voltar, e todo mundo receberia esse e-mail de uma
--     vez — exatamente o tipo de disparo em massa que este trabalho existe para
--     impedir.

ALTER TABLE "favorites" ADD COLUMN "priceReference" INTEGER;
ALTER TABLE "items"     ADD COLUMN "availableSince"  TIMESTAMP(3);
