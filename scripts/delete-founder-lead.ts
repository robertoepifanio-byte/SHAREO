import { makePrisma } from './lib/sim-shared'

const prisma = makePrisma()

/**
 * Remove UM lead da lista de fundadores, por e-mail.
 *
 * Para que serve: validar a captação ponta a ponta no ambiente publicado exige
 * enviar o formulário de verdade, e isso grava um lead real. O CEP dele entra na
 * contagem que decide qual cidade-piloto abre primeiro, e ele conta na prova
 * social da landing — então o lead de teste precisa sair depois.
 *
 * ── Por que o padrão é soft delete ───────────────────────────────────────────
 *
 * Marcar `deletedAt` resolve o problema INTEIRO, porque é assim que todos os
 * consumidores que importam já perguntam pela lista:
 *
 *   app/api/founders/stats/route.ts          prova social  (deletedAt: null)
 *   app/api/admin/founders/export/route.ts   agregado por cidade/UF
 *   app/api/admin/founders/invite/route.ts   convite da cidade-piloto
 *
 * O lead some da contagem, da escolha da cidade-piloto e nunca recebe convite —
 * sem destruir registro. `--definitivo` existe para o caso em que a exclusão é o
 * objetivo em si (pedido de eliminação sob a LGPD, art. 18, VI), e só então.
 *
 * 🪤 O hard delete deixa `FounderAuditLog` órfão: `leadId` é `String?` sem
 * chave estrangeira, então a trilha do lead sobrevive apontando para um id que
 * não existe mais.
 *
 * ── Uso ─────────────────────────────────────────────────────────────────────
 *
 * A credencial vem do arquivo de ambiente, nunca por argumento — comando com
 * senha dentro fica gravado em texto puro no histórico:
 *
 *   node --env-file=.env.prod-run --import tsx scripts/delete-founder-lead.ts <email>
 *
 * Sem `--confirmar` ele só mostra o que achou. Para efetivar, repita o e-mail:
 *
 *   ... <email> --confirmar=<email>
 *
 * Repetir o e-mail não é burocracia: o erro provável aqui é seta-pra-cima no
 * histórico, trocar o endereço e deixar o `--confirmar` colado no fim.
 */

/** Host e ref do projeto, sem credencial — o `user:senha@` fica de fora. */
function bancoAlvo(): string {
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL
  if (!url) return 'nenhum (DATABASE_URL não definida)'
  const host = url.replace(/^[a-z]+:\/\/[^@]*@/i, '').split(/[/?]/)[0]
  const ref = url.match(/[a-z]{20}/)?.[0]
  return ref ? `${host} (projeto ${ref})` : host
}

async function main() {
  const args = process.argv.slice(2)
  const email = args.find((a) => !a.startsWith('--'))
  const confirmado = args.find((a) => a.startsWith('--confirmar='))?.split('=')[1]
  const definitivo = args.includes('--definitivo')

  if (!email) {
    throw new Error(
      'Uso: node --env-file=<arquivo> --import tsx scripts/delete-founder-lead.ts <email> [--confirmar=<email>] [--definitivo]',
    )
  }

  // Antes de qualquer coisa: em qual banco estamos. A regra do projeto é dizer o
  // ambiente esperado ANTES de agir — trocar staging por produção aqui é
  // irreversível, e a mensagem de erro sozinha não mostra onde o script bateu.
  console.log(`Banco: ${bancoAlvo()}`)

  const lead = await prisma.founderLead.findUnique({ where: { email } })

  if (!lead) {
    throw new Error(
      `Nenhum lead com o e-mail ${email} neste banco. ` +
        'A campanha publicada posta em shareo-prod — confira se o arquivo de ambiente é o de produção.',
    )
  }

  console.log(lead)

  const modo = definitivo ? 'APAGAR DEFINITIVAMENTE' : 'marcar como removido (deletedAt)'

  if (confirmado !== email) {
    console.log(
      `\nNada foi alterado — modo de conferência.\n` +
        `Ação que seria executada: ${modo}.\n` +
        `Para executar: repita o comando com --confirmar=${email}` +
        (definitivo ? ' --definitivo' : ''),
    )
    return
  }

  if (definitivo) {
    await prisma.founderLead.delete({ where: { id: lead.id } })
    console.log(`\n✅ Lead ${email} APAGADO definitivamente.`)
  } else {
    await prisma.$transaction([
      prisma.founderLead.update({
        where: { id: lead.id },
        data: { deletedAt: new Date() },
      }),
      // Mesma trilha que a rota de captação escreve no LEAD_CREATED. Operação em
      // produção sem rastro é o que torna impossível explicar, semanas depois,
      // por que a contagem caiu.
      prisma.founderAuditLog.create({
        data: {
          leadId: lead.id,
          action: 'REMOVED',
          metadata: { email, motivo: 'lead de teste', via: 'scripts/delete-founder-lead.ts' },
        },
      }),
    ])
    console.log(`\n✅ Lead ${email} marcado como removido.`)
  }

  const ativos = await prisma.founderLead.count({ where: { deletedAt: null } })
  console.log(`Leads ativos na lista: ${ativos} (é este número que a prova social usa).`)
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
