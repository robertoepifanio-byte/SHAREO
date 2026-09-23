import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { TwoFactorSetup } from "./_TwoFactorSetup"

export const metadata: Metadata = { title: "Verificação em duas etapas" }

export default async function TwoFactorPage() {
  const session = await auth()
  if (!session?.user) redirect("/login?callbackUrl=/perfil/seguranca/2fa")

  // A sessão de um admin sem 2FA chega rebaixada (role USER): o papel verdadeiro está no banco.
  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { role: true, totpEnabledAt: true },
  })
  if (!user) redirect("/login")
  if (user.role !== "ADMIN") redirect("/perfil/seguranca")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/perfil/seguranca" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Login e Segurança
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg space-y-5">
          <h1 className="text-xl font-bold text-primary">Verificação em duas etapas</h1>

          {user.totpEnabledAt ? (
            <div className="rounded-xl border border-border bg-surface p-5 space-y-2">
              <p className="text-sm font-semibold text-success">Ativa</p>
              <p className="text-sm text-muted-foreground">
                Ativada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(user.totpEnabledAt)}.
                A cada login você informa a senha e o código do aplicativo autenticador.
              </p>
              <p className="text-xs text-muted-foreground">
                Perdeu o celular? Entre com um dos códigos de recuperação. Sem eles, outro superadmin
                reinicia o seu 2FA em Admin → Usuários → Administradores.
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-200" role="note">
                <strong>Obrigatório para administradores.</strong> Enquanto o 2FA não for ativado,
                o painel administrativo fica bloqueado para a sua conta.
              </div>
              <TwoFactorSetup />
            </>
          )}
        </div>
      </main>
    </div>
  )
}
