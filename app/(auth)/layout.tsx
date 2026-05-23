import type { ReactNode } from "react"
import Link from "next/link"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-12">
      <Link href="/" className="mb-8 flex items-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-4 rounded-sm">
        <span className="text-3xl font-extrabold tracking-tight text-primary">
          Share<span className="text-brand">O</span>
        </span>
      </Link>

      <div className="w-full max-w-md">
        {children}
      </div>

      <p className="mt-8 text-xs text-muted-foreground">
        © {new Date().getFullYear()} ShareO — Use Mais. Possua Menos.
      </p>
    </div>
  )
}
