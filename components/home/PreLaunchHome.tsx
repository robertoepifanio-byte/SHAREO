import { PreLaunchHeader } from "@/components/layout/PreLaunchHeader"
import { CampaignBanner } from "@/components/home/CampaignBanner"
import { ProgramBanner } from "@/components/home/ProgramBanner"
import { ListaVIP } from "@/components/home/ListaVIP"

/**
 * Home do modo de pré-lançamento (NEXT_PUBLIC_PRELAUNCH_MODE).
 *
 * Substitui a home de marketplace inteira enquanto a campanha nacional está no
 * ar: o objetivo da página passa a ser um só — entrar na lista — e qualquer
 * outro caminho é distração que leva a uma rota bloqueada pelo gate.
 *
 * `ListaVIP` é reaproveitada como o bloco principal (é exatamente a experiência
 * já aprovada: selo de pré-lançamento, headline, os 4 benefícios, formulário e
 * prova social), promovida a `h1` por ser o título da página agora.
 */

/*
 * Alt das artes de programa.
 *
 * Todo o texto vive dentro da imagem, então o alt é o único acesso de quem usa
 * leitor de tela — é longo de propósito e transcreve a arte, não a resume. As
 * duas orientações de cada programa trazem a mesma mensagem, então um alt serve
 * para o par.
 */
const ALT_FUNDADORES =
  "Programa Fundadores ShareO. Você faz parte do começo de algo grande e por " +
  "isso recebe benefícios exclusivos para sempre. Pioneiro: seja um dos " +
  "primeiros a acreditar no poder do compartilhamento na sua região. Taxa " +
  "reduzida: taxa promocional permanente para Fundadores em todas as suas " +
  "locações. Destaque exclusivo: seu perfil e anúncios ganham mais " +
  "visibilidade na plataforma. O que é o programa Fundadores: é o programa " +
  "exclusivo para os 1.000 primeiros usuários que se cadastrarem na " +
  "plataforma ShareO antes do lançamento oficial, com benefícios especiais e " +
  "condições exclusivas e permanentes. Apenas 1.000 vagas disponíveis. " +
  "Seja um Fundador ShareO: convide, transforme, ganhe todos os dias. " +
  "Entrar na lista de pré-lançamento."

const ALT_EMBAIXADORES =
  "Programa Indique um Amigo e seja um Embaixador ShareO. Convide amigos, " +
  "ajude a transformar vidas e ganhe com isso. Você ganhará comissão sobre a " +
  "comissão recebida das locações do seu indicado sempre que ele fizer " +
  "negócios na plataforma; as comissões são calculadas sobre o valor de " +
  "comissão que a plataforma recebe em cada operação. São três categorias de " +
  "embaixador: Bronze, de 1 a 10 indicados, ganha 2% da comissão em cada " +
  "operação do seu indicado; Prata, de 11 a 50 indicados, ganha 3%; e Ouro, " +
  "acima de 50 indicados, ganha 5%. Fácil de indicar, ganhos recorrentes, sem " +
  "limite de indicações e transforme comunidades. " +
  "Entrar na lista de pré-lançamento."

const passos = [
  {
    n: "1",
    titulo: "Você entra na lista",
    texto: "Leva menos de um minuto. Só pedimos e-mail e CEP — o CEP é o que nos diz em qual bairro abrir primeiro.",
  },
  {
    n: "2",
    titulo: "Escolhemos as primeiras cidades",
    texto: "Abrimos onde houver gente suficiente dos dois lados: quem tem itens parados e quem precisa alugar.",
  },
  {
    n: "3",
    titulo: "Você é avisado antes de todo mundo",
    texto: "Quem está na lista entra primeiro, com a verificação de perfil gratuita.",
  },
]

export function PreLaunchHome() {
  return (
    <>
      {/*
        Cabeçalho sem logo (o banner logo abaixo já traz a marca) e com o selo de
        pré-lançamento. Sendo sticky, o aviso de que o serviço ainda não abriu
        acompanha a rolagem inteira em vez de sumir no topo.
      */}
      <PreLaunchHeader variant="minimal" showBadge />

      <main id="conteudo">
        {/* Arte da campanha (duas orientações, ver CampaignBanner) */}
        <CampaignBanner />

        {/* h1 da página. `hideBadge` porque o selo subiu para o cabeçalho. */}
        <ListaVIP as="h1" hideBadge />

        {/* Como vai funcionar — tempo futuro de propósito: nada está no ar ainda,
            e prometer no presente seria propaganda de serviço inexistente. */}
        <section
          aria-labelledby="prelaunch-como"
          className="bg-background px-6 py-14"
        >
          <div className="mx-auto max-w-[900px]">
            <h2
              id="prelaunch-como"
              className="mb-3 text-center font-display text-[22px] font-extrabold text-foreground xl:text-[28px]"
            >
              Como vai funcionar
            </h2>
            <p className="mx-auto mb-10 max-w-[560px] text-center text-[15px] leading-relaxed text-muted-foreground">
              O ShareO conecta quem tem um item parado em casa a quem precisa dele
              por alguns dias — furadeira, projetor, barraca, caixa de som.
            </p>

            <ol className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {passos.map((p) => (
                <li
                  key={p.n}
                  className="rounded-xl border border-border bg-surface p-5"
                >
                  <span
                    aria-hidden="true"
                    className="mb-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-brand/10 font-display text-base font-extrabold text-brand"
                  >
                    {p.n}
                  </span>
                  <h3 className="mb-1.5 text-[15px] font-bold text-foreground">{p.titulo}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{p.texto}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/*
          Artes dos dois programas. Vêm DEPOIS de "Como vai funcionar" de
          propósito: são o incentivo para entrar na lista, e só fazem sentido
          para quem já entendeu o que é o ShareO. Fundadores primeiro porque é
          o topo do funil — o convite de embaixador pressupõe conta na
          plataforma, que na campanha ainda não existe.
        */}
        <section aria-labelledby="prelaunch-programas" className="bg-background">
          <h2 id="prelaunch-programas" className="sr-only">
            Programas Fundadores e Embaixadores
          </h2>

          <ProgramBanner
            slug="fundadores"
            id="programa-fundadores"
            larguraHorizontal={1536}
            aspecto="aspect-[1024/1536] md:aspect-[1536/1024]"
            alt={ALT_FUNDADORES}
          />

          <ProgramBanner
            slug="embaixadores"
            id="programa-embaixadores"
            larguraHorizontal={1492}
            aspecto="aspect-[1024/1536] md:aspect-[1492/1054]"
            alt={ALT_EMBAIXADORES}
          />
        </section>
      </main>
    </>
  )
}
