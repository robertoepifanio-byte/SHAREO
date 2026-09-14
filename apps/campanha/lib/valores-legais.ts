import {
  formatPayoutWindow,
  formatPercentLabel,
  formatPercentValue,
  formatPriceLong,
  formatPriceShort,
} from "@shareo/legal"
import { SHAREO_API } from "@/lib/config"

/**
 * Valores que o texto legal interpola: taxa de serviço, janela de repasse e teto
 * por transação.
 *
 * Vêm de `/api/platform-config/public` do marketplace — o MESMO endpoint que o
 * app mobile já usa para não cravar esses números no texto. Não podem ser
 * constantes daqui: o SuperAdmin altera a taxa no painel, e Termos publicados
 * com taxa desatualizada é problema de CDC, não de layout.
 *
 * A formatação vem de @shareo/legal, a mesma que o marketplace usa — grafia
 * diferente do mesmo número faria os dois documentos divergirem sem que ninguém
 * tivesse editado o texto.
 *
 * Chamada de SERVIDOR (não do navegador): é servidor-para-servidor, então não
 * depende de CORS, e os números chegam no HTML sem piscar depois da hidratação.
 *
 * ⚠️ Sem fallback, ao contrário da prova social da ListaVIP: se a API não
 * responder, isto LANÇA. Publicar documento jurídico com número inventado é
 * pior do que não publicá-lo.
 *
 * O que isso significa na prática, sendo preciso: as três páginas são estáticas
 * com ISR, então o `throw` morde no BUILD, não no acesso. Um revalidate que
 * falha faz o Next continuar servindo a versão anterior — a página publicada
 * não sai do ar. A consequência real é que uma instabilidade no marketplace
 * reprova o build da campanha; preferimos isso a assar um número errado no HTML
 * estático, que ficaria no ar até o próximo deploy sem ninguém perceber.
 */
export type ValoresLegais = {
  /** Taxa em pontos percentuais, sem o símbolo: "15". */
  feePct: string
  /** Taxa já formatada: "15%". */
  feeLabel: string
  /** Janela de repasse por extenso: "3 dias". */
  payoutLabel: string
  /** Teto por transação com centavos: "R$ 500,00". */
  maxPorTransacao: string
  /** Teto por transação na forma curta: "R$ 500". */
  maxLabel: string
}

export async function lerValoresLegais(): Promise<ValoresLegais> {
  const res = await fetch(`${SHAREO_API}/api/platform-config/public`, {
    // Mesma janela do Cache-Control do endpoint. Documento legal não precisa de
    // leitura fresca a cada visita, mas também não pode congelar entre deploys.
    next: { revalidate: 60 },
  })

  if (!res.ok) {
    throw new Error(
      `Não foi possível ler a configuração da plataforma (HTTP ${res.status}). ` +
        "As páginas legais não são publicadas com valores de fallback.",
    )
  }

  const json = (await res.json()) as {
    data?: { feeRateBps?: number; payoutWindowDays?: number; checkoutMaxCents?: number }
  }
  const { feeRateBps, payoutWindowDays, checkoutMaxCents } = json.data ?? {}

  if (
    typeof feeRateBps !== "number" ||
    typeof payoutWindowDays !== "number" ||
    typeof checkoutMaxCents !== "number"
  ) {
    throw new Error("Configuração da plataforma veio incompleta — páginas legais não publicadas.")
  }

  return {
    // Os Termos interpolam o número antes do "%" literal do texto; as Políticas
    // esperam o rótulo já com símbolo. Duas props, uma fonte.
    feePct: formatPercentValue(feeRateBps / 100),
    feeLabel: formatPercentLabel(feeRateBps / 100),
    payoutLabel: formatPayoutWindow(payoutWindowDays),
    maxPorTransacao: formatPriceLong(checkoutMaxCents),
    maxLabel: formatPriceShort(checkoutMaxCents),
  }
}
