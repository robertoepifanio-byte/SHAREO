import { Resend } from "resend"

const hasResendKey =
  typeof process.env.RESEND_API_KEY === "string" &&
  process.env.RESEND_API_KEY.length > 0

// Inicialização lazy: evita erro de build quando RESEND_API_KEY não está no ambiente de CI
let _resend: Resend | null = null
function getResend(): Resend | null {
  if (!hasResendKey) return null
  if (!_resend) _resend = new Resend(process.env.RESEND_API_KEY)
  return _resend
}

const FROM    = process.env.EMAIL_FROM    ?? "noreply@shareo.com.br"
const APP_URL = process.env.NEXTAUTH_URL  ?? "https://shareo-rouge.vercel.app"

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

function welcomeHtml(name: string) {
  const firstName = name.split(" ")[0]
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      Bem-vindo ao ShareO, ${firstName}! 🎉
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Sua conta foi criada com sucesso. Agora você pode alugar o que precisa ou
      anunciar o que tem parado em casa — tudo de forma simples e segura.
    </p>

    <div style="text-align:center;">
      ${ctaButton(`${APP_URL}/itens`, "Explorar itens disponíveis")}
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:28px;border-top:1px solid #E2E8F0;padding-top:24px;">
      <tr>
        <td style="padding:0 0 16px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#003366;">📦 Anuncie seu item</p>
          <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
            Tem uma furadeira, câmera ou barraca parada? Anuncie em minutos e comece a ganhar.
          </p>
        </td>
      </tr>
      <tr>
        <td style="padding:0 0 16px;">
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#003366;">🔍 Encontre o que precisa</p>
          <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
            Filtre por categoria, preço e localização. Fale diretamente com o proprietário pelo chat.
          </p>
        </td>
      </tr>
      <tr>
        <td>
          <p style="margin:0 0 4px;font-size:14px;font-weight:700;color:#003366;">⭐ Avalie e construa reputação</p>
          <p style="margin:0;font-size:13px;color:#64748B;line-height:1.5;">
            Após cada locação, avalie a experiência. Uma boa reputação abre mais oportunidades.
          </p>
        </td>
      </tr>
    </table>
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
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName = name.split(" ")[0]
  const resetUrl  = `${APP_URL}/esqueci-senha/${token}`

  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Redefinir sua senha — ShareO",
    html:    passwordResetHtml(firstName, resetUrl),
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName = name.split(" ")[0]

  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `Bem-vindo ao ShareO, ${firstName}!`,
    html:    welcomeHtml(name),
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendVerificationEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const resend = getResend()
  if (!resend) return

  const firstName  = name.split(" ")[0]
  const verifyUrl  = `${APP_URL}/verify-email?token=${token}`

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

  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Confirme seu e-mail no ShareO",
    html,
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

// ─── Lembretes automáticos ────────────────────────────────────────────────────

function fmtDate(d: Date) {
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "long", year: "numeric" }).format(d)
}

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
): Promise<void> {
  const resend = getResend()
  if (!resend) return
  const firstName       = name.split(" ")[0]
  const lateFeeFormatted = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
    .format(lateFeeAmountCents / 100)
  const bookingUrl = `${APP_URL}/reservas/${bookingId}`
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `🚨 Taxa de atraso — ${itemTitle} — ShareO`,
    html:    lateFeeHtml(firstName, itemTitle, lateFeeFormatted, paymentUrl, bookingUrl),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
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
  const firstName = name.split(" ")[0]
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
  const firstName = name.split(" ")[0]
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Verificação de identidade — ShareO",
    html:    idRejectedHtml(firstName, reason),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
}

function founderWelcomeHtml(firstName: string, queuePosition: number) {
  return baseLayout(`
    <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#003366;">
      Você está na lista, ${firstName}!
    </h1>
    <p style="margin:0 0 20px;font-size:15px;color:#475569;line-height:1.6;">
      Você é o <strong>#${queuePosition}°</strong> na lista de fundadores do ShareO.
      Avisaremos você em primeira mão quando abrirmos — antes de qualquer anúncio público.
    </p>

    <div style="margin-bottom:24px;padding:16px 20px;background:#F0FDF4;border-radius:8px;border:1px solid #BBF7D0;">
      <p style="margin:0;font-size:14px;color:#15803D;line-height:1.5;">
        <strong>O que esperar:</strong> Um e-mail com link de acesso exclusivo assim que o ShareO
        abrir. Nenhum spam até lá.
      </p>
    </div>

    <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.6;">
      Para sair da lista a qualquer momento, envie um e-mail para
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

  const firstName = name.split(" ")[0]
  const { error } = await resend.emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `Você é o #${queuePosition}° na lista de fundadores do ShareO!`,
    html:    founderWelcomeHtml(firstName, queuePosition),
  })
  if (error) throw new Error(`Resend error: ${error.message}`)
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
  const url       = `${APP_URL}/reservas/${bookingId}`
  const lateFee   = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                      .format((dailyPriceCents * lateFeeMultiplier * daysLate) / 100)

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
