"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { lerOrigemDoAnuncio } from "@/lib/origem-anuncio"

// Volta para a página de onde o anúncio foi aberto; sem origem guardada (link
// externo, acesso direto, outra aba) cai em /itens.
export function BackToResultsLink() {
  const router = useRouter()

  function handleClick(e: React.MouseEvent<HTMLAnchorElement>) {
    const origem = lerOrigemDoAnuncio()
    if (origem) {
      e.preventDefault()
      router.push(origem)
    }
  }

  return (
    <Link
      href="/itens"
      onClick={handleClick}
      className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      ← Voltar para resultados
    </Link>
  )
}
