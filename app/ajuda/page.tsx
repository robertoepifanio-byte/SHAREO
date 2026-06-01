import type { Metadata } from "next"
import Link from "next/link"
import { AppHeader } from "@/components/layout/AppHeader"

export const metadata: Metadata = {
  title: "Central de Ajuda — ShareO",
  description: "Tudo o que você precisa saber para alugar ou anunciar no ShareO. Guia completo para locatários e locadores.",
}

/* ── Dados de conteúdo ──────────────────────────────────────────── */

const HOW_LOCATARIO = [
  { step: 1, icon: "🔍", title: "Encontre o que precisa",   desc: "Procure itens disponíveis perto de você. Veja fotos, preços por dia, semana ou mês e o perfil do proprietário antes de decidir." },
  { step: 2, icon: "📅", title: "Solicite a reserva",        desc: "Escolha a data de retirada e a duração. O app calcula automaticamente a data de devolução e o valor total." },
  { step: 3, icon: "✅", title: "Pague e retire o item",     desc: "Quando o proprietário confirmar, pague com segurança via cartão. Combine a retirada pelo chat do app e aproveite!" },
]

const HOW_LOCADOR = [
  { step: 1, icon: "📸", title: "Crie seu anúncio",          desc: "Adicione fotos, título, descrição e o estado do item. Defina o preço por dia — e, se quiser, por semana e mês com desconto." },
  { step: 2, icon: "🔔", title: "Confirme solicitações",      desc: "Quando alguém solicitar seu item, você recebe uma notificação. Leia a mensagem, aceite e combine a entrega pelo chat." },
  { step: 3, icon: "💰", title: "Receba seu dinheiro",        desc: "O pagamento é liberado depois que você confirma a entrega do item. Tudo protegido pela ShareO." },
]

const SECTIONS = [
  {
    id: "locatario",
    title: "Para quem quer alugar",
    icon: "🛒",
    color: "bg-[#144D81]/5 border-[#144D81]/20",
    iconBg: "bg-[#144D81]/10",
    faqs: [
      { q: "Como encontro um item perto de mim?",
        a: "Acesse 'Explorar' e navegue pelos anúncios disponíveis. Cada item mostra o bairro e a cidade do proprietário, para você saber onde o item está antes de solicitar." },
      { q: "Como faço uma reserva?",
        a: "Abra a página do item e use a calculadora de locação. Escolha a modalidade (diário, semanal ou mensal), selecione a data de retirada e o número de dias. A data de devolução e o valor total aparecem automaticamente. Se quiser, escreva uma mensagem ao proprietário e clique em 'Solicitar locação'." },
      { q: "Como funciona o pagamento?",
        a: "Só é possível pagar depois que o proprietário confirmar a reserva. Quando ele aceitar, você recebe o aviso e pode clicar em 'Pagar agora'. O pagamento é feito com cartão via Stripe. O dinheiro fica retido e só é liberado ao proprietário após a confirmação da retirada do item." },
      { q: "Posso cancelar uma reserva?",
        a: "Sim. Enquanto a reserva estiver 'Aguardando' ou 'Confirmada', você pode cancelar na página da reserva. O cancelamento é gratuito até 24 horas antes da data de retirada." },
      { q: "O que acontece na retirada do item?",
        a: "Combine com o proprietário pelo chat do app onde e quando retirar o item. Na entrega, o proprietário pode registrar fotos do estado do item. Quando tudo estiver certo, ele marca a reserva como 'Ativo' e o período de locação começa." },
      { q: "E se o item não estiver como anunciado?",
        a: "Se houver algum problema, você pode abrir uma disputa na página da reserva enquanto ela estiver ativa ou após a devolução. Descreva o que aconteceu e a equipe ShareO vai analisar o caso. Estamos disponíveis 7 dias por semana." },
      { q: "Como avalio o proprietário?",
        a: "Após devolver o item, a opção de avaliação aparece na página da reserva. Você pode dar uma nota de 1 a 5 estrelas e deixar um comentário. Avaliações ajudam toda a comunidade ShareO." },
    ],
  },
  {
    id: "locador",
    title: "Para quem quer anunciar",
    icon: "📦",
    color: "bg-brand/5 border-brand/20",
    iconBg: "bg-brand/10",
    faqs: [
      { q: "Como anuncio meu item?",
        a: "Vá em 'Anunciar' no app. Preencha o título, descrição, categoria, estado de conservação (novo, seminovo, bom estado ou regular) e adicione fotos. Informe seu bairro e cidade para que locatários saibam onde o item está. Depois defina o preço e publique." },
      { q: "Como defino o preço?",
        a: "Você define o preço por dia. Também pode oferecer preço por semana e por mês — normalmente com desconto para incentivar aluguéis mais longos. Se o item tiver valor de mercado conhecido, informe o preço de compra: o app mostra ao locatário quanto ele economiza alugando em vez de comprar." },
      { q: "Como confirmo uma reserva?",
        a: "Quando alguém solicitar seu item, você recebe uma notificação. Em 'Minhas Reservas', clique na aba 'Como locador'. Abra a reserva, leia a mensagem do locatário e clique em 'Confirmar reserva'. Se não quiser aceitar, pode cancelar informando o motivo." },
      { q: "Quando recebo o pagamento?",
        a: "O pagamento é liberado depois que você marca a reserva como 'Ativo', confirmando que entregou o item. Antes disso o valor fica retido com segurança pela ShareO — isso protege você e o locatário." },
      { q: "O que faço na entrega do item?",
        a: "Combine o local e horário de entrega pelo chat. Na hora da entrega, você pode registrar fotos do estado do item (check-in). Quando entregar, clique em 'Marcar como ativo'. Na devolução, registre fotos de check-out para documentar o estado do item ao retornar." },
      { q: "Como cancelo uma reserva?",
        a: "Você pode cancelar enquanto ela estiver 'Aguardando' ou 'Confirmada'. Na página da reserva, clique em 'Cancelar reserva' e informe o motivo. Evite cancelamentos frequentes — eles afetam sua reputação na plataforma." },
      { q: "Meu item está protegido?",
        a: "A ShareO oferece proteção durante a locação. Você pode solicitar uma caução ao criar o anúncio — um valor retido no pagamento e devolvido ao locatário após a devolução sem danos. Se houver problemas, abra uma disputa com as fotos de check-in e check-out como evidência." },
    ],
  },
  {
    id: "pagamento",
    title: "Segurança e Pagamento",
    icon: "🔒",
    color: "bg-amber-50 border-amber-200",
    iconBg: "bg-amber-100",
    faqs: [
      { q: "Como o pagamento funciona no ShareO?",
        a: "O pagamento segue três etapas: 1) O locatário solicita a reserva. 2) O proprietário confirma. 3) O locatário paga via cartão pelo app. O dinheiro fica retido e só é liberado ao proprietário quando ele confirma que entregou o item. Isso garante segurança para os dois lados." },
      { q: "Meu dinheiro está protegido?",
        a: "Sim. O pagamento não vai direto para o proprietário — ele fica retido na plataforma até a confirmação da entrega. Se algo der errado antes disso, o valor pode ser devolvido. Em caso de disputa, nossa equipe analisa o caso e decide o destino do pagamento." },
      { q: "O que é caução?",
        a: "Caução é um valor adicional cobrado pelo proprietário como garantia. Ele aparece no resumo do pagamento e é cobrado junto com o aluguel. Depois que você devolve o item em bom estado, a caução é devolvida. Ela existe para proteger o proprietário caso o item seja danificado." },
      { q: "Como funciona o Stripe?",
        a: "O Stripe é a plataforma de pagamentos que o ShareO usa — a mesma tecnologia usada por grandes empresas no mundo todo. Seus dados de cartão nunca passam pelos servidores do ShareO. Você é redirecionado para a página segura do Stripe ao clicar em 'Pagar agora'." },
    ],
  },
  {
    id: "conta",
    title: "Conta e Perfil",
    icon: "👤",
    color: "bg-purple-50 border-purple-200",
    iconBg: "bg-purple-100",
    faqs: [
      { q: "Como verifico minha identidade?",
        a: "Acesse 'Meu Perfil' e role até 'Privacidade e dados'. Lá você encontra a opção de verificação de identidade. Envie os documentos solicitados. Quando aprovada, um selo de verificado aparece no seu perfil — aumentando a confiança de outros usuários." },
      { q: "Como edito meu perfil?",
        a: "Vá em 'Meu Perfil'. Você pode atualizar nome, bio, telefone, cidade, bairro e foto de perfil. Manter seu perfil completo ajuda outros usuários a confiar mais em você." },
      { q: "Como me torno PJ Premium?",
        a: "No seu perfil, encontre o bloco de upgrade para Pessoa Jurídica (PJ). Como PJ, você ganha uma vitrine personalizada com link próprio, acesso a analytics avançado dos seus anúncios e recursos para importar itens em massa — ideal para quem aluga profissionalmente." },
    ],
  },
]

/* ── Componente FAQ accordion (client não necessário — HTML details) ── */
function FaqItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="group border-b border-border last:border-0">
      <summary className="flex cursor-pointer select-none items-center justify-between gap-4 py-4 text-sm font-semibold text-primary hover:text-brand transition-colors">
        <span>{q}</span>
        <svg
          className="h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"
        >
          <polyline points="6 9 12 15 18 9"/>
        </svg>
      </summary>
      <div className="pb-4 pr-8 text-sm leading-relaxed text-muted-foreground">
        {a}
      </div>
    </details>
  )
}

/* ── Página ─────────────────────────────────────────────────────── */
export default function AjudaPage() {
  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <main>
        {/* Hero */}
        <section className="bg-gradient-to-br from-primary to-[#144D81] px-4 py-14 text-center">
          <div className="mx-auto max-w-xl">
            <div className="mb-4 text-5xl">💬</div>
            <h1 className="mb-3 font-display text-3xl font-extrabold text-white md:text-4xl">
              Como podemos ajudar?
            </h1>
            <p className="text-base text-white/75">
              Tudo o que você precisa saber para alugar ou anunciar no ShareO.
            </p>
            {/* Navegação rápida */}
            <div className="mt-8 flex flex-wrap justify-center gap-2">
              {[
                { href: "#locatario", label: "🛒 Quero alugar" },
                { href: "#locador",   label: "📦 Quero anunciar" },
                { href: "#pagamento", label: "🔒 Pagamento" },
                { href: "#conta",     label: "👤 Minha conta" },
              ].map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  className="rounded-full border border-white/30 bg-white/10 px-4 py-2 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </section>

        {/* Como funciona */}
        <section className="bg-surface py-12 px-4">
          <div className="container mx-auto max-w-4xl">
            <h2 className="mb-10 font-display text-center text-2xl font-bold text-primary">
              Como funciona o ShareO?
            </h2>
            <div className="grid gap-10 md:grid-cols-2">
              {/* Locatário */}
              <div>
                <h3 className="mb-5 font-display flex items-center gap-2 text-lg font-bold text-primary">
                  <span className="rounded-full bg-[#144D81]/10 px-3 py-1 text-sm text-[#144D81]">Para quem aluga</span>
                </h3>
                <div className="space-y-5">
                  {HOW_LOCATARIO.map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white font-bold text-sm">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{s.icon} {s.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* Locador */}
              <div>
                <h3 className="mb-5 font-display flex items-center gap-2 text-lg font-bold text-primary">
                  <span className="rounded-full bg-green-100 px-3 py-1 text-sm text-green-700">Para quem anuncia</span>
                </h3>
                <div className="space-y-5">
                  {HOW_LOCADOR.map((s) => (
                    <div key={s.step} className="flex gap-4">
                      <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-brand text-white font-bold text-sm">
                        {s.step}
                      </div>
                      <div>
                        <p className="font-semibold text-primary">{s.icon} {s.title}</p>
                        <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQs por seção */}
        <div className="container mx-auto max-w-3xl px-4 py-12 space-y-10">
          {SECTIONS.map((sec) => (
            <section key={sec.id} id={sec.id} className={`rounded-2xl border p-6 ${sec.color}`}>
              <h2 className="mb-6 font-display flex items-center gap-3 text-xl font-bold text-primary">
                <span className={`flex h-10 w-10 items-center justify-center rounded-full text-xl ${sec.iconBg}`}>
                  {sec.icon}
                </span>
                {sec.title}
              </h2>
              <div className="rounded-xl bg-white px-4 py-2 shadow-sm">
                {sec.faqs.map((faq) => (
                  <FaqItem key={faq.q} q={faq.q} a={faq.a} />
                ))}
              </div>
            </section>
          ))}

          {/* Contato */}
          <section id="contato" className="rounded-2xl bg-primary p-8 text-center text-white">
            <div className="mb-3 text-4xl">💬</div>
            <h2 className="mb-2 font-display text-xl font-bold">Ainda precisa de ajuda?</h2>
            <p className="mb-6 text-sm text-white/75">
              Nossa equipe está disponível 7 dias por semana para te ajudar.
            </p>
            <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <a
                href="mailto:suporte@shareo.com.br"
                className="inline-flex h-11 items-center gap-2 rounded-lg bg-brand px-6 text-sm font-bold text-white hover:opacity-90 transition-opacity"
              >
                ✉️ suporte@shareo.com.br
              </a>
              <Link
                href="/reservas"
                className="inline-flex h-11 items-center gap-2 rounded-lg border border-white/30 bg-white/10 px-6 text-sm font-semibold text-white hover:bg-white/20 transition-colors"
              >
                📋 Ver minhas reservas
              </Link>
            </div>
            <p className="mt-4 text-xs text-white/50">
              Para problemas com uma reserva ativa, use a opção &ldquo;Abrir disputa&rdquo; na página da reserva — é mais rápido.
            </p>
          </section>
        </div>
      </main>
    </div>
  )
}
