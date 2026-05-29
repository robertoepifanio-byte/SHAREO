import type { Metadata } from "next"
import Image from "next/image"
import { prisma } from "@/lib/prisma"
import { supabaseAdmin } from "@/lib/supabase/admin"
import { VerificationActions } from "./_Actions"

export const metadata: Metadata = { title: "Admin — Verificações de Identidade" }

function relativeTime(date: Date): string {
  const days = Math.floor((Date.now() - date.getTime()) / 86_400_000)
  if (days === 0) return "hoje"
  if (days === 1) return "há 1 dia"
  if (days < 7)  return `há ${days} dias`
  if (days < 14) return "há 1 semana"
  return `há ${Math.floor(days / 7)} semanas`
}

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  PENDING:    { label: "Pendente",   cls: "bg-amber-100 text-amber-800 border-amber-200" },
  VERIFIED:   { label: "Aprovado",   cls: "bg-success/10 text-success border-success/20" },
  REJECTED:   { label: "Rejeitado",  cls: "bg-red-100 text-red-700 border-red-200" },
  UNVERIFIED: { label: "Não enviou", cls: "bg-muted/50 text-muted-foreground border-border" },
}

async function signedUrl(path: string | null): Promise<string | null> {
  if (!path) return null
  // Extrai o caminho relativo do bucket a partir da URL pública
  const marker = "/id-docs/"
  const idx    = path.indexOf(marker)
  const key    = idx >= 0 ? path.slice(idx + marker.length) : path
  const { data } = await supabaseAdmin.storage
    .from("id-docs")
    .createSignedUrl(key, 3600) // 1 hora
  return data?.signedUrl ?? null
}

export default async function VerificacoesPage() {
  const [pending, recent] = await Promise.all([
    prisma.user.findMany({
      where:   { idVerificationStatus: "PENDING", deletedAt: null },
      orderBy: { idSubmittedAt: "asc" },
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        idVerificationStatus: true,
        idDocumentUrl: true, idSelfieUrl: true,
        idSubmittedAt: true,
      },
    }),
    prisma.user.findMany({
      where:   { idVerificationStatus: { in: ["VERIFIED", "REJECTED"] }, deletedAt: null },
      orderBy: { idVerifiedAt: "desc" },
      take:    20,
      select: {
        id: true, name: true, email: true, avatarUrl: true,
        idVerificationStatus: true,
        idVerifiedAt: true, idRejectionReason: true,
        idSubmittedAt: true,
      },
    }),
  ])

  // Gera signed URLs para os documentos do bucket privado id-docs
  const pendingWithUrls = await Promise.all(
    pending.map(async (u) => ({
      ...u,
      idDocumentUrl: await signedUrl(u.idDocumentUrl),
      idSelfieUrl:   await signedUrl(u.idSelfieUrl),
    }))
  )


  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-primary">Verificações de Identidade</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {pendingWithUrls.length === 0
              ? "Nenhuma verificação pendente ✅"
              : `${pendingWithUrls.length} verificaç${pendingWithUrls.length === 1 ? "ão" : "ões"} aguardando análise`}
          </p>
        </div>
      </div>

      {/* ─── PENDENTES ──────────────────────────────────────────── */}
      {pendingWithUrls.length > 0 && (
        <section className="mb-8">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Pendentes ({pendingWithUrls.length})
          </h2>
          <div className="space-y-4">
            {pendingWithUrls.map((user) => (
              <div key={user.id} className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
                {/* Cabeçalho do usuário */}
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
                    {user.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-foreground">{user.name}</p>
                    <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_BADGE["PENDING"].cls}`}>
                      {STATUS_BADGE["PENDING"].label}
                    </span>
                    {user.idSubmittedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(new Date(user.idSubmittedAt))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Documentos */}
                <div className="mt-4 grid grid-cols-2 gap-3">
                  {user.idDocumentUrl && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-foreground">📄 Documento</p>
                      <a href={user.idDocumentUrl} target="_blank" rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-border bg-background">
                        <Image
                          src={user.idDocumentUrl}
                          alt="Documento de identidade"
                          width={300}
                          height={200}
                          className="h-36 w-full object-cover hover:opacity-90 transition-opacity"
                          unoptimized
                        />
                        <p className="px-2 py-1 text-center text-[10px] text-muted-foreground underline">
                          Abrir em tela cheia ↗
                        </p>
                      </a>
                    </div>
                  )}
                  {user.idSelfieUrl && (
                    <div>
                      <p className="mb-1 text-xs font-semibold text-foreground">🤳 Selfie</p>
                      <a href={user.idSelfieUrl} target="_blank" rel="noopener noreferrer"
                        className="block overflow-hidden rounded-lg border border-border bg-background">
                        <Image
                          src={user.idSelfieUrl}
                          alt="Selfie do usuário"
                          width={300}
                          height={200}
                          className="h-36 w-full object-cover hover:opacity-90 transition-opacity"
                          unoptimized
                        />
                        <p className="px-2 py-1 text-center text-[10px] text-muted-foreground underline">
                          Abrir em tela cheia ↗
                        </p>
                      </a>
                    </div>
                  )}
                  {!user.idDocumentUrl && !user.idSelfieUrl && (
                    <p className="col-span-2 text-xs text-muted-foreground italic">
                      Documentos não disponíveis (bucket pode estar vazio)
                    </p>
                  )}
                </div>

                {/* Ações */}
                <VerificationActions userId={user.id} userName={user.name} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ─── HISTÓRICO RECENTE ──────────────────────────────────── */}
      {recent.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Histórico recente
          </h2>
          <div className="overflow-hidden rounded-xl border border-border bg-surface">
            {recent.map((user, i) => {
              const badge = STATUS_BADGE[user.idVerificationStatus] ?? STATUS_BADGE["UNVERIFIED"]
              return (
                <div
                  key={user.id}
                  className={`flex items-center gap-3 px-4 py-3 ${i < recent.length - 1 ? "border-b border-border" : ""}`}
                >
                  <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
                    {user.name[0]?.toUpperCase() ?? "?"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{user.name}</p>
                    {user.idRejectionReason && (
                      <p className="truncate text-xs text-muted-foreground" title={user.idRejectionReason}>
                        Motivo: {user.idRejectionReason}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-0.5">
                    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                    {user.idVerifiedAt && (
                      <span className="text-[10px] text-muted-foreground">
                        {relativeTime(new Date(user.idVerifiedAt))}
                      </span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>
      )}

      {pendingWithUrls.length === 0 && recent.length === 0 && (
        <div className="rounded-xl border border-border bg-surface p-8 text-center">
          <p className="text-3xl">🆔</p>
          <p className="mt-3 text-sm font-medium text-foreground">Nenhuma verificação ainda</p>
          <p className="mt-1 text-xs text-muted-foreground">
            As verificações aparecerão aqui quando os usuários enviarem seus documentos.
          </p>
        </div>
      )}
    </div>
  )
}
