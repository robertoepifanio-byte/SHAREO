import type { Metadata } from "next"
import { Explorar, EXPLORAR_TITLE, type SearchParams } from "./_Explorar"

export const metadata: Metadata = {
  title:       EXPLORAR_TITLE,
  description: "Encontre itens para alugar perto de você no ShareO: ferramentas, eletrônicos, casa e jardim, festas e mais, de pessoas da sua região.",
}

export default function ExplorarPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  return <Explorar searchParams={searchParams} />
}
