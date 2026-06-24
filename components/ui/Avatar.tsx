import Image from "next/image"

/**
 * Avatar — único componente de avatar do app (foto OU inicial num círculo).
 *
 * Centraliza a regra "se tem `src` mostra a foto, senão mostra a inicial" para
 * que todos os lugares (header, /perfil, /dashboard, chat, anúncios, avaliações,
 * admin…) fiquem consistentes: ajustar a aparência aqui muda em todos.
 *
 * O TAMANHO e o TEMA (cor de fundo/texto/borda) ficam por conta de quem usa,
 * via `size` e `className` — pois variam por contexto (header pequeno, perfil
 * grande, etc.). Default: bg-brand + texto branco.
 */
export function Avatar({
  name,
  src,
  size = 40,
  className = "bg-brand text-white",
}: {
  name: string | null | undefined
  src?: string | null
  /** lado do círculo em px (default 40) */
  size?: number
  /** classes do container — fundo/texto/borda/ring por contexto */
  className?: string
}) {
  const initial = name?.trim()?.charAt(0)?.toUpperCase() || "?"
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full font-bold leading-none ${className}`}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {src ? (
        <Image
          src={src}
          alt={name ?? "Avatar"}
          width={size}
          height={size}
          className="h-full w-full object-cover"
        />
      ) : (
        initial
      )}
    </span>
  )
}
