import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { EngagementToggle } from "./_EngagementToggle"

export const metadata: Metadata = { title: "Notificações por e-mail" }

/**
 * Preferências de e-mail.
 *
 * A tela separa explicitamente o que é opcional do que não é. Sem essa
 * distinção visível, quem quer só parar de receber propaganda fica com medo de
 * desligar a confirmação de reserva junto — e acaba marcando o e-mail como spam
 * em vez de usar o descadastro, que é o pior desfecho para a reputação do
 * domínio.
 */
export default async function NotificacoesPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/notificacoes")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { engagementEmailsOptOut: true },
  })

  if (!user) redirect("/login?callbackUrl=/perfil/notificacoes")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg space-y-5">
          <h1 className="text-xl font-bold text-primary">Notificações por e-mail</h1>
          <p className="text-sm text-muted-foreground">
            Escolha quais e-mails opcionais você quer receber. A mudança vale na hora.
          </p>

          <EngagementToggle initialEnabled={!user.engagementEmailsOptOut} />

          <div className="space-y-3 rounded-xl border border-border bg-surface p-5">
            <h2 className="font-semibold text-foreground">O que continua chegando</h2>
            <p className="text-sm text-muted-foreground">
              Estes e-mails fazem parte da locação e não podem ser desligados — sem eles você não
              saberia o que combinou:
            </p>
            {[
              { icon: "📅", title: "Reservas", desc: "Confirmação, aprovação, retirada e devolução." },
              { icon: "💳", title: "Pagamentos", desc: "Cobrança, repasse e comprovantes." },
              { icon: "💬", title: "Mensagens", desc: "Quando alguém fala com você sobre uma locação." },
              { icon: "🔒", title: "Conta e segurança", desc: "Verificação de e-mail e redefinição de senha." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-lg flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <div>
                  <p className="text-sm font-medium text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
