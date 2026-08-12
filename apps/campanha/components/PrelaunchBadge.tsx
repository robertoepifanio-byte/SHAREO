/**
 * Selo "Pré-lançamento · Primeiros no Brasil".
 *
 * Extraído da ListaVIP para poder viver no cabeçalho da landing de campanha.
 * Como o cabeçalho é sticky, o selo acompanha a rolagem e mantém visível, o
 * tempo todo, que o serviço ainda não está no ar — o que é honesto com o
 * visitante e conversa com a copy no futuro do resto da página.
 *
 * Texto completo em todas as larguras: o ThemeToggle do cabeçalho é
 * `hidden md:flex`, então no mobile o selo tem a linha inteira à disposição —
 * 261px de selo em 343px úteis a 375px, e ainda cabe a 320px.
 */
export function PrelaunchBadge({ className = "" }: { className?: string }) {
  return (
    <span
      role="note"
      className={`inline-flex items-center gap-1.5 rounded-full border border-amber-400/50 bg-amber-400/20 px-3 py-1.5 text-xs font-semibold text-amber-200 sm:px-3.5 ${className}`}
    >
      <svg
        width="14"
        height="14"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </svg>
      <span className="whitespace-nowrap">Pré-lançamento · Primeiros no Brasil</span>
    </span>
  )
}
