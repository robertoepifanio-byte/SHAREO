/**
 * DELETE /api/users/me/biometric-consent
 * Revogação do consentimento biométrico pelo próprio titular (LGPD art. 11, II, "a"
 * + art. 18 — direito de revogação). Decisão C1 (2026-06-30).
 *
 * Efeitos:
 *   - apaga o arquivo de selfie no bucket privado `id-docs` (best-effort);
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

    const selfiePath = user.idSelfieUrl

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

    // Best-effort: apagar o arquivo do bucket privado. Não bloqueia a resposta.
    if (selfiePath) {
      after(async () => {
        try {
          const supabase = createAdminClient()
          await supabase.storage.from("id-docs").remove([selfiePath])
        } catch (e) {
          console.warn("[DELETE biometric-consent] limpeza da selfie falhou:", e instanceof Error ? e.message : e)
        }
      })
    }

    return new NextResponse(null, { status: 204 })
  } catch (e) {
    console.error("[DELETE /api/users/me/biometric-consent]", e instanceof Error ? e.message : e)
    return NextResponse.json({ error: { code: "INTERNAL_ERROR", message: "Erro interno." } }, { status: 500 })
  }
}
