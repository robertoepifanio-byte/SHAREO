import Image from 'next/image'
import Link from 'next/link'

export function Header() {
  return (
    <header className="sticky top-0 z-sticky bg-brand-navy border-b border-brand-navy/20">
      <nav className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" aria-label="ShareO — página inicial">
          <Image
            src="/images/logo-transparente.png"
            alt="ShareO"
            width={100}
            height={30}
            priority
          />
        </Link>
      </nav>
    </header>
  )
}
