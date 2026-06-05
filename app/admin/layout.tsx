import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"

const NAV = [
  {
    href:  "/admin",
    label: "Visão Geral",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/>
        <rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/>
      </svg>
    ),
  },
  {
    href:  "/admin/itens",
    label: "Itens",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
        <line x1="7" y1="7" x2="7.01" y2="7"/>
      </svg>
    ),
  },
  {
    href:  "/admin/usuarios",
    label: "Usuários",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href:  "/admin/disputas",
    label: "Disputas",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    href:  "/admin/verificacoes",
    label: "Verificações",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2" y="5" width="20" height="14" rx="2"/>
        <path d="M16 10a2 2 0 1 1-4 0 2 2 0 0 1 4 0z"/>
        <path d="M6 9h2M6 13h2M6 17h12"/>
      </svg>
    ),
  },
  {
    href:  "/admin/financeiro",
    label: "Financeiro",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <line x1="12" y1="1" x2="12" y2="23"/>
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
      </svg>
    ),
  },
]

const linkCls =
  "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium text-foreground/70 hover:bg-background hover:text-foreground transition-colors"

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session || session.user.role !== "ADMIN") redirect("/dashboard")

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-primary">
        <div className="container flex h-14 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold text-white/60 hover:text-white transition-colors">
              ← ShareO
            </Link>
            <span className="text-white/30">/</span>
            <span className="text-sm font-bold text-white">Admin</span>
          </div>
          <span className="text-sm text-white/60">{session.user.name}</span>
        </div>
      </header>

      {/* Mobile nav */}
      <nav className="flex gap-1 overflow-x-auto border-b border-border bg-surface px-4 py-2 md:hidden" aria-label="Admin nav">
        {NAV.map((item) => (
          <Link key={item.href} href={item.href} className="flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-background hover:text-foreground whitespace-nowrap transition-colors">
            {item.icon}
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="container py-6">
        <div className="flex gap-8">
          {/* Sidebar — desktop */}
          <aside className="hidden w-44 flex-shrink-0 md:block">
            <nav className="space-y-0.5" aria-label="Admin nav">
              {NAV.map((item) => (
                <Link key={item.href} href={item.href} className={linkCls}>
                  {item.icon}
                  {item.label}
                </Link>
              ))}
            </nav>
          </aside>

          <main className="min-w-0 flex-1">
            {children}
          </main>
        </div>
      </div>
    </div>
  )
}
