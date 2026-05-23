import type { Metadata } from "next"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"

export const metadata: Metadata = { title: "Dashboard" }

export default async function DashboardPage() {
  const session = await auth()
  if (!session) redirect("/login")

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background">
      <h1 className="text-4xl font-extrabold text-primary">
        Olá, {session.user.name?.split(" ")[0]} 👋
      </h1>
      <p className="text-muted-foreground">Dashboard em construção — Sprint 2</p>
    </main>
  )
}
