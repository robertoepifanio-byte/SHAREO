const CASES = [
  {
    initial: "C",
    name: "Carlos Souza",
    role: "Proprietário · Natal, RN",
    item: "Furadeira Bosch",
    itemEmoji: "🔧",
    renda: "R$ 135",
    highlight: false,
    quote:
      "Minha furadeira ficava meses parada. Agora ela 'trabalha' por mim todo fim de semana.",
  },
  {
    initial: "F",
    name: "Fernanda Lima",
    role: "Proprietária · Ponta Negra",
    item: "Caixa de Som JBL",
    itemEmoji: "🔊",
    renda: "R$ 420",
    highlight: true,
    quote:
      "Não acreditei quando fiz a primeira locação. Agora é minha renda extra mais consistente.",
  },
  {
    initial: "M",
    name: "Marcos Silva",
    role: "Proprietário · Capim Macio",
    item: "Projetor Epson Full HD",
    itemEmoji: "📽️",
    renda: "R$ 280",
    highlight: false,
    quote:
      "Tenho 8 itens anunciados e já ganhei mais de R$2.000 este mês. O ShareO virou renda real.",
  },
]

export function CasosRenda() {
  return (
    <section
      id="casos-renda"
      className="bg-slate-100 px-4 py-8 xl:px-6 xl:py-12"
      aria-labelledby="casos-renda-title"
    >
      <div className="container">
        <div className="mb-2 flex items-center justify-between">
          <h2
            id="casos-renda-title"
            className="font-display text-[22px] font-bold text-primary xl:text-2xl"
          >
            Quem já está ganhando
          </h2>
        </div>
        <p className="mb-6 text-sm text-slate-600">
          Proprietários reais que transformaram itens parados em renda extra.
        </p>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-4">
          {CASES.map((c) => (
            <article
              key={c.name}
              className="flex flex-col gap-3 rounded-xl bg-[#144D81] p-6 text-white"
              aria-label={`Caso: ${c.name}, ${c.item}, ${c.renda}/mês`}
            >
              {/* Header: avatar + nome/papel + badge renda */}
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand text-sm font-bold text-white"
                  aria-hidden="true"
                >
                  {c.initial}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">{c.name}</div>
                  <div className="text-xs text-white/80">{c.role}</div>
                </div>
                <div
                  className={`rounded-lg px-2.5 py-1.5 font-display text-lg font-extrabold text-white ${
                    c.highlight
                      ? "border border-[rgba(89,198,134,0.6)] bg-brand/50"
                      : "border border-[rgba(89,198,134,0.4)] bg-brand/30"
                  }`}
                  aria-label={`Renda mensal de ${c.renda}`}
                >
                  {c.renda}
                  <span className="text-xs font-medium text-white/90">/mês</span>
                </div>
              </div>

              {/* Item chip */}
              <div className="flex items-center gap-2 rounded-md bg-white/10 px-2.5 py-1.5 text-[13px] font-semibold text-white/85">
                <span aria-hidden="true">{c.itemEmoji}</span>
                <span>{c.item}</span>
              </div>

              {/* Citação */}
              <p className="flex-1 text-sm italic leading-relaxed text-white/90">
                &ldquo;{c.quote}&rdquo;
              </p>

              {/* Estrelas */}
              <div className="flex gap-0.5 text-accent" aria-label="Avaliação 5 estrelas">
                {"★★★★★"}
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
