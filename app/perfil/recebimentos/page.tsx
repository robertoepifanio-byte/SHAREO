import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { PixAccountForm } from "./_PixAccountForm"
import { getPlatformFeeRate } from "@/lib/platform-config"

export const metadata: Metadata = { title: "Conta de Recebimento PIX" }

export default async function RecebimentosPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/recebimentos")

  const [account, feeRateBps] = await Promise.all([
    prisma.ownerPaymentAccount.findUnique({
    where:  { userId: session.user.id },
      select: { id: true, pixKeyType: true, pixKey: true, holderName: true, bankName: true, status: true },
    }),
    getPlatformFeeRate(),
  ])
  const feeLabel = `${feeRateBps / 100}%`

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link
            href="/perfil"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg space-y-6">

          <div>
            <h1 className="text-xl font-bold text-primary">Conta de Recebimento PIX</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Cadastre a chave PIX para receber os repasses das suas locações.
              O valor é liberado 3 dias após a devolução confirmada.
            </p>
          </div>

          <div className="rounded-xl border border-border bg-surface p-5">
            <PixAccountForm existing={account} />
          </div>

          {/* Como funciona */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Como funciona o repasse</h2>
            {[
              { icon: "✅", title: "Devolução confirmada", desc: "Locatário e você confirmam a devolução do item." },
              { icon: "⏳", title: "Prazo de 3 dias", desc: "Período de segurança antes de liberar o pagamento." },
              { icon: "💸", title: "Repasse via PIX", desc: `O valor líquido (após a taxa ShareO de ${feeLabel}) é enviado para a sua chave cadastrada.` },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-lg flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
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
