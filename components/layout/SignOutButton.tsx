"use client"

import { signOut } from "next-auth/react"

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className="hidden md:inline-flex h-9 items-center gap-1.5 px-3 rounded-md text-sm font-medium border border-white/30 text-white/80 hover:bg-white/10 hover:text-white transition-colors outline-none focus-visible:ring-1 focus-visible:ring-white"
    >
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
        <polyline points="16 17 21 12 16 7"/>
        <line x1="21" y1="12" x2="9" y2="12"/>
      </svg>
      Sair
    </button>
  )
}
