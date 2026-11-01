/**
 * Forma canônica da vitrine de uma categoria. Sitemap, `<link rel="canonical">` e os
 * links internos usam esta mesma função: se divergirem, o buscador rastreia uma URL para
 * ser mandado a outra.
 *
 * `/alugar/<slug>` carrega a palavra da busca ("alugar furadeira") na URL; a forma antiga
 * `/itens?categoryId=<id>` responde 308 para ela.
 *
 * 🪤 `slug` é obrigatório no tipo para que esquecer `slug: true` num `select` novo vire erro
 * de compilação, em vez de publicar uma URL sem slug em silêncio.
 */
export const canonicalCategoryPath = (category: { slug: string }) => `/alugar/${category.slug}`
