const PILLARS = [
  {
    title: "Pagamento seguro",
    desc: "Valor liberado ao proprietário somente após confirmação da retirada pelo locatário.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#007B3C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <rect x="3" y="11" width="18" height="11" rx="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </svg>
    ),
  },
  {
    title: "Usuários verificados",
    desc: "Identidade validada com CPF/CNPJ. Você sabe com quem está negociando.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#007B3C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <polyline points="20 6 9 17 4 12" />
      </svg>
    ),
  },
  {
    title: "Suporte 7 dias",
    desc: "Nossa equipe está disponível todos os dias para resolver qualquer problema.",
    icon: (
      <svg
        width="28"
        height="28"
        viewBox="0 0 24 24"
        fill="none"
        stroke="#007B3C"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
      </svg>
    ),
  },
]

export function Seguranca() {
  return (
    <section
      id="seguranca"
      className="bg-white px-6 py-8 xl:py-12"
      aria-labelledby="seguranca-title"
    >
      <div className="mx-auto max-w-[900px]">
        <h2
          id="seguranca-title"
          className="mb-2 text-center font-display text-[22px] font-bold text-primary xl:text-2xl"
        >
          Alugue e anuncie com segurança
        </h2>
        <p className="mb-8 text-center text-sm text-muted-foreground">
          Cada transação é protegida pela plataforma do início ao fim.
        </p>

        <div
          role="list"
          aria-label="Pilares de segurança da plataforma"
          className="grid grid-cols-1 gap-4 xl:grid-cols-3 xl:gap-4"
        >
          {PILLARS.map((p) => (
            <div
              key={p.title}
              role="listitem"
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-muted p-6 text-center"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light"
                aria-hidden="true"
              >
                {p.icon}
              </div>
              <div className="font-display text-[15px] font-bold text-primary">{p.title}</div>
              <div className="text-[13px] leading-relaxed text-muted-foreground">{p.desc}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
