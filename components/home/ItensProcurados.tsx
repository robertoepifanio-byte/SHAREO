import Link from "next/link"
import { ProcuradoIcon, type ProcuradoIconName } from "@/components/home/icons/ProcuradoIcon"

const ITEMS: { name: string; icon: ProcuradoIconName; demand: "alta" | "media" }[] = [
  { name: "Furadeiras",                 icon: "furadeira",          demand: "alta"  },
  { name: "Escadas",                    icon: "escada",             demand: "alta"  },
  { name: "Lavadoras de Pressão",       icon: "lavadora",           demand: "media" },
  { name: "Máquinas de Limpeza",        icon: "aspirador",          demand: "alta"  },
  { name: "Projetores",                 icon: "projetor",           demand: "alta"  },
  { name: "Caixas de Som",              icon: "som",                demand: "alta"  },
  { name: "Mesas e Cadeiras p/ Festas", icon: "mesa-cadeiras",      demand: "media" },
  { name: "Barracas de Camping",        icon: "barraca",            demand: "media" },
  { name: "Bicicletas",                 icon: "bicicleta",          demand: "alta"  },
  { name: "Ferramentas Elétricas",      icon: "ferramenta-eletrica", demand: "alta" },
]

export function ItensProcurados() {
  return (
    <section
      id="itens-procurados"
      className="bg-surface-muted px-4 py-8 xl:px-6 xl:py-12"
      aria-labelledby="procurados-title"
    >
      <div className="container">
        <div className="mb-2 flex items-center justify-between">
          <h2
            id="procurados-title"
            className="font-display text-[22px] font-bold text-primary xl:text-2xl"
          >
            Itens mais procurados agora
          </h2>
          <Link
            href="/itens"
            className="text-sm font-semibold text-brand hover:underline"
          >
            Ver todos →
          </Link>
        </div>
        <p className="mb-6 text-sm text-muted-foreground">
          Itens com alta demanda — ótimas oportunidades para anunciar.
        </p>

        <div
          role="list"
          aria-label="Itens mais procurados na plataforma"
          className="grid grid-cols-2 gap-2.5 xl:grid-cols-5 xl:gap-3"
        >
          {ITEMS.map((item) => (
            <Link
              key={item.name}
              href={`/itens?search=${encodeURIComponent(item.name)}`}
              role="listitem"
              aria-label={`Buscar ${item.name}`}
              className="flex min-h-tap flex-col items-center gap-2 rounded-xl border-[1.5px] border-border bg-white px-3 py-4 text-center font-sans transition-all hover:-translate-y-0.5 hover:border-brand hover:bg-[#F0FBF5] hover:shadow-[0_4px_12px_rgba(0,123,60,0.12)]"
            >
              <span className="flex h-10 w-10 items-center justify-center">
                <ProcuradoIcon name={item.icon} size={40} className="text-brand" />
              </span>
              <span className="text-[13px] font-semibold leading-snug text-foreground">
                {item.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                  item.demand === "alta"
                    ? "bg-brand-light text-brand-link"
                    : "bg-[#FEF3C7] text-[#92400E]"
                }`}
              >
                {item.demand === "alta" ? "Alta demanda" : "Demanda moderada"}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}
