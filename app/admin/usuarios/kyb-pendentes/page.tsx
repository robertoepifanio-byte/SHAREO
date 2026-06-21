import type { Metadata } from "next"
import { after } from "next/server"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { prisma } from "@/lib/prisma"
import { decryptDocument, decryptPII, maskCNPJ } from "@/lib/crypto"
import { KybActions } from "./_KybActions"

export const metadata: Metadata = { title: "Admin — Revisão de PJ (KYB)" }

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  if (days < 7) return `há ${days} dias`
  return `há ${Math.floor(days / 7)} semana(s)`
}

function safe<T>(fn: () => T, fallback: T): T {
  try { return fn() } catch { return fallback }
}

export default async function KybPendentesPage() {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")
  if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) redirect("/admin")

  // Fila de revisão (ADR-024 D2): PJ com verificação pendente e sem override manual.
  const pending = await prisma.user.findMany({
    where: {
      userType:                  "PJ",
      cnpjSituacaoVerificada:    false,
      cnpjVerificacaoOverrideAt: null,
      deletedAt:                 null,
    },
    orderBy: { cnpjDeclaracaoAt: "asc" },
    select: {
      id: true, name: true, email: true,
      cnpjEncrypted: true,
      cnpjResponsavelLegalEncrypted: true,
      cnpjDeclaracaoAt: true,
      cnpjDeclaracaoIp: true,
    },
  })

  const rows = pending.map((u) => ({
    id:    u.id,
    name:  u.name,
    email: u.email,
    cnpjMasked:       u.cnpjEncrypted ? safe(() => maskCNPJ(decryptDocument(u.cnpjEncrypted!)), "—") : "—",
    responsavelLegal: u.cnpjResponsavelLegalEncrypted ? safe(() => decryptPII(u.cnpjResponsavelLegalEncrypted!), "—") : "—",
    declaracaoAt:     u.cnpjDeclaracaoAt,
    declaracaoIp:     u.cnpjDeclaracaoIp ?? "—",
  }))

  // SEC-ALTO-08: trilha LGPD — registra quem abriu a fila com dados descriptografados
  after(() =>
    prisma.adminLog.create({
      data: {
        adminId:    session.user.id,
        action:     "KYB_QUEUE_VIEWED",
        entityType: "User",
        entityId:   "kyb-queue",
        metadata:   { count: rows.length },
      },
    }).catch((e) => console.error("[adminLog KYB_QUEUE_VIEWED]", e instanceof Error ? e.message : e))
  )

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-primary">Revisão de PJ (KYB)</h1>
        <p className="mt-0.5 text-sm text-muted-foreground">
          {rows.length === 0
            ? "Nenhuma PJ aguardando revisão ✅"
            : `${rows.length} conta(s) PJ cadastrada(s) sem confirmação automática na Receita.`}
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-3xl">🏢</p>
          <p className="mt-3 text-sm font-medium text-foreground">Fila vazia</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Contas PJ entram aqui quando a Receita está indisponível no momento do cadastro (fail-open controlado).
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {rows.map((u) => (
            <div key={u.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{u.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                </div>
                {u.declaracaoAt && (
                  <span className="whitespace-nowrap text-[10px] text-muted-foreground">
                    declarou {relativeTime(new Date(u.declaracaoAt))}
                  </span>
                )}
              </div>

              <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-foreground">CNPJ</dt>
                  <dd className="font-mono text-foreground">{u.cnpjMasked}</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-foreground">Responsável legal</dt>
                  <dd className="text-foreground">{u.responsavelLegal}</dd>
                </div>
                <div className="flex justify-between sm:block">
                  <dt className="text-muted-foreground">IP da declaração</dt>
                  <dd className="font-mono text-foreground">{u.declaracaoIp}</dd>
                </div>
              </dl>

              <KybActions userId={u.id} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
