/**
 * Forma canônica da vitrine de uma categoria. Sitemap e `<link rel="canonical">` da
 * página usam esta mesma função: se divergirem, o buscador rastreia uma URL para ser
 * mandado a outra.
 */
export const canonicalCategoryPath = (id: string) => `/itens?categoryId=${id}`
