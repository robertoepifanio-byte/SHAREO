import { IdentificacaoPrestador } from "./IdentificacaoPrestador"

/**
 * Corpo dos Termos de Uso. Fonte única: renderizado pelo marketplace
 * (app/termos) e pela landing da campanha (apps/campanha/app/termos).
 *
 * Os valores entram por parâmetro porque vêm da configuração da plataforma, que
 * o SuperAdmin altera: o marketplace lê direto do banco e a campanha lê de
 * /api/platform-config/public. Nenhum deles pode ser cravado aqui — taxa
 * desatualizada em Termos publicados é problema de CDC, não de layout.
 */
export function TermosConteudo({
  atualizadoEm,
  feePct,
  payoutLabel,
  maxPorTransacao,
}: {
  /** Data amigável da última atualização (ver POLICY_UPDATED_AT). */
  atualizadoEm: string
  /** Taxa de serviço já formatada em pontos percentuais, ex. "15". */
  feePct: string
  /** Janela de repasse já por extenso, ex. "3 dias úteis". */
  payoutLabel: string
  /** Teto por transação já formatado em reais. */
  maxPorTransacao: string
}) {
  // Nomes preservados para o corpo abaixo entrar verbatim do arquivo de origem.
  const POLICY_UPDATED_AT = atualizadoEm

  return (
    <>
      <h1 className="text-3xl font-extrabold text-primary mb-2">Termos de Uso</h1>
      <p className="text-sm text-muted-foreground mb-6">Última atualização: {POLICY_UPDATED_AT}</p>

      {/* Em destaque, antes das cláusulas: exigência do Decreto 7.962/2013, art. 2º, I. */}
      <div className="mb-8">
        <IdentificacaoPrestador />
      </div>

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
          <p className="text-muted-foreground leading-relaxed mt-2">
            <strong>Contas Pessoa Jurídica (PJ):</strong> ao cadastrar uma empresa, o ShareO valida a situação cadastral do
            CNPJ junto à Receita Federal, e quem realiza o cadastro declara, sob as penas da lei (art. 299 do Código Penal),
            ser o representante legal da pessoa jurídica ou possuir poderes para representá-la. Essa declaração é registrada
            com data, hora e endereço IP. CNPJs inativos, baixados ou suspensos não são aceitos, e o ShareO pode encerrar
            contas cujo vínculo se mostre falso.
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
          <h2 className="text-lg font-bold text-primary">6. Pagamentos e Taxa de Serviço</h2>
          <p className="text-muted-foreground leading-relaxed">
            Os pagamentos são processados de forma segura pela plataforma, que intermedia o valor da locação entre locatário e locador. O locatário paga o valor da locação; sobre esse valor, o ShareO retém uma taxa de serviço de {feePct}% e repassa o restante ao locador. O repasse aos locadores fica elegível {payoutLabel} após a confirmação da devolução e é processado diariamente — sem vinculação a um dia fixo da semana. Essa janela cobre o prazo de abertura de disputa. Cada transação está sujeita a um limite de {maxPorTransacao}. A taxa de serviço vigente é informada no momento da contratação e pode ser alterada mediante atualização destes Termos.
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
    </>
  )
}
