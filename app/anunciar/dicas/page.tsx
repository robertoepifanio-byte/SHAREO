import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title:       "Dicas para Anfitriões — ShareO",
  description: "Aprenda como alugar mais e melhor no ShareO com dicas práticas de quem já faz renda extra.",
}

const DICAS = [
  {
    numero: "01",
    icon:   "📸",
    titulo: "Fotos fazem toda a diferença",
    corpo: [
      "Use luz natural — abra as janelas e fotografe durante o dia.",
      "Mostre o item limpo, organizado e de vários ângulos.",
      "Inclua foto com escala (segure o item ou coloque ao lado de algo conhecido).",
      "Mínimo 3 fotos; itens com 5+ fotos têm 40% mais reservas.",
    ],
    destaque: "Itens com boas fotos recebem 3× mais visualizações.",
  },
  {
    numero: "02",
    icon:   "✍️",
    titulo: "Descrição clara e honesta",
    corpo: [
      "Diga o que o item faz, para quem serve e qual o estado de conservação.",
      "Mencione o que está incluso (acessórios, manual, case).",
      "Seja transparente sobre desgastes — isso evita disputas.",
      "Use palavras que o locatário buscaria: marca, modelo, capacidade.",
    ],
    destaque: "Descrições detalhadas reduzem perguntas e aceleram a reserva.",
  },
  {
    numero: "03",
    icon:   "💰",
    titulo: "Precifique de forma competitiva",
    corpo: [
      "Busque itens similares na sua cidade e veja o preço praticado.",
      "Comece um pouco abaixo para acumular avaliações rapidamente.",
      "Após as primeiras reservas e boas avaliações, ajuste o preço para cima.",
      "Ofereça desconto para semana e mês — aumenta o ticket médio.",
    ],
    destaque: "A regra geral: diária ≈ 5% do valor do produto.",
  },
  {
    numero: "04",
    icon:   "⚡",
    titulo: "Responda rápido",
    corpo: [
      "Locatários escolhem quem responde primeiro — mire em menos de 2h.",
      "Ative notificações do ShareO no celular.",
      "Se não puder alugar em certa data, marque como indisponível antes.",
      "Uma resposta rápida aumenta sua posição nos resultados de busca.",
    ],
    destaque: "Anfitriões que respondem em até 1h têm 2× mais reservas confirmadas.",
  },
  {
    numero: "05",
    icon:   "🤝",
    titulo: "Cuide da experiência do locatário",
    corpo: [
      "Entregue o item limpo e funcionando — sempre.",
      "Explique o uso se necessário (vídeo rápido no WhatsApp resolve muito).",
      "Seja pontual na entrega e retirada.",
      "Após a devolução, avalie o locatário — isso incentiva avaliações de volta.",
    ],
    destaque: "Anfitriões com nota ≥ 4,5 aparecem primeiro na busca.",
  },
  {
    numero: "06",
    icon:   "🔒",
    titulo: "Proteja seu item",
    corpo: [
      "Fotografe o item antes de cada entrega e envie ao locatário.",
      "Combine e documente o estado do item na retirada (chat do ShareO).",
      "Para itens de alto valor, solicite documento e selfie antes de confirmar.",
      "Em caso de dano, abra uma disputa dentro do prazo — a plataforma medeia.",
    ],
    destaque: "Tudo combinado dentro do ShareO tem registro e proteção.",
  },
]

export default function DicasPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8 max-w-3xl">

        {/* Hero */}
        <div className="mb-10 text-center">
          <span className="inline-block mb-3 rounded-full bg-brand/10 px-4 py-1.5 text-xs font-semibold text-brand uppercase tracking-wide">
            Guia do Anfitrião
          </span>
          <h1 className="font-display text-3xl font-bold text-foreground mb-3">
            Dicas para alugar mais e melhor
          </h1>
          <p className="text-muted-foreground max-w-md mx-auto">
            Pequenas ações que fazem grande diferença nos seus ganhos mensais.
          </p>
        </div>

        {/* Cards de dicas */}
        <div className="space-y-6">
          {DICAS.map((dica) => (
            <article
              key={dica.numero}
              className="rounded-2xl border border-border bg-white overflow-hidden"
            >
              {/* Cabeçalho */}
              <div className="flex items-center gap-4 px-6 py-4 border-b border-border bg-muted/30">
                <span className="text-2xl" aria-hidden="true">{dica.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                    Dica {dica.numero}
                  </p>
                  <h2 className="text-base font-semibold text-foreground leading-tight">
                    {dica.titulo}
                  </h2>
                </div>
              </div>

              {/* Corpo */}
              <div className="px-6 py-4">
                <ul className="space-y-2 mb-4">
                  {dica.corpo.map((item, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-foreground">
                      <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-brand flex-shrink-0" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>

                {/* Destaque */}
                <div className="rounded-lg bg-brand/5 border border-brand/20 px-4 py-2.5">
                  <p className="text-xs font-semibold text-brand">
                    💡 {dica.destaque}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* CTAs finais */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/itens/novo"
            className="flex h-12 items-center justify-center rounded-xl bg-brand text-white text-sm font-semibold hover:bg-brand/90 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            📦 Cadastrar meu item
          </Link>
          <Link
            href="/anunciar/estimativa"
            className="flex h-12 items-center justify-center rounded-xl border-2 border-brand text-brand text-sm font-semibold hover:bg-brand/5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2"
          >
            💰 Simular meus ganhos
          </Link>
        </div>

      </main>
    </div>
  )
}
