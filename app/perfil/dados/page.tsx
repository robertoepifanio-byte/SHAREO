import type { Metadata } from "next"
import { redirect } from "next/navigation"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = { title: "Privacidade e Dados" }

export default async function DadosPage() {
  const session = await auth()
  if (!session) redirect("/login?callbackUrl=/perfil/dados")

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <Link href="/perfil" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Meu Perfil
          </Link>
        </div>
      </div>

      <main className="container py-8">
        <div className="mx-auto max-w-lg space-y-5">
          <h1 className="text-xl font-bold text-primary">Privacidade e Dados</h1>
          <p className="text-sm text-muted-foreground">
            Você tem o direito de acessar e exportar todos os dados que o ShareO armazena sobre você, conforme a LGPD (Lei 13.709/2018).
          </p>

          {/* Exportar dados */}
          <div className="rounded-xl border border-border bg-surface p-5">
            <h2 className="mb-1 font-semibold text-foreground">Exportar meus dados</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Baixe um arquivo JSON com todos os seus dados pessoais: perfil, reservas, avaliações e mensagens (LGPD art. 20).
            </p>
            <a
              href="/api/users/me/export"
              download
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-border px-5 text-sm font-semibold text-foreground hover:bg-background transition-colors"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
              Exportar dados (JSON)
            </a>
          </div>

          {/* Informações sobre retenção */}
          <div className="rounded-xl border border-border bg-surface p-5 space-y-3">
            <h2 className="font-semibold text-foreground">Sobre seus dados</h2>
            {[
              { icon: "🔒", title: "CPF/CNPJ", desc: "Armazenado com criptografia AES-256-GCM. Nunca exposto em texto claro." },
              { icon: "📋", title: "Histórico de locações", desc: "Mantido por obrigação fiscal (art. 37 Código Comercial) mesmo após exclusão da conta." },
              { icon: "💬", title: "Mensagens", desc: "Armazenadas enquanto a conta estiver ativa. Removidas ao excluir a conta." },
              { icon: "🗺️", title: "Localização", desc: "Usada apenas para centralizar o mapa e nunca compartilhada com terceiros." },
            ].map((item) => (
              <div key={item.title} className="flex gap-3">
                <span className="text-lg flex-shrink-0" aria-hidden="true">{item.icon}</span>
                <div>
                  <p className="text-sm font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Link para excluir conta */}
          <div className="rounded-xl border border-destructive/20 bg-surface p-5">
            <h2 className="mb-1 font-semibold text-foreground">Excluir conta</h2>
            <p className="mb-4 text-sm text-muted-foreground">
              Para excluir sua conta e todos os dados pessoais, acesse as configurações de segurança.
            </p>
            <Link
              href="/perfil/seguranca"
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-destructive/30 px-5 text-sm font-semibold text-destructive hover:bg-destructive/5 transition-colors"
            >
              Ir para Segurança →
            </Link>
          </div>
        </div>
      </main>
    </div>
  )
}
