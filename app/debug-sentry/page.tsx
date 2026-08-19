// ⚠️ TEMPORÁRIO — verificação da migração @sentry/nextjs v10 (client runtime).
// Protegido por ?token=$SENTRY_TEST_TOKEN. REMOVER antes do merge do PR #319.
import { notFound } from "next/navigation"
import { ClientTrigger } from "./ClientTrigger"

export const dynamic = "force-dynamic"

export default async function DebugSentryPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>
}) {
  const { token } = await searchParams
  const expected  = process.env.SENTRY_TEST_TOKEN

  if (!expected || token !== expected) notFound()

  return (
    <main style={{ padding: 32, fontFamily: "sans-serif", maxWidth: 640 }}>
      <h1 style={{ fontSize: 22, marginBottom: 8 }}>Sentry v10 — verificação de client</h1>
      <p style={{ marginBottom: 24, color: "#475569" }}>
        Clique para disparar um evento no runtime do navegador (init via{" "}
        <code>instrumentation-client.ts</code>). Depois confira no dashboard do
        Sentry se o evento chegou <strong>com PII mascarada</strong>.
      </p>
      <ClientTrigger />
    </main>
  )
}
