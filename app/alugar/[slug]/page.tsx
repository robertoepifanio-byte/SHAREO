import { cache } from "react"
import type { Metadata } from "next"
import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { canonicalCategoryPath } from "@/lib/category-url"
import { categorySeoText } from "@/lib/category-seo"
import { Explorar, type SearchParams } from "@/app/itens/_Explorar"

type Props = {
  params:       Promise<{ slug: string }>
  searchParams: Promise<SearchParams>
}

// `cache`: generateMetadata e a página pedem a mesma categoria na mesma requisição.
const findCategory = cache((slug: string) =>
  prisma.category.findFirst({
    where:  { slug, parentId: null },
    select: { id: true, slug: true, name: true },
  }),
)

export async function generateMetadata({ params }: Pick<Props, "params">): Promise<Metadata> {
  const { slug } = await params
  const categoria = await findCategory(slug).catch(() => null)
  if (!categoria) return { title: "Categoria não encontrada" }

  return {
    title:       `Alugar ${categoria.name} perto de você`,
    description: categorySeoText(categoria).description,
    // Fixo, também com ?sort= ou ?page=: toda variação de filtro conta para esta URL.
    alternates:  { canonical: canonicalCategoryPath(categoria) },
  }
}

export default async function AlugarCategoriaPage({ params, searchParams }: Props) {
  const { slug } = await params
  // Sem `.catch`: erro de banco deve virar 5xx, não 404 (o buscador descartaria a página por falha passageira).
  const categoria = await findCategory(slug)
  if (!categoria) notFound()

  const sp = await searchParams
  return <Explorar searchParams={Promise.resolve({ ...sp, categoryId: categoria.id })} viaSlug intro={categorySeoText(categoria).intro} />
}
