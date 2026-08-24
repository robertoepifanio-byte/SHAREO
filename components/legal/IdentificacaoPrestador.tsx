import { LEGAL_ENTITY } from "@/lib/legal-config"

/**
 * Bloco de identificação do prestador, renderizado em /termos, /privacidade e
 * /politicas. A obrigação legal e o motivo da fonte única estão documentados
 * uma vez, na JSDoc de `LEGAL_ENTITY` (lib/legal-config.ts).
 *
 * `papel` muda só a frase de abertura: nos Termos a empresa aparece como
 * fornecedora do serviço; na Política de Privacidade, como CONTROLADORA dos
 * dados (LGPD art. 9º, I) — mesmo dado, dois enquadramentos legais. É um union
 * de dois valores, e não uma frase passada pelo chamador, justamente porque o
 * texto é jurídico: cinco páginas não podem escrever cinco variantes do termo.
 */
export function IdentificacaoPrestador({
  papel = "prestador",
}: {
  papel?: "prestador" | "controlador"
}) {
  const abertura =
    papel === "controlador"
      ? "O controlador dos dados pessoais tratados nesta plataforma é:"
      : "A plataforma ShareO é operada por:"

  return (
    <section
      aria-label="Identificação da empresa responsável pela plataforma"
      className="rounded-xl border border-border bg-surface p-5 text-sm"
    >
      <p className="text-muted-foreground">{abertura}</p>
      <p className="mt-2 font-semibold text-foreground">{LEGAL_ENTITY.razaoSocial}</p>
      <p className="text-muted-foreground">
        CNPJ <span className="tabular-nums">{LEGAL_ENTITY.cnpj}</span>
      </p>
      {LEGAL_ENTITY.enderecoSede && (
        <p className="text-muted-foreground">{LEGAL_ENTITY.enderecoSede}</p>
      )}
      <p className="mt-2 text-muted-foreground">
        Contato:{" "}
        <a href={`mailto:${LEGAL_ENTITY.emailContato}`} className="text-brand hover:underline">
          {LEGAL_ENTITY.emailContato}
        </a>
      </p>
    </section>
  )
}
