import Link from "next/link"
import { getPlatformFeeRate, CHECKOUT_MAX_CENTS } from "@/lib/platform-config"

const LockIcon = (
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
)

const CheckIcon = (
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
)

const ShieldIcon = (
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
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
)

export async function Seguranca() {
  const feeRate = await getPlatformFeeRate()
  const feePct = (feeRate / 100).toLocaleString("pt-BR")
  const maxBRL = (CHECKOUT_MAX_CENTS / 100).toLocaleString("pt-BR")

  const pillars = [
    {
      title: "Pagamento protegido",
      icon: LockIcon,
      bullets: [
        "Você só paga depois que o proprietário confirma a reserva.",
        "O valor fica retido na plataforma até a devolução — repasse via PIX em até 3 dias.",
        `Taxa transparente de ${feePct}% e limite de R$ ${maxBRL} por locação no MVP.`,
      ],
    },
    {
      title: "Usuários verificados",
      icon: CheckIcon,
      bullets: [
        "Cadastro com CPF/CNPJ e verificação de e-mail e celular.",
        "Avaliações públicas após cada locação — você sabe com quem negocia.",
      ],
    },
    {
      title: "Proteção em caso de dano",
      icon: ShieldIcon,
      bullets: [
        "Fotos de check-in e check-out ficam vinculadas a cada reserva.",
        "Disputa com mediação da nossa equipe em até 5 dias úteis.",
        "O repasse ao proprietário fica suspenso até a resolução.",
      ],
    },
  ]

  return (
    <section
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
          {pillars.map((p) => (
            <div
              key={p.title}
              role="listitem"
              className="flex flex-col items-center gap-3 rounded-xl border border-border bg-surface-muted p-6"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-brand-light"
                aria-hidden="true"
              >
                {p.icon}
              </div>
              <div className="text-center font-display text-[15px] font-bold text-primary">
                {p.title}
              </div>
              <ul className="w-full space-y-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {p.bullets.map((b) => (
                  <li key={b} className="flex gap-1.5">
                    <span aria-hidden="true" className="mt-0.5 shrink-0 text-success">
                      ✓
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <p className="mt-6 text-center text-sm text-muted-foreground">
          Quer os detalhes técnicos?{" "}
          <Link
            href="/seguranca"
            className="font-semibold text-brand underline-offset-2 hover:underline"
          >
            Veja como protegemos seus dados
          </Link>
          .
        </p>
      </div>
    </section>
  )
}
