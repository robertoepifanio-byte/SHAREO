import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Políticas do ShareO",
  description: "Políticas de uso, privacidade e responsabilidade do ShareO.",
}

const SECTIONS = [
  {
    icon: "📜",
    title: "Política de Uso",
    items: [
      "Todos os usuários devem respeitar os termos de serviço e garantir que os itens cadastrados estejam em boas condições.",
      "O ShareO não permite aluguel de produtos ilegais, perigosos ou que infrinjam direitos de terceiros.",
    ],
  },
  {
    icon: "🔒",
    title: "Privacidade",
    items: [
      "Dados pessoais são tratados com segurança e transparência.",
      "Informações de pagamento e identidade são protegidas por sistemas de verificação e criptografia.",
    ],
  },
  {
    icon: "⚖️",
    title: "Responsabilidade",
    items: [
      "Proprietários são responsáveis pela veracidade das informações dos itens.",
      "Locatários devem devolver os itens no prazo e em condições adequadas.",
      "O ShareO atua como intermediário seguro, mas não se responsabiliza por mau uso dos itens.",
    ],
  },
]

export default function PoliticasPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-xs text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Políticas</li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold text-primary">Políticas do ShareO</h1>
            <p className="mt-3 text-muted-foreground">
              Regras e diretrizes que garantem um ambiente seguro, transparente e confiável para todos.
            </p>
          </div>

          <div className="space-y-8">
            {SECTIONS.map((s) => (
              <section
                key={s.title}
                className="rounded-xl border border-border bg-surface p-6"
              >
                <div className="mb-4 flex items-center gap-2">
                  <span className="text-xl" aria-hidden="true">{s.icon}</span>
                  <h2 className="font-display text-xl font-bold text-primary">{s.title}</h2>
                </div>
                <ul className="space-y-3">
                  {s.items.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-muted-foreground leading-relaxed">
                      <span className="mt-1.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-brand" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>

          <div className="mt-10 rounded-xl border border-brand/20 bg-brand/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Dúvidas sobre as políticas?{" "}
              <Link href="/suporte" className="font-semibold text-brand hover:underline">
                Acesse o suporte
              </Link>{" "}
              ou{" "}
              <Link href="/ajuda" className="font-semibold text-brand hover:underline">
                consulte nossa central de ajuda
              </Link>
              .
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}
