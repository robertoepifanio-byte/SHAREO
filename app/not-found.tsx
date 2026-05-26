import Link from "next/link"

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-4xl font-bold text-navy">404</h1>
      <p className="text-lg text-gray-600">Página não encontrada</p>
      <Link href="/" className="text-brand underline hover:no-underline">
        Voltar para o início
      </Link>
    </main>
  )
}
