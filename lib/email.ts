import { Resend } from "resend"
import type { CreateEmailOptions, CreateEmailResponse } from "resend"
import { APP_URL } from "@/lib/app-url"
import { unsubscribeUrl } from "@/lib/founders-unsubscribe"
import { formatPrice, formatDateLong } from "@/utils/format"
import { prisma } from "@/lib/prisma"

/**
 * Lida a CADA chamada, não uma vez na carga do módulo.
 *
 * Como constante de módulo, o valor congelava na primeira vez que a função
 * serverless subia: uma instância iniciada sem a variável seguia achando que
 * não havia chave pelo resto da vida, mesmo depois de a variável ser
 * corrigida. Combinado com a ausência de log, isso não aparecia em lugar
 * nenhum. Ler na hora custa um acesso a `process.env`.
 */
export function isEmailProviderConfigured(): boolean {
  const k = process.env.RESEND_API_KEY
  return typeof k === "string" && k.trim().length > 0
}

/**
 * Domínios usados exclusivamente por teste automatizado. Nenhum deles recebe
 * e-mail lido por gente, então a entrega real só queima cota.
 *
 * ⚠️ Casar por DOMÍNIO, não por sufixo da string inteira. A versão anterior
 * fazia `endsWith("@shareo.test")` e cobria 9 dos 197 endereços de teste do
 * repositório: deixava passar `@shareo-test.com` (24, fixtures da suíte E2E) e
 * `@daily-sim.shareo.test` (164, robô de validação diária — subdomínio, então
 * o sufixo nunca casava). Os dois enviavam de verdade, todo dia, e foi assim
 * que a cota da Resend estourou.
 */
const TEST_EMAIL_DOMAINS = ["shareo.test", "shareo-test.com"] as const

function isTestDomain(address: string): boolean {
  const at = address.lastIndexOf("@")
  if (at < 0) return false
  const domain = address.slice(at + 1).toLowerCase()
  // `d` cobre o domínio exato; `.${d}` cobre qualquer subdomínio dele.
  return TEST_EMAIL_DOMAINS.some((d) => domain === d || domain.endsWith(`.${d}`))
}

/** `to` do payload da Resend só é destino de teste se TODO destinatário for de domínio de teste. */
export function isTestRecipient(to: CreateEmailOptions["to"]): boolean {
  const list = Array.isArray(to) ? to : [to]
  return list.length > 0 && list.every(isTestDomain)
}

/**
 * Inicialização lazy: evita erro de build quando RESEND_API_KEY não está no ambiente de CI.
 *
 * `emails.send` é interceptado aqui — único ponto por onde toda função deste
 * arquivo obtém o cliente — para pular o envio real a domínio de teste. A suíte
 * E2E cria dezenas de contas de teste por rodada, cada uma disparando e-mail
 * de verificação/reset; nenhum spec lê a caixa de entrada, então a entrega
 * real não tem valor nenhum — só consome a cota diária do Resend e derruba a
 * fila de retry para e-mails de usuário de verdade (achado ao vivo em 28/08,
 * cota estourada travando o `email-retry` cron).
 */
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!isEmailProviderConfigured()) {
    // Todas as 15 funções deste arquivo desistem em silêncio quando o cliente
    // é nulo. Sem este log, uma campanha paga captaria leads sem ninguém
    // receber nada e sem um único sinal — foi o que aconteceu em 31/08/2026,
    // descoberto só porque alguém conferiu a caixa de entrada na mão.
    console.error("[email] RESEND_API_KEY ausente ou vazia no runtime — NENHUM e-mail será enviado")
    return null
  }
  if (_resend) return _resend

  const client      = new Resend(process.env.RESEND_API_KEY)
  const realSend     = client.emails.send.bind(client.emails)
  client.emails.send = ((payload: CreateEmailOptions, options?: Parameters<typeof realSend>[1]): Promise<CreateEmailResponse> => {
    if (isTestRecipient(payload.to)) {
      return Promise.resolve({ data: { id: "skipped-test-recipient" }, error: null })
    }
    return realSend(payload, options)
  }) as typeof client.emails.send

  _resend = client
  return _resend
}

// || (não ??): EMAIL_FROM vazio no Vercel não pode virar from inválido
const FROM = process.env.EMAIL_FROM || "noreply@shareo.com.br"

// Persiste falha persistente de e-mail crítico para reprocessamento pelo cron email-retry.
// Silencia erros do próprio enqueue: se o banco estiver fora, não queremos cascata.
async function enqueueEmail(
  to: string,
  templateKey: string,
  payloadJson: Record<string, string | number | boolean | null>,
): Promise<void> {
  await prisma.emailQueue.create({ data: { to, templateKey, payloadJson } })
}

/**
 * Rótulo do item para assuntos/corpos de e-mail e notificações.
 * Em locações multi-item (Story B), mostra o item principal + "+ mais N item(ns)"
 * em vez de citar só o principal — assim o usuário não acha que a reserva é de 1 item só.
 * `totalItems` = total de itens da locação (booking_items); 0/1 → só o título.
 */
export function bookingItemsLabel(mainTitle: string, totalItems: number): string {
  const extra = totalItems - 1
  if (extra <= 0) return mainTitle
  return `${mainTitle} + mais ${extra} ${extra === 1 ? "item" : "itens"}`
}

/**
 * Envia com 1 retry automático em falha transitória da Resend.
 * Para e-mails que bloqueiam o usuário (verificação, reset de senha),
 * uma falha momentânea de rede/API não deve deixá-lo sem o link.
 * Retorna no padrão { error } da Resend (null em sucesso).
 */
async function sendWithRetry(
  resend: Resend,
  payload: Parameters<Resend["emails"]["send"]>[0],
  label: string,
): Promise<{ error: { message: string } | null }> {
  const MAX_ATTEMPTS = 2
  let lastError: { message: string } | null = null

  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      const { error } = await resend.emails.send(payload)
      if (!error) return { error: null }
      lastError = { message: error.message }
      console.error(`[email:${label}] tentativa ${attempt}/${MAX_ATTEMPTS} falhou: ${error.message}`)
    } catch (err) {
      lastError = { message: err instanceof Error ? err.message : "erro desconhecido" }
      console.error(`[email:${label}] tentativa ${attempt}/${MAX_ATTEMPTS} exceção: ${lastError.message}`)
    }
    if (attempt < MAX_ATTEMPTS) await new Promise((r) => setTimeout(r, 400))
  }

  return { error: lastError }
}

/**
 * Envio genérico de baixo nível, com retry. É o ÚNICO ponto de integração com o
 * provedor para e-mails sem template dedicado (ex.: cron de reengajamento).
 */
export async function sendAppEmail(opts: {
  to: string
  subject: string
  html: string
}): Promise<{ error: { message: string } | null }> {
  const resend = getResend()
  if (!resend) {
    console.warn(`[email] sem RESEND_API_KEY — "${opts.subject}" não enviado`)
    return { error: { message: "RESEND_API_KEY ausente" } }
  }
  return sendWithRetry(
    resend,
    { from: `ShareO <${FROM}>`, to: opts.to, subject: opts.subject, html: opts.html },
    "app",
  )
}

// ─── Templates ────────────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ShareO</title>
</head>
<body style="margin:0;padding:0;background:#FFFFFF;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFFFFF;padding:40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;">

          <!-- Logo / Header -->
          <tr>
            <td align="center" style="padding-bottom:24px;">
              <span style="font-size:26px;font-weight:800;color:#003366;letter-spacing:-0.5px;">
                Share<span style="color:#007B3C;">O</span>
              </span>
              <p style="margin:4px 0 0;font-size:11px;color:#64748B;letter-spacing:0.5px;text-transform:uppercase;">
                Use Mais. Possua Menos.
              </p>
            </td>
          </tr>

          <!-- Card -->
          <tr>
            <td style="background:#FFFFFF;border-radius:12px;border:1px solid #E2E8F0;padding:40px 36px;">
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="padding:24px 0 0;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">
                © 2026 ShareO · Brasil
                <br/>
                <a href="${APP_URL}" style="color:#94A3B8;">shareo.com.br</a>
                <br/>
                Desenvolvido por
                <a href="https://www.pratika.ia.br" style="color:#94A3B8;">Pratika IA</a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function ctaButton(href: string, label: string) {
  return `<a href="${href}"
    style="display:inline-block;background:#007B3C;color:#FFFFFF;font-size:15px;
           font-weight:700;text-decoration:none;border-radius:8px;
           padding:14px 32px;margin:24px 0;">
    ${label}
  </a>`
}

function passwordResetHtml(firstName: string, resetUrl: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      Redefinir sua senha
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! Recebemos uma solicitação para redefinir a senha da sua conta ShareO.
      Clique no botão abaixo para criar uma nova senha:
    </p>

    <div style="text-align:center;">
      ${ctaButton(resetUrl, "Redefinir minha senha")}
    </div>

    <p style="margin:0 0 8px;font-size:13px;color:#64748B;line-height:1.6;">
      ⏱ Este link expira em <strong>1 hora</strong>.
    </p>
    <p style="margin:0 0 8px;font-size:13px;color:#64748B;line-height:1.6;">
      Se você não solicitou a redefinição de senha, ignore este e-mail — sua conta permanece segura.
    </p>
    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
      Ou acesse o link diretamente:<br/>
      <a href="${resetUrl}" style="color:#007B3C;word-break:break-all;">${resetUrl}</a>
    </p>
  `)
}

function bookingConfirmedHtml(firstName: string, itemTitle: string, startDate: Date, endDate: Date, bookingUrl: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      ✅ Reserva confirmada!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! O proprietário confirmou sua reserva de
      <strong>${itemTitle}</strong>. Combine os detalhes de retirada com ele pelo chat.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0"
      style="margin-bottom:24px;border-radius:8px;border:1px solid #E2E8F0;padding:16px 20px;">
      <tr>
        <td style="padding-bottom:8px;">
          <span style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Retirada</span><br/>
          <span style="font-size:15px;font-weight:600;color:#0D1B2A;">${fmtDate(startDate)}</span>
        </td>
      </tr>
      <tr>
        <td>
          <span style="font-size:12px;font-weight:700;color:#64748B;text-transform:uppercase;letter-spacing:0.5px;">Devolução</span><br/>
          <span style="font-size:15px;font-weight:600;color:#0D1B2A;">${fmtDate(endDate)}</span>
        </td>
      </tr>
    </table>
    <div style="text-align:center;">${ctaButton(bookingUrl, "Ver detalhes da reserva")}</div>
  `)
}

function bookingCancelledHtml(firstName: string, itemTitle: string, role: "borrower" | "owner", reason: string | undefined, bookingUrl: string) {
  const who = role === "borrower" ? "O proprietário cancelou" : "O locatário cancelou"
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#B91C1C;">
      ❌ Reserva cancelada
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! ${who} a reserva de <strong>${itemTitle}</strong>.
    </p>
    ${reason ? `
    <div style="margin-bottom:20px;padding:14px 18px;background:#FFF7ED;border-radius:8px;border:1px solid #FED7AA;">
      <p style="margin:0;font-size:13px;color:#C2410C;"><strong>Motivo:</strong> ${reason}</p>
    </div>` : ""}
    <div style="text-align:center;">${ctaButton(bookingUrl, "Ver reserva")}</div>
    <p style="margin:20px 0 0;font-size:13px;color:#64748B;line-height:1.6;">
      Se tiver dúvidas, entre em contato com o suporte pelo chat da plataforma.
    </p>
  `)
}

function lateFeeHtml(firstName: string, itemTitle: string, lateFeeFormatted: string, paymentUrl: string, bookingUrl: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#B91C1C;">
      🚨 Taxa de atraso — pagamento necessário
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! O prazo de devolução de <strong>${itemTitle}</strong> foi ultrapassado.
      Uma taxa de atraso de <strong>${lateFeeFormatted}</strong> foi gerada.
    </p>
    <div style="text-align:center;">${ctaButton(paymentUrl, `Pagar taxa de atraso — ${lateFeeFormatted}`)}</div>
    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
      Após o pagamento, a reserva será encerrada e o item poderá ser devolvido.
      <a href="${bookingUrl}" style="color:#007B3C;">Ver reserva →</a>
    </p>
  `)
}

// ─── Funções públicas ──────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
  allowQueue = true,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  // Vazio quando o lead não informou nome — o template omite a saudação.
  const firstName = name.trim().split(" ")[0]
  const resetUrl  = `${APP_URL}/esqueci-senha/${token}`

  const { error } = await sendWithRetry(resend, {
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Redefinir sua senha — ShareO",
    html:    passwordResetHtml(firstName, resetUrl),
  }, "password-reset")

  if (error) {
    if (allowQueue) {
      await enqueueEmail(to, "password-reset", { to, name, token })
        .catch((e) => console.error(`[email-queue] falha ao enfileirar password-reset: ${e}`))
    }
    throw new Error(`Resend error: ${error.message}`)
  }
}

export async function sendExportReadyEmail(
  to: string,
  name: string,
  periodStart: Date,
  periodEnd: Date,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  // Vazio quando o lead não informou nome — o template omite a saudação.
  const firstName = name.trim().split(" ")[0]
  const url       = `${APP_URL}/admin/financeiro/exportar`

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      Exportação concluída
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! A exportação financeira do período
      <strong>${formatDateLong(periodStart)} a ${formatDateLong(periodEnd)}</strong> foi concluída
      e está disponível para download no painel administrativo.
    </p>

    <div style="text-align:center;">
      ${ctaButton(url, "Baixar exportação")}
    </div>

    <p style="margin:0;font-size:13px;color:#64748B;line-height:1.6;">
      O arquivo fica disponível na página de exportações do painel financeiro.
    </p>
  `)

  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Sua exportação financeira está pronta — ShareO",
    html,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
  allowQueue = true,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName  = name.split(" ")[0]
  // Aponta pra rota de API que PROCESSA o token (grava emailVerified e redireciona
  // pra /verify-email?success=1|error=...) — não pra própria página /verify-email,
  // que só LÊ success/error da querystring e ignora token, redirecionando pra "/"
  // em silêncio. O link nunca verificava nada; achado ao vivo em 28/08/2026.
  const verifyUrl  = `${APP_URL}/api/auth/verify-email?token=${token}`

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      Confirme seu e-mail
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! Clique no botão abaixo para confirmar seu endereço de e-mail.
      O link expira em <strong>48 horas</strong>.
    </p>

    <div style="text-align:center;">
      ${ctaButton(verifyUrl, "Confirmar e-mail")}
    </div>

    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
      Se o botão não funcionar, acesse o link diretamente:<br/>
      <a href="${verifyUrl}" style="color:#007B3C;word-break:break-all;">${verifyUrl}</a>
    </p>
    <p style="margin:12px 0 0;font-size:12px;color:#94A3B8;">
      Se você não criou uma conta no ShareO, ignore este e-mail.
    </p>
  `)

  const { error } = await sendWithRetry(resend, {
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Confirme seu e-mail no ShareO",
    html,
  }, "verification")

  if (error) {
    if (allowQueue) {
      await enqueueEmail(to, "verification", { to, name, token })
        .catch((e) => console.error(`[email-queue] falha ao enfileirar verification: ${e}`))
    }
    throw new Error(`Resend error: ${error.message}`)
  }
}

// ─── Lembretes automáticos ────────────────────────────────────────────────────

// Alias local para manter legibilidade dos templates sem mudar o texto formatado.
const fmtDate = formatDateLong

/** Lembrete: reserva começa amanhã — enviado ao locatário e ao locador */
export async function sendReminderStartTomorrow(
  borrowerEmail: string, borrowerName: string,
  ownerEmail:    string, ownerName:    string,
  itemTitle:     string, bookingId:    string,
  startDate:     Date,
): Promise<void> {
  const url  = `${APP_URL}/reservas/${bookingId}`
  const html = (firstName: string, role: "borrower" | "owner") => baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      ${role === "borrower" ? "🗓 Sua reserva começa amanhã!" : "🗓 Entrega de item amanhã!"}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! O aluguel de <strong>${itemTitle}</strong> começa em
      <strong>${fmtDate(startDate)}</strong>.
      ${role === "borrower"
        ? "Combine os detalhes de retirada com o proprietário."
        : "Lembre-se de combinar a entrega com o locatário."}
    </p>
    <div style="text-align:center;">${ctaButton(url, "Ver reserva")}</div>
  `)

  const resend = getResend()
  if (!resend) return
  await Promise.all([
    resend.emails.send({
      from: `ShareO <${FROM}>`, to: borrowerEmail,
      subject: `Lembrete: "${itemTitle}" começa amanhã — ShareO`,
      html: html(borrowerName.split(" ")[0], "borrower"),
    }),
    resend.emails.send({
      from: `ShareO <${FROM}>`, to: ownerEmail,
      subject: `Lembrete: entrega de "${itemTitle}" amanhã — ShareO`,
      html: html(ownerName.split(" ")[0], "owner"),
    }),
  ])
}

/** Lembrete: devolução amanhã — enviado ao locatário */
export async function sendReminderReturnTomorrow(
  borrowerEmail: string, borrowerName: string,
  itemTitle:     string, bookingId:    string,
  endDate:       Date,
): Promise<void> {
  const firstName = borrowerName.split(" ")[0]
  const url       = `${APP_URL}/reservas/${bookingId}`

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      ⏰ Devolução amanhã!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! O prazo de devolução de <strong>${itemTitle}</strong> é
      <strong>${fmtDate(endDate)}</strong>. Combine com o proprietário para evitar taxa de atraso.
    </p>
    <div style="text-align:center;">${ctaButton(url, "Ver reserva")}</div>
    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
      Devoluções após o prazo podem gerar taxas adicionais.
    </p>
  `)

  const resend = getResend()
  if (!resend) return
  await resend.emails.send({
    from: `ShareO <${FROM}>`, to: borrowerEmail,
    subject: `⏰ Devolua "${itemTitle}" amanhã — ShareO`,
    html,
  })
}

export async function sendBookingConfirmedEmail(
  to: string, name: string,
  itemTitle: string, bookingId: string,
  startDate: Date, endDate: Date,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const firstName  = name.split(" ")[0]
  const bookingUrl = `${APP_URL}/reservas/${bookingId}`
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `✅ Reserva confirmada — ${itemTitle}`,
    html:    bookingConfirmedHtml(firstName, itemTitle, startDate, endDate, bookingUrl),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendBookingCancelledEmail(
  to: string, name: string,
  role: "borrower" | "owner",
  itemTitle: string, bookingId: string,
  reason?: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const firstName  = name.split(" ")[0]
  const bookingUrl = `${APP_URL}/reservas/${bookingId}`
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `❌ Reserva cancelada — ${itemTitle}`,
    html:    bookingCancelledHtml(firstName, itemTitle, role, reason, bookingUrl),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendLateFeeEmail(
  to: string, name: string,
  itemTitle: string, bookingId: string,
  lateFeeAmountCents: number, paymentUrl: string,
  allowQueue = true,
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const firstName        = name.split(" ")[0]
  const lateFeeFormatted = formatPrice(lateFeeAmountCents)
  const bookingUrl = `${APP_URL}/reservas/${bookingId}`
  const { error } = await sendWithRetry(resend, {
    from:    `ShareO <${FROM}>`,
    to,
    subject: `🚨 Taxa de atraso — ${itemTitle} — ShareO`,
    html:    lateFeeHtml(firstName, itemTitle, lateFeeFormatted, paymentUrl, bookingUrl),
  }, "late-fee")
  if (error) {
    if (allowQueue) {
      await enqueueEmail(to, "late-fee", { to, name, itemTitle, bookingId, lateFeeAmountCents, paymentUrl })
        .catch((e) => console.error(`[email-queue] falha ao enfileirar late-fee: ${e}`))
    }
    throw new Error(`Resend error: ${error.message}`)
  }
}

function idVerifiedHtml(firstName: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      ✅ Identidade verificada!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! Sua identidade foi verificada com sucesso pela equipe ShareO.
      Agora você pode alugar e anunciar itens com o selo de verificação na sua conta.
    </p>

    <div style="margin-bottom:24px;padding:16px 20px;background:#F0FDF4;border-radius:8px;border:1px solid #BBF7D0;">
      <p style="margin:0;font-size:14px;color:#15803D;">
        <strong>✓ Conta verificada</strong> — Usuários verificados têm maior credibilidade e mais chances de fechar locações.
      </p>
    </div>

    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/perfil`, "Ver meu perfil")}
    </div>
  `)
}

function idRejectedHtml(firstName: string, reason: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#B91C1C;">
      Verificação não aprovada
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! Infelizmente não foi possível verificar sua identidade com os documentos enviados.
    </p>

    <div style="margin-bottom:24px;padding:16px 20px;background:#FFF7ED;border-radius:8px;border:1px solid #FED7AA;">
      <p style="margin:0 0 4px;font-size:12px;font-weight:700;color:#C2410C;text-transform:uppercase;letter-spacing:0.5px;">Motivo</p>
      <p style="margin:0;font-size:14px;color:#C2410C;">${reason}</p>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#475569;line-height:1.6;">
      Você pode reenviar seus documentos corrigindo o problema indicado acima.
      Certifique-se de que a foto está nítida e o documento está válido e legível.
    </p>

    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/perfil/documentos`, "Reenviar documentos")}
    </div>

    <p style="margin:20px 0 0;font-size:12px;color:#94A3B8;">
      Se acredita que houve um engano, entre em contato com nosso suporte.
    </p>
  `)
}

export async function sendIdVerifiedEmail(to: string, name: string): Promise<void> {
  const resend = getResend()
  if (!resend) return
  // Vazio quando o lead não informou nome — o template omite a saudação.
  const firstName = name.trim().split(" ")[0]
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "✅ Sua identidade foi verificada — ShareO",
    html:    idVerifiedHtml(firstName),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendIdRejectedEmail(to: string, name: string, reason: string): Promise<void> {
  const resend = getResend()
  if (!resend) return
  // Vazio quando o lead não informou nome — o template omite a saudação.
  const firstName = name.trim().split(" ")[0]
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Verificação de identidade — ShareO",
    html:    idRejectedHtml(firstName, reason),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

/** Exportado para teste: a saudação é a primeira frase que o Fundador lê. */
export function founderWelcomeHtml(firstName: string, queuePosition: number, unsubUrl: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      ${firstName ? `Você está na lista, ${firstName}!` : "Você está na lista!"}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Você é o <strong>#${queuePosition}°</strong> interessado a entrar na lista de fundadores.
      A abertura é feita <strong>por cidade</strong>: as regiões com mais interessados entram
      primeiro, e avisamos você em primeira mão quando chegar a sua — antes de qualquer
      anúncio público.
    </p>

    <div style="margin-bottom:24px;padding:16px 20px;background:#F0FDF4;border-radius:8px;border:1px solid #BBF7D0;">
      <p style="margin:0;font-size:14px;color:#15803D;line-height:1.5;">
        <strong>O que esperar:</strong> Um e-mail com link de acesso exclusivo quando o ShareO
        abrir na sua cidade. Nenhum spam até lá.
      </p>
    </div>

    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
      Não quer mais receber?
      <a href="${unsubUrl}" style="color:#007B3C;">Cancelar inscrição</a>
      — um clique, sem precisar responder. Dúvidas de privacidade:
      <a href="mailto:privacidade@shareo.com.br" style="color:#007B3C;">privacidade@shareo.com.br</a>.
    </p>
  `)
}

export async function sendFounderWelcomeEmail(
  to: string,
  name: string,
  queuePosition: number,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  // Vazio quando o lead não informou nome — o template omite a saudação.
  const firstName = name.trim().split(" ")[0]
  const unsubUrl  = unsubscribeUrl(APP_URL, to)
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `Você é o #${queuePosition}° na lista de fundadores do ShareO!`,
    html:    founderWelcomeHtml(firstName, queuePosition, unsubUrl),
    // RFC 8058 — descadastro em um clique. Exigido pelas regras de bulk sender
    // do Gmail/Yahoo para remetentes de volume, que é o caso da campanha nacional.
    // Sem estes headers o provedor tende a classificar como spam.
    headers: {
      "List-Unsubscribe":      `<${unsubUrl}>, <mailto:privacidade@shareo.com.br?subject=unsubscribe>`,
      "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
    },
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

function founderInviteHtml(firstName: string, setPasswordUrl: string) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      Bem-vindo ao piloto do ShareO, ${firstName}!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Sua vaga no piloto está confirmada. Para começar a explorar, defina sua senha de acesso
      no primeiro acesso — leva menos de um minuto.
    </p>

    <div style="text-align:center;">
      ${ctaButton(setPasswordUrl, "Definir minha senha")}
    </div>

    <p style="margin:20px 0 0;font-size:13px;color:#64748B;line-height:1.6;">
      Depois de entrar, você poderá navegar livremente. Pediremos seu CPF e endereço apenas
      quando quiser anunciar ou alugar um item.
    </p>

    <p style="margin:16px 0 0;font-size:13px;color:#64748B;line-height:1.6;">
      💚 <strong>Convide amigos:</strong> ao entrar, gere seu link de indicação e compartilhe.
      A cada locação de quem você indicar, você acumula uma parte da nossa taxa.
    </p>

    <p style="margin:16px 0 0;font-size:12px;color:#94A3B8;line-height:1.6;">
      Se você não solicitou este convite, ignore este e-mail. O link expira em 14 dias.
    </p>
  `)
}

/** Convite-piloto: cria a conta do interessado e o leva a definir a senha no 1º acesso. */
export async function sendFounderInviteEmail(
  to: string,
  name: string,
  token: string,
  allowQueue = true,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName      = name.split(" ")[0]
  const setPasswordUrl = `${APP_URL}/definir-senha/${token}`

  const { error } = await sendWithRetry(resend, {
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Seu acesso ao piloto do ShareO — defina sua senha",
    html:    founderInviteHtml(firstName, setPasswordUrl),
  }, "founder-invite")

  if (error) {
    if (allowQueue) {
      await enqueueEmail(to, "founder-invite", { to, name, token })
        .catch((e) => console.error(`[email-queue] falha ao enfileirar founder-invite: ${e}`))
    }
    throw new Error(`Resend error: ${error.message}`)
  }
}

/** Devolução em andamento — avisa o LOCADOR que o locatário iniciou a devolução e precisa de confirmação */
export async function sendReturnInProgressEmail(
  ownerEmail:   string, ownerName:    string,
  borrowerName: string, itemTitle:    string,
  bookingId:    string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName     = ownerName.split(" ")[0]
  const borrowerFirst = borrowerName.split(" ")[0]
  const bookingUrl    = `${APP_URL}/reservas/${bookingId}`

  const html = baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      🔄 Devolução em andamento
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! <strong>${borrowerFirst}</strong> iniciou a devolução de
      <strong>${itemTitle}</strong>. Confira o item e confirme o recebimento para concluir a locação.
    </p>
    <div style="text-align:center;">${ctaButton(bookingUrl, "Confirmar recebimento")}</div>
    <p style="margin:20px 0 0;font-size:13px;color:#64748B;line-height:1.6;">
      A locação só é concluída após a <strong>sua confirmação</strong> do recebimento.
    </p>
  `)

  const { error } = await sendWithRetry(resend, {
    from:    `ShareO <${FROM}>`,
    to:      ownerEmail,
    subject: `🔄 Devolução em andamento — ${itemTitle}`,
    html,
  }, "return-in-progress")

  if (error) throw new Error(`Resend error: ${error.message}`)
}

/** Devolução confirmada — avisa AMBAS as partes que a locação foi concluída */
export async function sendReturnCompletedEmail(
  borrowerEmail: string, borrowerName: string,
  ownerEmail:    string, ownerName:    string,
  itemTitle:     string, bookingId:    string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const url  = `${APP_URL}/reservas/${bookingId}`
  const html = (firstName: string, role: "borrower" | "owner") => baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#15803D;">
      ✅ Devolução confirmada
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! ${role === "owner"
        ? `Você confirmou o recebimento de <strong>${itemTitle}</strong>. A locação está concluída.`
        : `O proprietário confirmou o recebimento de <strong>${itemTitle}</strong>. A locação está concluída.`}
      ${role === "borrower" ? " Que tal avaliar a experiência?" : ""}
    </p>
    <div style="text-align:center;">${ctaButton(url, "Ver reserva")}</div>
  `)

  await Promise.all([
    resend.emails.send({
      from: `ShareO <${FROM}>`, to: borrowerEmail,
      subject: `✅ Devolução confirmada — ${itemTitle}`,
      html: html(borrowerName.split(" ")[0], "borrower"),
    }),
    resend.emails.send({
      from: `ShareO <${FROM}>`, to: ownerEmail,
      subject: `✅ Devolução confirmada — ${itemTitle}`,
      html: html(ownerName.split(" ")[0], "owner"),
    }),
  ])
}

/** Lembrete: item em atraso — enviado ao locatário e ao locador */
export async function sendReminderOverdue(
  borrowerEmail:    string, borrowerName: string,
  ownerEmail:       string, ownerName:    string,
  itemTitle:        string, bookingId:    string,
  endDate:          Date,   daysLate:     number,
  dailyPriceCents:  number,
  lateFeeMultiplier = 1.5,
): Promise<void> {
  const url     = `${APP_URL}/reservas/${bookingId}`
  const lateFee = formatPrice(Math.round(dailyPriceCents * lateFeeMultiplier * daysLate))

  const html = (firstName: string, role: "borrower" | "owner") => baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#B91C1C;">
      🚨 Item em atraso — ${daysLate} dia${daysLate > 1 ? "s" : ""}
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Olá, ${firstName}! O prazo de devolução de <strong>${itemTitle}</strong> era
      <strong>${fmtDate(endDate)}</strong>. ${role === "borrower"
        ? `O item está em atraso há <strong>${daysLate} dia${daysLate > 1 ? "s" : ""}</strong>. Taxa de atraso estimada: <strong>${lateFee}</strong>.`
        : `O locatário ainda não devolveu o item (${daysLate} dia${daysLate > 1 ? "s" : ""} de atraso). Taxa de atraso estimada: <strong>${lateFee}</strong>.`}
    </p>
    <div style="text-align:center;">${ctaButton(url, "Ver reserva")}</div>
  `)

  const resend = getResend()
  if (!resend) return
  await Promise.all([
    resend.emails.send({
      from: `ShareO <${FROM}>`, to: borrowerEmail,
      subject: `🚨 "${itemTitle}" em atraso — devolva agora — ShareO`,
      html: html(borrowerName.split(" ")[0], "borrower"),
    }),
    resend.emails.send({
      from: `ShareO <${FROM}>`, to: ownerEmail,
      subject: `🚨 Item "${itemTitle}" não devolvido (${daysLate}d de atraso) — ShareO`,
      html: html(ownerName.split(" ")[0], "owner"),
    }),
  ])
}
