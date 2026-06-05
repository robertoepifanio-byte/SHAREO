import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { DeleteAccountButton } from "../_DeleteAccountButton"
import { ChangePasswordForm } from "./_ChangePasswordForm"

export const metadata: Metadata = { title: "Login e Segurança" }

function maskEmail(email: string) {
  const [local, domain] = email.split("@")
  if (!local || !domain) return email
  const visible = local.slice(0, 2)
  const masked  = "*".repeat(Math.max(local.length - 2, 3))
  return `${visible}${masked}@${domain}`
}

export default async function SegurancaPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/seguranca")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: { email: true, createdAt: true, role: true },
  })

  if (!user) redirect("/login")

  const isAdmin = user.role === "ADMIN"

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/perfil" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg space-y-5">
          <h1 className="text-xl font-bold text-primary">Login e Segurança</h1>

          {/* E-mail */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-semibold text-foreground">E-mail</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground">{maskEmail(user.email)}</p>
                <p className="text-xs text-muted-foreground">Conta criada em {new Intl.DateTimeFormat("pt-BR", { dateStyle: "long" }).format(user.createdAt)}</p>
              </div>
              <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">Verificado</span>
            </div>
          </div>

          {/* Senha */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-1 font-semibold text-foreground">Senha</h2>
            {isAdmin ? (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Altere sua senha de acesso ao painel admin.
                </p>
                <ChangePasswordForm />
              </>
            ) : (
              <>
                <p className="mb-4 text-sm text-muted-foreground">
                  Para alterar sua senha, use o fluxo de recuperação de senha.
                </p>
                <Link
                  href="/forgot-password"
                  className="inline-flex h-11 items-center rounded-lg border border-border px-4 text-sm font-semibold text-foreground hover:bg-background transition-colors"
                >
                  Alterar senha
                </Link>
              </>
            )}
          </div>

          {/* Zona de perigo — oculta para admins */}
          {!isAdmin && (
            <div className="rounded-xl border border-destructive/30 bg-surface p-5">
              <h2 className="mb-1 font-semibold text-destructive">Zona de perigo</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Ações irreversíveis que afetam permanentemente sua conta.
              </p>
              <DeleteAccountButton />
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
