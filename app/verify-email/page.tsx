import { redirect } from "next/navigation"
import Link from "next/link"
import type { Metadata } from "next"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Verificação de E-mail — ShareO" }

interface Props {
  searchParams: Promise<{ success?: string; error?: string }>
}

export default async function VerifyEmailPage({ searchParams }: Props) {
  const params = await searchParams
  const { success, error } = params

  if (!success && !error) {
    redirect("/")
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main className="container flex min-h-[calc(100vh-4rem)] items-center justify-center py-12">
        <div className="mx-auto w-full max-w-md">
          {success === "1" && (
            <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
              <div className="mb-4 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-green-100 text-2xl">
                  ✓
                </span>
              </div>
              <h1 className="mb-2 text-xl font-bold text-green-800">E-mail confirmado!</h1>
              <p className="mb-6 text-sm text-green-700">
                Sua conta está verificada. Agora você pode aproveitar todos os recursos do ShareO.
              </p>
              <Link
                href="/"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-brand px-6 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              >
                Ir para o início
              </Link>
            </div>
          )}

          {error === "expired" && (
            <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-8 text-center">
              <div className="mb-4 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-yellow-100 text-2xl">
                  ⏱
                </span>
              </div>
              <h1 className="mb-2 text-xl font-bold text-yellow-800">Link expirado</h1>
              <p className="mb-6 text-sm text-yellow-700">
                Seu link de verificação expirou. Solicite um novo e-mail de verificação.
              </p>
              <Link
                href="/perfil/seguranca"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-yellow-400 bg-yellow-100 px-6 text-sm font-semibold text-yellow-800 transition-colors hover:bg-yellow-200"
              >
                Reenviar e-mail
              </Link>
            </div>
          )}

          {error === "invalid" && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-8 text-center">
              <div className="mb-4 flex justify-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-2xl">
                  ✕
                </span>
              </div>
              <h1 className="mb-2 text-xl font-bold text-red-800">Link inválido</h1>
              <p className="mb-6 text-sm text-red-700">
                Este link de verificação é inválido ou já foi utilizado.
              </p>
              <Link
                href="/perfil/seguranca"
                className="inline-flex h-11 items-center justify-center rounded-lg border border-red-300 bg-red-100 px-6 text-sm font-semibold text-red-800 transition-colors hover:bg-red-200"
              >
                Ir para segurança da conta
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
