import type { ReactNode } from "react"
import Link from "next/link"
import Image from "next/image"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 rounded-sm">
        <Image
          src="/logos/shareo-logo.png"
          alt="ShareO"
          width={160}
          height={48}
          className="object-contain h-12 w-auto"
          priority
        />
      </Link>

      <div className="w-full max-w-md">
        {children}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ShareO — Use Mais. Possua Menos.
      </p>
    </main>
  )
}
