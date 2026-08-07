import { PreLaunchHeader } from "@/components/layout/PreLaunchHeader"
import { CampaignBanner } from "@/components/home/CampaignBanner"
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
      </main>
    </>
  )
}
