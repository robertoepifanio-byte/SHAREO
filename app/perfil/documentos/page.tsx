import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { AppHeader } from "@/components/layout/AppHeader"
import { IdVerification } from "../_IdVerification"
import { decryptDocument, maskCPF, maskCNPJ } from "@/lib/crypto"

export const metadata: Metadata = { title: "Documentos e Verificação" }

export default async function DocumentosPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/documentos")

  const user = await prisma.user.findUnique({
    where:  { id: session.user.id },
    select: {
      userType:             true,
      cpfEncrypted:         true,
      cnpjEncrypted:        true,
      idVerificationStatus: true,
      idRejectionReason:    true,
    },
  })

  if (!user) redirect("/login")

  // Decriptografar e mascarar — nunca expor o valor completo ao cliente
  let maskedDoc: string | null = null
  let docLabel = "CPF"
  try {
    if (user.userType === "PJ" && user.cnpjEncrypted) {
      maskedDoc = maskCNPJ(decryptDocument(user.cnpjEncrypted))
      docLabel  = "CNPJ"
    } else if (user.cpfEncrypted) {
      maskedDoc = maskCPF(decryptDocument(user.cpfEncrypted))
      docLabel  = "CPF"
    }
  } catch {
    // Erro de decriptografia — não expor nada
  }

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
          <h1 className="text-xl font-bold text-primary">Documentos e Verificação</h1>

          {/* Documento cadastrado */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-semibold text-foreground">{docLabel} cadastrado</h2>
            {maskedDoc ? (
              <div className="flex items-center justify-between rounded-lg bg-background px-4 py-3">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{docLabel}</p>
                  <p className="mt-0.5 font-mono text-base font-semibold text-foreground">{maskedDoc}</p>
                </div>
                <span className="rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-semibold text-success">
                  🔒 Protegido
                </span>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Nenhum {docLabel} cadastrado. Acesse seu perfil para adicionar.
              </p>
            )}
            <p className="mt-3 text-xs text-muted-foreground">
              🔒 Seu {docLabel} é criptografado com AES-256-GCM e nunca é compartilhado com terceiros (LGPD art. 46).
            </p>
          </div>

          {/* Verificação de identidade */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-4 font-semibold text-foreground">Verificação de identidade</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              A verificação de identidade aumenta a confiança dos outros usuários e desbloqueia locações de maior valor.
            </p>
            <IdVerification
              status={user.idVerificationStatus}
              rejectionReason={user.idRejectionReason}
            />
          </div>
        </div>
      </main>
    </div>
  )
}
