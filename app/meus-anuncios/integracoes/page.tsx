import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { PjGate } from "@/components/premium/PjGate"
import { WebhooksPanel } from "./_WebhooksPanel"

export const metadata: Metadata = { title: "Integrações PJ" }

export default async function IntegracoesPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/meus-anuncios/integracoes")

  const isPj = session.user.userType === "PJ"

  // Tabs compartilhadas
  const tabs = (
    <div className="mb-6 flex gap-1 rounded-lg border border-border bg-surface p-1 w-fit overflow-x-auto" role="tablist" aria-label="Seções">
      {[
        { href: "/meus-anuncios",             label: "Anúncios" },
        { href: "/meus-anuncios/desempenho",  label: "Desempenho" },
        { href: "/meus-anuncios/importar",    label: "Importar" },
        { href: "/meus-anuncios/integracoes", label: "Integrações", active: true },
      ].map((t) => (
        <Link
          key={t.href}
          href={t.href}
          role="tab"
          aria-selected={!!t.active}
          className={
            t.active
              ? "inline-flex h-9 items-center rounded-md bg-brand px-4 text-sm font-semibold text-white shadow-sm outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 whitespace-nowrap"
              : "inline-flex h-9 items-center rounded-md px-4 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2 whitespace-nowrap"
          }
        >
          {t.label}
        </Link>
      ))}
    </div>
  )

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-primary">Meus Anúncios</h1>
            {isPj && (
              <p className="mt-1 text-sm text-muted-foreground">
                Conecte o ShareO com seus sistemas externos via webhooks
              </p>
            )}
          </div>
          <Link
            href="/itens/novo"
            className="inline-flex h-11 items-center gap-1.5 rounded-md bg-brand px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity self-start sm:self-auto"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/>
              <line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Novo anúncio
          </Link>
        </div>

        {tabs}

        {!isPj ? (
          <PjGate feature="generic" />
        ) : (
          <IntegracoesContent userId={session.user.id} />
        )}
      </main>
    </div>
  )
}

async function IntegracoesContent({ userId }: { userId: string }) {
  const webhooks = await prisma.outboundWebhook.findMany({
    where:   { userId },
    orderBy: { createdAt: "desc" },
    select: {
      id:             true,
      url:            true,
      events:         true,
      isActive:       true,
      failureCount:   true,
      lastFiredAt:    true,
      lastStatusCode: true,
      createdAt:      true,
    },
  })

  // Serializar datas para o client component
  const serialized = webhooks.map((wh) => ({
    ...wh,
    lastFiredAt: wh.lastFiredAt?.toISOString() ?? null,
    createdAt:   wh.createdAt.toISOString(),
  }))

  return (
    <div className="mx-auto max-w-3xl">
      <WebhooksPanel initialWebhooks={serialized} />
    </div>
  )
}
