/**
 * DELETE /api/users/me/biometric-consent
 * Revogação do consentimento biométrico pelo próprio titular (LGPD art. 11, II, "a"
 * + art. 18 — direito de revogação). Decisão C1 (2026-06-30).
 *
 * Efeitos:
 *   - apaga TODAS as selfies do titular em `id-docs/id-verification/<userId>/selfie-*`
 *     (decisão do fundador 25/09/2026 — o reenvio após rejeição acumula selfies; o
 *     comportamento anterior apagava só a última, `idSelfieUrl`);
 *   - zera `idSelfieUrl` e `idSelfieConsentAt`; rebaixa `idVerificationStatus` a UNVERIFIED;
 *   - MANTÉM `idSelfieConsentVersion/TextHash/Ip` como prova de cumprimento (retenção 5a);
 *   - NÃO apaga o documento (`idDocumentUrl`) — só a biometria facial.
 *
 * A revogação não retroage sobre o uso lícito anterior (aprovação de KYC já concedida
 * permanece válida — apenas a imagem é removida).
 */
import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { withUser } from "@/lib/withUser"
import { prisma } from "@/lib/prisma"
import { createAdminClient } from "@/lib/supabase/admin"
import { idVerificationPrefix } from "@/lib/supabase/user-storage-paths"

export async function DELETE(req: NextRequest) {
  try {
    const user = await withUser(req, { select: { idSelfieUrl: true, idSelfieConsentAt: true } })
    if (user instanceof NextResponse) return user

    const userId = user.id

    // Só quem TEM registro de consentimento biométrico pode revogá-lo. Isso evita
    // que um usuário VERIFIED pelo fluxo antigo (selfie enviada, mas idSelfieConsentAt
    // null) seja rebaixado a UNVERIFIED por engano ao chamar este endpoint.
    if (!user || !user.idSelfieConsentAt)
      return NextResponse.json(
        { error: { code: "NO_BIOMETRIC_DATA", message: "Não há consentimento biométrico ativo para revogar." } },
        { status: 404 }
      )

    // Rebaixa a verificação e remove a imagem do banco; a PROVA do consentimento
    // (versão/hash/IP) é preservada por obrigação legal (5 anos).
    await prisma.user.update({
      where: { id: userId },
      data: {
        idSelfieUrl:          null,
        idSelfieConsentAt:    null,
        idVerificationStatus: "UNVERIFIED",
      },
    })

    // Best-effort: apagar TODAS as selfies do prefixo do titular no bucket privado.
    // Reenvios após rejeição acumulam arquivos selfie-<ts>.<ext>; apagar só `idSelfieUrl`
    // (o anterior) deixava as selfies antigas para trás. Não bloqueia a resposta.
    after(async () => {
      try {
        const supabase  = createAdminClient()
        const prefixo   = idVerificationPrefix(userId)
        const { data, error } = await supabase.storage.from("id-docs").list(prefixo)
        if (error) {
          console.warn("[DELETE biometric-consent] listagem das selfies falhou:", error.message)
          return
        }
        const selfiePaths = (data ?? [])
          .filter((item) => item.id !== null && item.name.startsWith("selfie-"))
          .map((item) => `${prefixo}/${item.name}`)
        if (selfiePaths.length === 0) return
        const { error: removeError } = await supabase.storage.from("id-docs").remove(selfiePaths)
        if (removeError) {
          console.warn("[DELETE biometric-consent] remoção das selfies falhou:", removeError.message)
        }
      } catch (e) {
        console.warn("[DELETE biometric-consent] limpeza das selfies falhou:", e instanceof Error ? e.message : e)
      }
    })

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[DELETE /api/users/me/biometric-consent]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Erro interno." } }, { status: 500 })
  }
}
