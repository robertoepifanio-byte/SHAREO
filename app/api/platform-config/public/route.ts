import { NextResponse } from "next/server"
import {
  getPlatformFeeRate,
  getPayoutWindowDays,
  getCancellationConfig,
  getLateFeeMultiplier,
  getAutoCancelConfig,
  getRentalContractConfig,
  CHECKOUT_MAX_CENTS,
} from "@/lib/platform-config"

/**
 * GET /api/platform-config/public
 *
 * Endpoint público (sem autenticação) com os números que a plataforma já
 * PUBLICA na Central de Ajuda do site: taxa, teto por transação, janela de
 * repasse, política de cancelamento, multa de atraso e prazo do proprietário
 * responder. Nada aqui é sigiloso — é a mesma informação impressa em
 * /ajuda, /termos e /politicas.
 *
 * Por que cresceu: a Central de Ajuda do app mobile cravava esses valores no
 * texto ("toda segunda-feira", "R$ 500", "24 horas"), então divergia do site
 * assim que qualquer config mudava — e foi assim que a tela inteira do app
 * ficou descrevendo o PSP anterior. Com os valores vindo daqui, o app
 * transcreve o site de verdade, inclusive quando o SuperAdmin muda a config.
 *
 * NÃO expor nada além do que já é público. O endpoint com acesso irrestrito
 * ao PlatformConfig continua sendo /api/admin/platform-config.
 *
 * Cache-Control de 60s: esses valores mudam < 1×/mês e nunca ficam defasados
 * por mais de um minuto.
 */
export async function GET() {
  const [feeRateBps, payoutWindowDays, cancel, lateFeeMultiplier, autoCancel, contrato] = await Promise.all([
    getPlatformFeeRate(),
    getPayoutWindowDays(),
    getCancellationConfig(),
    getLateFeeMultiplier(),
    getAutoCancelConfig(),
    getRentalContractConfig(),
  ])

  return NextResponse.json(
    {
      data: {
        feeRateBps,
        payoutWindowDays,
        checkoutMaxCents: CHECKOUT_MAX_CENTS,
        cancel,
        lateFeeMultiplier,
        ownerHours: autoCancel.ownerHours,
        // O app precisa saber para não exibir "assinatura pendente" de um
        // contrato que nada exige — mesma config que o guard de mark_active lê.
        rentalContractRequired: contrato.enabled,
      },
    },
    { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } },
  )
}
