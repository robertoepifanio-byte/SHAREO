import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Políticas do ShareO",
  description: "Termos de uso, política de privacidade (LGPD), responsabilidade e cancelamento do ShareO.",
}

const LAST_UPDATED = "13 de junho de 2026"

export default function PoliticasPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-surface">
        <div className="container py-3">
          <nav aria-label="Breadcrumb">
            <ol className="flex items-center gap-1 text-xs text-muted-foreground">
              <li><Link href="/" className="hover:text-foreground transition-colors">Início</Link></li>
              <li aria-hidden="true">›</li>
              <li className="text-foreground font-medium">Políticas</li>
            </ol>
          </nav>
        </div>
      </div>

      <main className="container py-12">
        <div className="mx-auto max-w-3xl">
          <div className="mb-10">
            <h1 className="font-display text-3xl font-bold text-primary">Políticas do ShareO</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Última atualização: {LAST_UPDATED}
            </p>
            <p className="mt-3 text-muted-foreground">
              Estas políticas regem o uso da plataforma ShareO e o tratamento de dados pessoais de seus usuários.
              Ao criar uma conta ou utilizar os serviços, você confirma que leu, compreendeu e concorda com estes termos.
            </p>
          </div>

          {/* Índice */}
          <nav aria-label="Índice das políticas" className="mb-10 rounded-xl border border-border bg-surface p-6">
            <h2 className="mb-4 font-display text-sm font-bold uppercase tracking-wide text-muted-foreground">
              Nesta página
            </h2>
            <ol className="space-y-2 text-sm">
              {[
                ["#termos-uso",      "1. Termos de Uso"],
                ["#privacidade",     "2. Política de Privacidade (LGPD)"],
                ["#responsabilidade","3. Responsabilidade"],
                ["#cancelamento",    "4. Cancelamento e Reembolso"],
                ["#cookies",         "5. Cookies e Analytics"],
                ["#contato",         "6. Contato"],
              ].map(([href, label]) => (
                <li key={href}>
                  <a href={href} className="text-brand hover:underline">{label}</a>
                </li>
              ))}
            </ol>
          </nav>

          <div className="space-y-12">

            {/* 1. Termos de Uso */}
            <section id="termos-uso" className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">📜</span>
                <h2 className="font-display text-2xl font-bold text-primary">1. Termos de Uso</h2>
              </div>

              <div className="space-y-6">
                <PolicyBlock title="1.1 Descrição do Serviço">
                  O ShareO é uma plataforma digital que conecta proprietários de itens (&quot;Locadores&quot;) a pessoas
                  que desejam alugá-los temporariamente (&quot;Locatários&quot;). O ShareO atua exclusivamente como
                  intermediário tecnológico, facilitando a descoberta de itens, a comunicação entre as partes,
                  o processamento de pagamentos e a gestão de reservas. O ShareO não é parte do contrato de
                  locação celebrado entre Locador e Locatário.
                </PolicyBlock>

                <PolicyBlock title="1.2 Elegibilidade">
                  Para criar uma conta no ShareO, você deve: (a) ter pelo menos 18 anos de idade ou ser
                  legalmente emancipado; (b) possuir CPF ou CNPJ válido e em situação regular; (c) ter
                  capacidade civil plena para celebrar contratos; e (d) não ter sido banido anteriormente
                  da plataforma.
                </PolicyBlock>

                <PolicyBlock title="1.3 Cadastro e Conta">
                  Você é responsável por manter a confidencialidade de suas credenciais de acesso. Qualquer
                  atividade realizada com sua conta é de sua responsabilidade. Notifique imediatamente o
                  ShareO em caso de acesso não autorizado pelo e-mail{" "}
                  <a href="mailto:seguranca@shareo.com.br" className="text-brand hover:underline">
                    seguranca@shareo.com.br
                  </a>.
                  O ShareO se reserva o direito de suspender ou encerrar contas que violem estas políticas.
                </PolicyBlock>

                <PolicyBlock title="1.4 Regras para Anúncio de Itens">
                  Ao anunciar um item, o Locador declara: (a) ser o legítimo proprietário do item ou
                  ter autorização para alugá-lo; (b) que o item está em boas condições de funcionamento e
                  é seguro para uso; (c) que as informações, fotos e preços divulgados são precisos e
                  verídicos; (d) que o item não está gravado por ônus ou constrição judicial que impeça
                  sua disponibilização.
                </PolicyBlock>

                <PolicyBlock title="1.5 Itens Proibidos">
                  São vedados na plataforma: armas de fogo, munições e acessórios; substâncias
                  entorpecentes, medicamentos controlados e psicotrópicos; artigos cujo aluguel seja
                  ilegal ou exija habilitação especial não verificável pela plataforma; itens que
                  violem direitos de propriedade intelectual de terceiros; e qualquer bem cuja
                  transação configure prática ilícita nos termos da legislação brasileira.
                </PolicyBlock>

                <PolicyBlock title="1.6 Obrigações do Locatário">
                  O Locatário se compromete a: utilizar o item exclusivamente para os fins acordados;
                  devolvê-lo no prazo e nas condições originais, ressalvado o desgaste natural pelo
                  uso adequado; comunicar imediatamente qualquer dano, extravio ou sinistro ao Locador
                  e ao ShareO; e responder por danos causados ao item por uso indevido.
                </PolicyBlock>

                <PolicyBlock title="1.7 Alterações nos Termos">
                  O ShareO poderá atualizar estas políticas a qualquer tempo. Alterações substanciais
                  serão comunicadas por e-mail com antecedência mínima de 30 dias. O uso contínuo da
                  plataforma após a entrada em vigor das alterações implica aceitação dos novos termos.
                </PolicyBlock>
              </div>
            </section>

            {/* 2. Privacidade */}
            <section id="privacidade" className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🔒</span>
                <h2 className="font-display text-2xl font-bold text-primary">2. Política de Privacidade (LGPD)</h2>
              </div>
              <p className="mb-6 text-sm text-muted-foreground">
                Esta seção atende aos requisitos da Lei Geral de Proteção de Dados Pessoais —
                Lei nº 13.709/2018 (LGPD).
              </p>

              <div className="space-y-6">
                <PolicyBlock title="2.1 Dados Coletados">
                  Coletamos os seguintes dados pessoais: <strong>dados de cadastro</strong> (nome, e-mail,
                  CPF/CNPJ, telefone, endereço); <strong>dados de identidade</strong> (documento de
                  identificação com foto e selfie, para verificação de identidade opcional); <strong>dados
                  financeiros</strong> (chave PIX para recebimento, histórico de transações); <strong>dados
                  de uso</strong> (endereços IP, logs de acesso, dispositivo e navegador);
                  <strong> dados de localização</strong> (cidade e estado informados no perfil;
                  coordenadas GPS somente quando o usuário concede permissão no dispositivo); e
                  <strong> conteúdo gerado</strong> (fotos de itens, avaliações, mensagens de chat).
                </PolicyBlock>

                <PolicyBlock title="2.2 Finalidade e Base Legal">
                  <ul className="mt-2 space-y-1.5 text-sm">
                    <li>• <strong>Execução do contrato</strong> (Art. 7, V, LGPD): operação da plataforma, processamento de pagamentos, suporte ao usuário.</li>
                    <li>• <strong>Obrigação legal</strong> (Art. 7, II, LGPD): cumprimento de obrigações fiscais, anti-lavagem de dinheiro (Lei 9.613/98) e retenção de dados financeiros (CTN Art. 173 — 5 anos).</li>
                    <li>• <strong>Legítimo interesse</strong> (Art. 7, IX, LGPD): prevenção a fraudes, segurança da plataforma, melhorias de produto com base em dados anonimizados.</li>
                    <li>• <strong>Consentimento</strong> (Art. 7, I, LGPD): envio de comunicações de marketing e novidades. Pode ser revogado a qualquer momento sem prejuízo ao uso do serviço.</li>
                  </ul>
                </PolicyBlock>

                <PolicyBlock title="2.3 Compartilhamento de Dados">
                  Seus dados podem ser compartilhados com: <strong>Stripe</strong> (processamento de
                  cartão de crédito — sujeito à Política de Privacidade da Stripe Inc.);
                  <strong> Supabase</strong> (infraestrutura de banco de dados e armazenamento —
                  servidores na região sa-east-1, Brasil); <strong>Resend</strong> (envio de
                  e-mails transacionais); <strong>Sentry</strong> (monitoramento de erros — dados
                  de sessão anonimizados); <strong>Mapbox</strong> (mapas e geocodificação —
                  coordenadas aproximadas); <strong>Google Analytics 4</strong> (métricas de uso
                  anonimizadas). Não vendemos dados pessoais a terceiros.
                </PolicyBlock>

                <PolicyBlock title="2.4 Retenção de Dados">
                  Os dados são retidos pelos seguintes prazos: dados de conta ativa — enquanto a conta
                  existir; dados financeiros e de transações — 5 anos (CTN Art. 173); logs de acesso —
                  6 meses (Marco Civil da Internet, Art. 15); dados de marketing com consentimento —
                  até a revogação pelo titular; dados de verificação de identidade — 5 anos ou conforme
                  exigência regulatória. Após o prazo, os dados são anonimizados ou excluídos.
                </PolicyBlock>

                <PolicyBlock title="2.5 Direitos do Titular (LGPD Art. 18)">
                  Você tem direito a: <strong>acesso</strong> — obter confirmação e cópia dos seus dados;
                  <strong> correção</strong> — corrigir dados incompletos, inexatos ou desatualizados;
                  <strong> anonimização, bloqueio ou eliminação</strong> — de dados desnecessários ou
                  tratados em desconformidade; <strong>portabilidade</strong> — obter seus dados em
                  formato estruturado; <strong>informação</strong> — sobre compartilhamento com
                  terceiros; <strong>revogação do consentimento</strong> — para finalidades que dependam
                  de consentimento; e <strong>eliminação da conta</strong> — com exclusão de dados não
                  sujeitos a obrigação legal de retenção. Exerça seus direitos em:{" "}
                  <a href="mailto:privacidade@shareo.com.br" className="text-brand hover:underline">
                    privacidade@shareo.com.br
                  </a>.
                </PolicyBlock>

                <PolicyBlock title="2.6 Segurança">
                  Adotamos medidas técnicas e organizacionais para proteger seus dados: criptografia
                  em trânsito (TLS 1.2+) e em repouso para dados sensíveis; autenticação com tokens
                  JWT de curta duração; controles de acesso por função (RBAC); e monitoramento
                  contínuo de incidentes via Sentry. Em caso de violação de dados que possa acarretar
                  risco aos titulares, notificaremos a ANPD e os usuários afetados no prazo legal.
                </PolicyBlock>

                <PolicyBlock title="2.7 Encarregado (DPO)">
                  O Encarregado de Proteção de Dados (DPO) pode ser contatado em:{" "}
                  <a href="mailto:privacidade@shareo.com.br" className="text-brand hover:underline">
                    privacidade@shareo.com.br
                  </a>.
                  {/* JURÍDICO: indicar nome e qualificação do DPO antes do go-live em produção (LGPD Art. 41) */}
                </PolicyBlock>
              </div>
            </section>

            {/* 3. Responsabilidade */}
            <section id="responsabilidade" className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">⚖️</span>
                <h2 className="font-display text-2xl font-bold text-primary">3. Responsabilidade</h2>
              </div>

              <div className="space-y-6">
                <PolicyBlock title="3.1 Papel do ShareO">
                  O ShareO é uma plataforma de intermediação. Não é parte, locador nem locatário em
                  qualquer transação realizada entre usuários. O contrato de locação é celebrado
                  exclusivamente entre o Locador e o Locatário, ficando o ShareO alheio às obrigações
                  decorrentes desse contrato, salvo na medida em que expressamente assumidas nessas
                  políticas.
                </PolicyBlock>

                <PolicyBlock title="3.2 Limitação de Responsabilidade">
                  O ShareO não se responsabiliza por: (a) danos ao item locado ou a terceiros
                  decorrentes de uso indevido pelo Locatário; (b) inexatidão nas informações
                  prestadas pelos usuários; (c) inadimplemento de qualquer obrigação entre Locador e
                  Locatário; (d) eventos de força maior ou caso fortuito que impeçam a realização
                  da locação. A responsabilidade total do ShareO, em qualquer hipótese, fica
                  limitada ao valor da taxa de serviço da transação em questão.
                </PolicyBlock>

                <PolicyBlock title="3.3 Disputas">
                  Em caso de conflito entre Locador e Locatário, o ShareO oferece um mecanismo de
                  mediação disponível na plataforma. As partes devem abrir uma disputa no prazo de
                  48 horas após o evento que a originou. O ShareO analisará as evidências apresentadas
                  e emitirá uma decisão em até 5 dias úteis, que poderá incluir reembolso parcial ou
                  total ao Locatário ou liberação do valor ao Locador. A decisão do ShareO é vinculante
                  para efeitos do repasse do valor retido na plataforma.
                </PolicyBlock>

                <PolicyBlock title="3.4 Indenização">
                  Você concorda em indenizar e isentar o ShareO, seus diretores, funcionários e
                  parceiros de qualquer reclamação, dano, perda, responsabilidade ou despesa
                  (incluindo honorários advocatícios) decorrentes de: (a) violação destas políticas;
                  (b) uso indevido da plataforma; ou (c) infração de direitos de terceiros.
                </PolicyBlock>
              </div>
            </section>

            {/* 4. Cancelamento */}
            <section id="cancelamento" className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">↩️</span>
                <h2 className="font-display text-2xl font-bold text-primary">4. Cancelamento e Reembolso</h2>
              </div>

              <div className="space-y-6">
                <PolicyBlock title="4.1 Cancelamento pelo Locatário">
                  A política de cancelamento leva em conta o tempo de antecedência em relação ao
                  início da locação:
                  <ul className="mt-2 space-y-1.5 text-sm">
                    <li>• <strong>Mais de 72 horas antes:</strong> reembolso integral do valor pago.</li>
                    <li>• <strong>Entre 24 e 72 horas antes:</strong> reembolso de 50% do valor pago.</li>
                    <li>• <strong>Menos de 24 horas antes ou após o início:</strong> sem direito a reembolso.</li>
                  </ul>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Os prazos e percentuais acima refletem a configuração atual da plataforma e podem
                    ser ajustados com aviso prévio de 30 dias.
                  </p>
                </PolicyBlock>

                <PolicyBlock title="4.2 Cancelamento pelo Locador">
                  O cancelamento pelo Locador após a confirmação da reserva resulta em reembolso
                  integral ao Locatário. Cancelamentos recorrentes por parte do Locador podem
                  acarretar advertência, suspensão temporária ou encerramento de conta, a critério
                  do ShareO.
                </PolicyBlock>

                <PolicyBlock title="4.3 Processamento do Reembolso">
                  Reembolsos são processados para o mesmo método de pagamento utilizado na reserva.
                  O prazo de crédito depende do banco ou operadora do Locatário (geralmente de 5 a
                  10 dias úteis para cartão de crédito). O ShareO não reterá taxa de serviço sobre
                  o valor reembolsado.
                </PolicyBlock>
              </div>
            </section>

            {/* 5. Cookies */}
            <section id="cookies" className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">🍪</span>
                <h2 className="font-display text-2xl font-bold text-primary">5. Cookies e Analytics</h2>
              </div>

              <div className="space-y-6">
                <PolicyBlock title="5.1 Cookies Funcionais">
                  Utilizamos cookies estritamente necessários para: manter sua sessão autenticada;
                  lembrar preferências de navegação; e garantir o funcionamento seguro da plataforma.
                  Esses cookies não podem ser desativados sem comprometer o uso do serviço.
                </PolicyBlock>

                <PolicyBlock title="5.2 Analytics (Google Analytics 4)">
                  Utilizamos o Google Analytics 4 para compreender como os usuários navegam na
                  plataforma. Os dados coletados são anonimizados (sem identificação individual) e
                  incluem páginas visitadas, tempo de sessão e origem do tráfego. Você pode optar por
                  não participar instalando o{" "}
                  <a
                    href="https://tools.google.com/dlpage/gaoptout"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline"
                  >
                    complemento de desativação do Google Analytics
                  </a>.
                </PolicyBlock>
              </div>
            </section>

            {/* 6. Contato */}
            <section id="contato" className="scroll-mt-24">
              <div className="mb-6 flex items-center gap-2">
                <span className="text-2xl" aria-hidden="true">✉️</span>
                <h2 className="font-display text-2xl font-bold text-primary">6. Contato</h2>
              </div>
              <div className="rounded-xl border border-border bg-surface p-6 text-sm text-muted-foreground space-y-2">
                <p>
                  <strong className="text-foreground">Dúvidas gerais e suporte:</strong>{" "}
                  <a href="mailto:suporte@shareo.com.br" className="text-brand hover:underline">
                    suporte@shareo.com.br
                  </a>
                </p>
                <p>
                  <strong className="text-foreground">Privacidade e direitos LGPD:</strong>{" "}
                  <a href="mailto:privacidade@shareo.com.br" className="text-brand hover:underline">
                    privacidade@shareo.com.br
                  </a>
                </p>
                <p>
                  <strong className="text-foreground">Segurança e incidentes:</strong>{" "}
                  <a href="mailto:seguranca@shareo.com.br" className="text-brand hover:underline">
                    seguranca@shareo.com.br
                  </a>
                </p>
                {/* JURÍDICO: adicionar CNPJ, razão social e endereço antes do go-live (CDC Art. 44) */}
              </div>
            </section>

          </div>

          <div className="mt-12 rounded-xl border border-brand/20 bg-brand/5 p-6 text-center">
            <p className="text-sm text-muted-foreground">
              Dúvidas sobre as políticas?{" "}
              <Link href="/ajuda" className="font-semibold text-brand hover:underline">
                Consulte nossa central de ajuda
              </Link>
              {" "}ou entre em contato em{" "}
              <a href="mailto:suporte@shareo.com.br" className="font-semibold text-brand hover:underline">
                suporte@shareo.com.br
              </a>.
            </p>
          </div>
        </div>
      </main>
    </div>
  )
}

function PolicyBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-6">
      <h3 className="mb-3 font-display text-base font-bold text-primary">{title}</h3>
      <div className="text-sm text-muted-foreground leading-relaxed">{children}</div>
    </div>
  )
}
