import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Termos de Uso — ShareO",
  description: "Leia os Termos de Uso do ShareO, a plataforma de economia circular para aluguel local de itens.",
}

export default function TermosPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="container py-10 max-w-3xl">
        <h1 className="text-3xl font-extrabold text-primary mb-2">Termos de Uso</h1>
        <p className="text-sm text-muted-foreground mb-8">Última atualização: junho de 2026</p>

        <div className="prose prose-sm max-w-none text-foreground space-y-6">

          <section>
            <h2 className="text-lg font-bold text-primary">1. Aceitação dos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Ao acessar ou usar a plataforma ShareO, você concorda com estes Termos de Uso. Se não concordar com alguma parte, não utilize nossos serviços.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">2. Descrição do Serviço</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ShareO é um marketplace de economia circular que conecta pessoas que desejam alugar itens (locatários) com pessoas que possuem itens disponíveis para locação (locadores). O ShareO atua como intermediário tecnológico e não é responsável pelos itens anunciados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">3. Cadastro e Conta</h2>
            <p className="text-muted-foreground leading-relaxed">
              Para utilizar os serviços completos do ShareO, é necessário criar uma conta fornecendo informações verdadeiras e atualizadas. Você é responsável por manter a confidencialidade de sua senha e por todas as atividades realizadas em sua conta.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">4. Responsabilidades do Locador</h2>
            <p className="text-muted-foreground leading-relaxed">
              O locador é responsável por: (a) garantir que o item anunciado lhe pertence ou que possui autorização para alugá-lo; (b) descrever o item com precisão, incluindo seu estado de conservação; (c) entregar o item nas condições anunciadas; (d) cumprir os prazos acordados.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">5. Responsabilidades do Locatário</h2>
            <p className="text-muted-foreground leading-relaxed">
              O locatário é responsável por: (a) usar o item de acordo com sua finalidade e com cuidado; (b) devolver o item no prazo e nas condições em que o recebeu; (c) ressarcir eventuais danos causados ao item durante a locação.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">6. Pagamentos</h2>
            <p className="text-muted-foreground leading-relaxed">
              Os pagamentos são processados de forma segura pela plataforma. O valor é liberado ao locador após a confirmação da entrega do item. O ShareO pode cobrar uma taxa de serviço sobre as transações realizadas.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">7. Condutas Proibidas</h2>
            <p className="text-muted-foreground leading-relaxed">
              É proibido: usar a plataforma para fins ilegais; anunciar itens de origem ilícita; assediar outros usuários; fornecer informações falsas; tentar burlar o sistema de pagamento da plataforma.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">8. Limitação de Responsabilidade</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ShareO não se responsabiliza por danos diretos ou indiretos decorrentes do uso da plataforma, incluindo disputas entre usuários, danos aos itens ou indisponibilidade temporária do serviço.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">9. Alterações nos Termos</h2>
            <p className="text-muted-foreground leading-relaxed">
              O ShareO pode atualizar estes Termos a qualquer momento. Notificaremos os usuários sobre alterações significativas. O uso continuado da plataforma após as alterações implica aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-primary">10. Contato</h2>
            <p className="text-muted-foreground leading-relaxed">
              Dúvidas sobre estes Termos? Entre em contato:{" "}
              <a href="mailto:suporte@shareo.com.br" className="text-brand hover:underline">
                suporte@shareo.com.br
              </a>
            </p>
          </section>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex gap-4 text-sm">
          <Link href="/privacidade" className="text-brand hover:underline">Política de Privacidade</Link>
          <Link href="/ajuda" className="text-brand hover:underline">Central de Ajuda</Link>
        </div>
      </main>
    </div>
  )
}
