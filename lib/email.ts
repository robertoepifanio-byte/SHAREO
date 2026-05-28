import { Resend } from "resend"

// Inicialização lazy: evita erro de build quando RESEND_API_KEY não está no ambiente de CI
let _resend: Resend | null = null
function getResend(): Resend {
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

// ─── Funções públicas ──────────────────────────────────────────────────────────

export async function sendPasswordResetEmail(
  to: string,
  name: string,
  token: string,
): Promise<void> {
  const firstName = name.split(" ")[0]
  const resetUrl  = `${APP_URL}/esqueci-senha/${token}`

  const { error } = await getResend().emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: "Redefinir sua senha — ShareO",
    html:    passwordResetHtml(firstName, resetUrl),
  })

  if (error) throw new Error(`Resend error: ${error.message}`)
}

export async function sendWelcomeEmail(to: string, name: string): Promise<void> {
  const firstName = name.split(" ")[0]

  const { error } = await getResend().emails.send({
    from:    `ShareO <${FROM}>`,
    to,
    subject: `Bem-vindo ao ShareO, ${firstName}!`,
    html:    welcomeHtml(name),
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

  await Promise.all([
    getResend().emails.send({
      from: `ShareO <${FROM}>`, to: borrowerEmail,
      subject: `Lembrete: "${itemTitle}" começa amanhã — ShareO`,
      html: html(borrowerName.split(" ")[0], "borrower"),
    }),
    getResend().emails.send({
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

  await getResend().emails.send({
    from: `ShareO <${FROM}>`, to: borrowerEmail,
    subject: `⏰ Devolua "${itemTitle}" amanhã — ShareO`,
    html,
  })
}

/** Lembrete: item em atraso — enviado ao locatário e ao locador */
export async function sendReminderOverdue(
  borrowerEmail: string, borrowerName: string,
  ownerEmail:    string, ownerName:    string,
  itemTitle:     string, bookingId:    string,
  endDate:       Date,   daysLate:     number,
  dailyPriceCents: number,
): Promise<void> {
  const url       = `${APP_URL}/reservas/${bookingId}`
  const lateFee   = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" })
                      .format((dailyPriceCents * 1.5 * daysLate) / 100)

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

  await Promise.all([
    getResend().emails.send({
      from: `ShareO <${FROM}>`, to: borrowerEmail,
      subject: `🚨 "${itemTitle}" em atraso — devolva agora — ShareO`,
      html: html(borrowerName.split(" ")[0], "borrower"),
    }),
    getResend().emails.send({
      from: `ShareO <${FROM}>`, to: ownerEmail,
      subject: `🚨 Item "${itemTitle}" não devolvido (${daysLate}d de atraso) — ShareO`,
      html: html(ownerName.split(" ")[0], "owner"),
    }),
  ])
}
