export const meta = {
  name: 'shareo-painel-auditoria',
  description: 'Painel read-only de especialistas ShareO (designer/qa/segurança/arquiteto/PO) com verificação adversarial dos achados',
  whenToUse: 'Quando o usuário pedir "delegue aos especialistas", auditoria multi-eixo, revisão crítica de uma feature/área, ou triagem de pendências.',
  phases: [
    { title: 'Revisão', detail: 'um especialista por eixo, read-only' },
    { title: 'Verificação', detail: 'refutação adversarial de cada achado' },
  ],
}

// args: string descrevendo o escopo (ex.: "fluxo de reserva no app mobile" ou "PR #212").
// Sem args, o painel audita o estado geral do repositório.
const escopo = (typeof args === 'string' && args.trim()) ? args.trim() : 'estado geral do repositório ShareO (web + apps/mobile)'

const FINDINGS_SCHEMA = {
  type: 'object',
  required: ['findings'],
  properties: {
    findings: {
      type: 'array',
      items: {
        type: 'object',
        required: ['titulo', 'descricao', 'severidade', 'arquivo'],
        properties: {
          titulo: { type: 'string' },
          descricao: { type: 'string', description: 'sintoma + causa provável + evidência (arquivo:linha)' },
          severidade: { type: 'string', enum: ['critico', 'alto', 'medio', 'baixo'] },
          arquivo: { type: 'string', description: 'caminho relativo do arquivo principal' },
          correcao: { type: 'string', description: 'o que fazer, em 1-2 frases' },
        },
      },
    },
  },
}

const VERDICT_SCHEMA = {
  type: 'object',
  required: ['refutado', 'justificativa'],
  properties: {
    refutado: { type: 'boolean' },
    justificativa: { type: 'string' },
    severidadeAjustada: { type: 'string', enum: ['critico', 'alto', 'medio', 'baixo'] },
  },
}

const CONTEXTO_COMUM = `
Projeto: ShareO — marketplace de aluguel local (Next.js 15 App Router + Prisma + Supabase + Expo/RN em apps/mobile).
REGRAS INVIOLÁVEIS DO PROJETO (não reportar como problema o que é decisão registrada):
- RLS é DESABILITADO por design (PgBouncer); segurança é via guards server-side (ownerId !== session.user.id → 403).
- Taxa da plataforma é dinâmica via getPlatformFeeRate() — nunca sugerir hardcode.
- App mobile TRANSCREVE o site em 375px (regra do fundador) — divergência do site É bug; "melhoria" que diverge do site NÃO é correção.
- O site é sub-WCAG em pontos conhecidos (badges, verde claro #59C686) — paridade > correção no app.
- D4 (jurídico) bloqueia produção — nada de go-live.
- Design system v2: navy #003366, verde #007B3C, off-white #F8FAFC, Montserrat.
Sua revisão é READ-ONLY: não edite nenhum arquivo. Retorne apenas os achados no schema pedido.
Escopo desta auditoria: `

const EIXOS = [
  { key: 'design', agentType: 'designer-shareo', foco: 'fidelidade visual ao design system v2 e ao site em 375px, estados de UI, tap targets 44px, tokens vs hex hardcoded' },
  { key: 'qa', agentType: 'qa-shareo', foco: 'fluxos críticos (busca→reserva→pagamento→devolução), regressões, cobertura de testes, rótulos exatos nos testes RNTL' },
  { key: 'seguranca', agentType: 'seguranca-shareo', foco: 'OWASP (IDOR, XSS, auth), PII em logs, guards server-side, rotas Bearer usando resolveUserId, secrets em código' },
  { key: 'arquitetura', agentType: 'arquiteto-shareo', foco: 'Server vs Client Components, duplicação (DRY — eixo que auditorias anteriores não pegaram), padrões Prisma, fire-and-forget no Vercel' },
  { key: 'produto', agentType: 'product-owner-shareo', foco: 'promessas de UI não implementadas, textos incorretos (taxa, cidade default), fluxos que redirecionam app→site, gaps vs backlog' },
]

phase('Revisão')
log(`Painel de auditoria sobre: ${escopo}`)

const resultados = await pipeline(
  EIXOS,
  (eixo) => agent(
    `${CONTEXTO_COMUM}${escopo}\n\nSeu eixo de revisão: ${eixo.foco}.\nInvestigue o código de verdade (Read/Grep/Glob) — não especule. Cada achado precisa de evidência arquivo:linha. Máximo 8 achados, os mais relevantes.`,
    { label: `revisar:${eixo.key}`, phase: 'Revisão', schema: FINDINGS_SCHEMA, agentType: eixo.agentType }
  ),
  (resultado, eixo) => {
    if (!resultado || !resultado.findings || !resultado.findings.length) return []
    return parallel(resultado.findings.map((f) => () =>
      agent(
        `${CONTEXTO_COMUM}${escopo}\n\nTente REFUTAR este achado de auditoria (eixo ${eixo.key}). Ele é real, reproduzível e ainda existe no código atual? Verifique o arquivo citado. Se for decisão registrada do projeto (ver regras acima), falso positivo já conhecido, ou já corrigido, refute. Na dúvida, refutado=true.\n\nAchado: ${f.titulo}\n${f.descricao}\nArquivo: ${f.arquivo}`,
        { label: `verificar:${f.titulo.slice(0, 40)}`, phase: 'Verificação', schema: VERDICT_SCHEMA }
      ).then((v) => ({ ...f, eixo: eixo.key, verdict: v }))
    ))
  }
)

const todos = resultados.filter(Boolean).flat().filter(Boolean)
const confirmados = todos.filter((f) => f.verdict && !f.verdict.refutado)
  .map((f) => ({ ...f, severidade: (f.verdict.severidadeAjustada || f.severidade) }))
const refutados = todos.length - confirmados.length

const ordem = { critico: 0, alto: 1, medio: 2, baixo: 3 }
confirmados.sort((a, b) => (ordem[a.severidade] ?? 9) - (ordem[b.severidade] ?? 9))

log(`${confirmados.length} achados confirmados (${refutados} refutados na verificação adversarial)`)
return { escopo, confirmados, totalBrutos: todos.length, refutados }
