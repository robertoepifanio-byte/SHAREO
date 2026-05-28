"use client"

import { signOut } from "next-auth/react"

interface Props {
  className?: string
  children?: React.ReactNode
}

export function SignOutButton({ className, children = "Sair" }: Props) {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
      className={className}
    >
      {children}
    </button>
  )
}
