import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Bem-vindo ao ShareO" }

/**
 * Onboarding do piloto — destino do 1º login após definir a senha (o convite-piloto
 * manda /definir-senha → /login?callbackUrl=/bem-vindo). Explica navegar (cadastro
 * simples) × anunciar/alugar (cadastro completo) e oferece o link de indicação.
 * Acessível a qualquer logado; não substitui nenhum gate.
 */
export default async function BemVindoPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/bem-vindo")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { name: true, profileCompletedAt: true },
  })

  const firstName = (user?.name ?? "").trim().split(" ")[0] || "por aqui"
  const isComplete = !!user?.profileCompletedAt

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container py-10">
        <div className="mx-auto max-w-2xl">
          <h1 className="text-2xl font-bold text-primary">
            Bem-vindo ao ShareO, {firstName}!
          </h1>
          <p className="mt-2 text-muted-foreground">
            Sua conta está pronta. Veja por onde começar — e como indicar amigos desde já.
          </p>

          {/* Dois caminhos: navegar × anunciar/alugar */}
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-border bg-surface p-5">
              <h2 className="font-semibold text-foreground">Explorar agora</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Já pode navegar e ver tudo o que há perto de você — sem mais nenhum passo.
              </p>
              <Link
                href="/itens"
                className="mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
              >
                Explorar itens
              </Link>
            </div>

            <div
              className={
                isComplete
                  ? "rounded-xl border border-border bg-surface p-5"
                  : "rounded-xl border-2 border-primary/40 bg-primary/5 p-5"
              }
            >
              <h2 className="font-semibold text-foreground">Anunciar ou alugar</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {isComplete
                  ? "Seu cadastro já está completo — pode anunciar e alugar quando quiser."
                  : "Para anunciar ou alugar, complete seu cadastro (CPF e endereço). Leva 1 minuto e já libera tudo."}
              </p>
              <Link
                href={isComplete ? "/itens/novo" : "/cadastro/completar?callbackUrl=/itens/novo"}
                className={
                  isComplete
                    ? "mt-4 inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                    : "mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
                }
              >
                {isComplete ? "Anunciar um item" : "Completar cadastro →"}
              </Link>
            </div>
          </div>

          {/* CTA principal: link de indicação */}
          <div className="mt-6 rounded-xl border border-brand/30 bg-brand/5 p-6">
            <h2 className="font-semibold text-primary">Convide amigos e seja embaixador</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Gere seu link de indicação e compartilhe com amigos. A cada locação de quem você
              indicar, você acumula uma parte da nossa taxa (Bronze 2% · Prata 3% · Ouro 5%).
              Os créditos ficam guardados e são liberados após a validação jurídica.
            </p>
            <Link
              href="/perfil/embaixador"
              className="mt-4 inline-flex h-11 items-center justify-center rounded-lg bg-brand px-5 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Gerar meu link de indicação →
            </Link>
          </div>

          <p className="mt-6 text-center text-sm">
            <Link href="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
              Ir para o meu painel
            </Link>
          </p>
        </div>
      </main>
    </div>
  )
}
