/**
 * Classificadores de falha do /api/health.
 *
 * Vivem fora do route.ts por duas razões: o App Router recusa export
 * desconhecido em arquivo de rota (então o do banco ficava sem teste), e é
 * daqui que sai a única informação de diagnóstico disponível em produção — a
 * mensagem crua é restrita a dev (S14-MIN-07).
 */

/**
 * Código curto e estável da falha, seguro para expor em produção.
 *
 * A mensagem crua do Prisma carrega hostname/driver e fica restrita a dev
 * (S14-MIN-07), mas o CÓDIGO não identifica infraestrutura nenhuma — e é ele
 * que diz o que consertar:
 *   P1013 → connection string malformada (sobrou `VAR=` ou aspas no valor)
 *   P1000 → senha incorreta
 *   P1001 → não alcançou o servidor (host/porta)
 *   P2021 → tabela não existe (migrations não rodaram)
 *   NO_DATABASE_URL → variável vazia no runtime (escopo errado / Sensitive)
 *
 * Sem isso, um `db: "error"` obriga a adivinhar entre cinco causas distintas —
 * o que já custou horas de diagnóstico em dois ambientes.
 */
export function codigoDeFalha(e: unknown): string {
  const err = e as { name?: string; code?: string; errorCode?: string; message?: string }
  const msg = err?.message ?? String(e)
  if (msg.includes("DATABASE_URL not configured")) return "NO_DATABASE_URL"
  const code = err?.code ?? err?.errorCode
  if (typeof code === "string" && code.length > 0) return code
  const m = msg.match(/\bP\d{4}\b/)
  if (m) return m[0]

  // Sem código conhecido: devolve tipo + as linhas ÚTEIS da mensagem, com
  // credencial removida. O Prisma abre com um cabeçalho genérico
  // ("Invalid `prisma.x()` invocation:") e só depois diz a causa — pegar a
  // primeira linha não ajudava.
  const util = msg
    .split("\n")
    .map((l) => l.trim())
    .filter((l) =>
      l.length > 0 &&
      !/^Invalid `.*` invocation/.test(l) &&
      !l.startsWith("-->") &&
      !/^\d+\s*\|/.test(l),
    )
    .join(" · ")
    // Remove só a parte de credencial (user:senha@). NÃO substituir a menção
    // literal a "postgresql://" — a mensagem mais útil do Prisma é justamente
    // "the URL must start with the protocol `postgresql://`", e escrubá-la
    // esconderia a causa que se quer diagnosticar.
    .replace(/\/\/[^@\s/]*:[^@\s/]*@/g, "//***:***@")
  return `${err?.name ?? "Error"}: ${util.slice(0, 240)}`
}

/**
 * Código estável para falha de Storage, com vocabulário FECHADO.
 *
 * O `db` já tinha isso (códigos do Prisma); o Storage não, e `storage: "error"`
 * sozinho não separa causas que pedem consertos opostos: criar bucket no
 * Supabase, corrigir variável na Vercel, ou investigar rede. Em 31/08/2026 isso
 * deixou a produção `degraded` sem meio de diagnosticar de fora.
 *
 * Diferente de `codigoDeFalha`, aqui NÃO cai para a mensagem crua: o texto do
 * supabase-js pode carregar a URL do projeto, e este código é exposto em
 * produção. Sem correspondência, devolve DESCONHECIDO — a mensagem completa
 * continua em `errors`, fora de produção.
 */
export type StorageCode =
  | "NO_SUPABASE_URL"
  | "NO_SERVICE_ROLE_KEY"
  | "BUCKET_NOT_FOUND"
  | "BAD_SERVICE_ROLE_KEY"
  | "UNREACHABLE"
  | "DESCONHECIDO"

export function codigoDeFalhaStorage(e: unknown): StorageCode | `DESCONHECIDO: ${string}` {
  const msg = e instanceof Error ? e.message : String(e)
  // As duas primeiras vêm do supabase-js quando o `!` de createAdminClient
  // encontra env vazia — o mesmo modo de falha que derrubou a AUTH_SECRET.
  if (/supabaseUrl is required/i.test(msg))                    return "NO_SUPABASE_URL"
  if (/supabaseKey is required/i.test(msg))                    return "NO_SERVICE_ROLE_KEY"
  if (/bucket not found/i.test(msg))                           return "BUCKET_NOT_FOUND"
  if (/invalid (api )?key|jwt|unauthorized|signature/i.test(msg)) return "BAD_SERVICE_ROLE_KEY"
  if (/fetch failed|ENOTFOUND|ECONNREFUSED|timeout/i.test(msg)) return "UNREACHABLE"
  // Sem correspondencia, devolve a MENSAGEM sem identificador de infra.
  //
  // A primeira versao devolvia so "DESCONHECIDO", e em 01/09/2026 foi
  // exatamente o que a producao respondeu: um rotulo tao pouco informativo
  // quanto o `storage: "error"` que ele existia para explicar. Vocabulario
  // fechado so ajuda enquanto cobre os casos reais; quando nao cobre, esconder
  // a mensagem nao protege nada — atrasa o diagnostico.
  //
  // O escrub remove o que a revisao de seguranca queria fora daqui: URL, host
  // de projeto e e-mail. O texto restante do supabase-js nao identifica infra.
  return `DESCONHECIDO: ${limpaInfra(msg)}`
}

/** Remove URL, host e e-mail; corta em 200 chars. */
function limpaInfra(msg: string): string {
  return msg
    .replace(/https?:\/\/[^\s"']+/gi, "[url]")
    .replace(/\b[\w-]+\.(supabase\.(co|in)|vercel\.app|amazonaws\.com)\b/gi, "[host]")
    .replace(/\b[\w.+-]+@[\w.-]+\.\w+\b/g, "[email]")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200)
}
