"use client"

/**
 * ContractAcceptanceCheckbox
 *
 * Exibe o aviso de contrato de locação e o checkbox de aceite eletrônico.
 * Renderizado no PriceCalc apenas quando a feature flag
 * rentalContractAcceptanceEnabled estiver ON (prop `enabled`).
 *
 * ⚠️  O contrato exibido é RASCUNHO — pendente de revisão jurídica (D4).
 *     Esta UI deixa isso EXPLÍCITO ao usuário.
 */

import { useState } from "react"
import { RENTAL_CONTRACT_VERSION } from "@/lib/rental-contract"

interface Props {
  accepted: boolean
  onAcceptedChange: (v: boolean) => void
  contractText: string
  contractVersion?: string
}

export function ContractAcceptanceCheckbox({
  accepted,
  onAcceptedChange,
  contractText,
  contractVersion = RENTAL_CONTRACT_VERSION,
}: Props) {
  const [open, setOpen] = useState(false)

  return (
    <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 p-3">
      {/* Cabeçalho com badge de rascunho */}
      <div className="mb-2 flex items-start gap-2">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className="mt-0.5 shrink-0 text-amber-600"
          aria-hidden="true"
        >
          <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <div className="min-w-0">
          <p className="text-xs font-semibold text-amber-800">
            Contrato de Locação
            <span className="ml-1.5 rounded bg-amber-200 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-amber-800">
              Rascunho — pendente revisao juridica
            </span>
          </p>
          <p className="mt-0.5 text-[11px] leading-snug text-amber-700">
            Este modelo de contrato ainda aguarda revisao e aprovacao juridica (D4).
            Nao tem valor de instrumento definitivo. Versao: {contractVersion}.
          </p>
        </div>
      </div>

      {/* Botao de expandir o texto do contrato */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="mb-2 flex w-full items-center justify-between rounded border border-amber-300 bg-white px-2.5 py-1.5 text-xs font-medium text-amber-800 transition-colors hover:bg-amber-100"
        aria-expanded={open}
        aria-controls="contract-text-panel"
      >
        <span>{open ? "Ocultar texto do contrato" : "Ler o contrato completo"}</span>
        <svg
          width="12"
          height="12"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {/* Texto do contrato — expansível.

          Sem `dangerouslySetInnerHTML`. Hoje `contractText` é sempre a constante
          estática RENTAL_CONTRACT_TEXT (lib/rental-contract.ts) — verificado: a
          única interpolação no template é ${RENTAL_CONTRACT_VERSION}, nenhum dado
          de usuário. Então NÃO há XSS hoje.

          Mas o `.replace(/\n/g, "<br/>")` + innerHTML era um XSS latente: no dia
          em que alguém trocasse a fonte por texto dinâmico (nome de item, algo do
          locador), a injeção entraria sem aviso e sem revisão. `white-space:
          pre-line` preserva as quebras de linha SEM interpretar HTML — o React
          escapa o texto, e a fragilidade deixa de existir por construção em vez
          de por comentário. */}
      {open && (
        <div
          id="contract-text-panel"
          role="region"
          aria-label="Texto do contrato de locacao"
          className="mb-2 max-h-64 overflow-y-auto whitespace-pre-line rounded border border-amber-200 bg-white p-2.5 text-[11px] leading-relaxed text-muted-foreground"
        >
          {contractText}
        </div>
      )}

      {/* Checkbox de aceite */}
      <label className="flex cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => onAcceptedChange(e.target.checked)}
          className="mt-0.5 h-4 w-4 shrink-0 accent-brand"
          aria-required="true"
        />
        <span className="text-[11px] leading-snug text-amber-800">
          Li e aceito o Contrato de Locacao de Bens Moveis (rascunho pendente de revisao
          juridica — D4), os{" "}
          <a
            href="/termos"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-brand"
          >
            Termos de Uso
          </a>{" "}
          e a{" "}
          <a
            href="/privacidade"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-brand"
          >
            Politica de Privacidade
          </a>{" "}
          da ShareO.
        </span>
      </label>
    </div>
  )
}
