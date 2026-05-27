import Image from "next/image"

const CATEGORY_IMAGES: Record<string, string> = {
  Ferramentas:     "/icones/ferramentas.jpeg",
  Construção:      "/icones/construcao.jpeg",
  Moda:            "/icones/moda.jpeg",
  Eletrônicos:     "/icones/eletronicos.jpeg",
  "Casa e Jardim": "/icones/casa-jardim.jpeg",
  Esporte:         "/icones/esporte.jpeg",
  Festas:          "/icones/festas.jpeg",
}

interface CategoryIconProps {
  name:       string
  size?:      number
  className?: string
}

export function CategoryIcon({ name, size = 32, className = "" }: CategoryIconProps) {
  const src = CATEGORY_IMAGES[name]
  if (!src) return null

  return (
    <Image
      src={src}
      alt=""
      width={size}
      height={size}
      className={`object-contain ${className}`}
      aria-hidden="true"
    />
  )
}
