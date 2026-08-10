/**
 * Modo de pré-lançamento — campanha nacional de captação de interessados.
 *
 * Com a flag ligada, o site serve APENAS a landing de captação (+ legais, auth e
 * admin); todo o resto do marketplace é redirecionado para "/". Serve para rodar
 * a campanha que decide a(s) cidade(s)-piloto sem expor um marketplace vazio.
 *
 * ⚠️ ESTE ARQUIVO NÃO PODE IMPORTAR NADA.
 * Ele é consumido pelo `middleware.ts` (Edge runtime), por Server Components e
 * pelo bundle do cliente. Importar `@/lib/prisma` (como faz `lib/platform-config.ts`)
 * quebraria o build do Edge — por isso a flag é uma env var inlinada em build-time
 * e não uma chave do PlatformConfig.
 *
 * Consequência aceita: virar a flag exige redeploy (~3 min pelo pipeline atual).
 * O ganho é que middleware, RSC, nav, robots e sitemap enxergam exatamente o mesmo
 * valor — com duas fontes distintas eles poderiam discordar e o site ficaria
 * meio-gateado (páginas bloqueadas mas nav ainda linkando pra elas, ou vice-versa).
 *
 * ⚠️ No Vercel, NUNCA marcar NEXT_PUBLIC_PRELAUNCH_MODE como "Sensitive":
 * `vercel pull` não decripta vars Sensitive e o valor chega VAZIO no build,
 * desligando o gate inteiro em silêncio. Ver CLAUDE.md.
 */

export const PRELAUNCH_ENABLED = process.env.NEXT_PUBLIC_PRELAUNCH_MODE === "true"

/** Staging não pode ser indexado — senão o Google racha autoridade com shareo.com.br. */
export const NOINDEX_ENABLED = process.env.NEXT_PUBLIC_NOINDEX === "true"

/** Rotas liberadas por correspondência exata. */
const ALLOW_EXACT = new Set([
  "/",
  "/robots.txt",
  "/sitemap.xml",
  "/manifest.webmanifest",
  "/sw.js",
])

/**
 * Rotas liberadas por prefixo de segmento.
 *
 * `/cadastro` está FORA de propósito: o signup público fica fechado durante a
 * campanha (a captação é o formulário de interessados, não uma conta).
 * `/login` fica dentro para a equipe conseguir entrar e validar o ambiente.
 */
const ALLOW_PREFIX = [
  // A campanha em si
  "/pilotos",

  // Legais — exigidos pela LGPD e pela revisão de anúncios do Meta/Google
  // (landing sem link de política de privacidade é reprovada).
  "/termos",
  "/privacidade",
  "/politicas",

  // Auth: e-mails transacionais apontam para cá. `sendFounderInviteEmail` manda
  // para /definir-senha/[token] e o reset para /esqueci-senha/[token] — sem isso
  // TODO convite de piloto morreria na home.
  "/login",
  "/sair",

  // /dashboard NÃO é conteúdo de campanha — está aqui para quebrar um ciclo de
  // redirecionamento. O middleware manda para /dashboard quem tenta /admin sem
  // ser ADMIN, e também quem abre /login já logado. Com /dashboard bloqueado,
  // as duas rotas terminavam na landing:
  //
  //   /admin/... → (role ≠ ADMIN) → /dashboard → (gate) → landing
  //   /login     → (já logado)    → /dashboard → (gate) → landing
  //
  // O efeito é que um usuário logado como não-admin não conseguia nem VER o
  // formulário de login para trocar de conta — a única saída era /sair, que
  // depende de JS. Aconteceu com o fundador em 07/08 ao tentar abrir o painel.
  //
  // Liberar aqui não expõe nada: a própria página exige sessão.
  "/dashboard",
  "/esqueci-senha",
  "/definir-senha",
  "/verify-email",
  "/bem-vindo",

  // Admin — o guard de role existente continua valendo por cima disto.
  "/admin",
  "/api/admin",

  // APIs que precisam continuar vivas
  "/api/founders",
  "/api/auth",
  "/api/health",
  "/api/cron",

  // Estáticos servidos fora de /_next.
  //
  // ⚠️ Precisam estar aqui: o `matcher` do middleware só isenta `_next/static`,
  // `_next/image`, `favicon.ico` e `images/` — todo o resto de public/ passa
  // pelo gate. Um asset fora desta lista recebe 307 para "/" e a imagem quebra
  // silenciosamente (o navegador só mostra o alt). Ao criar pasta nova em
  // public/ que a landing use, acrescentar aqui E cobrir no teste.
  "/logos",
  "/icons",
  "/fonts",
  "/favicon",
  "/campanha",   // banners da campanha de pré-lançamento
  "/opengraph-image",
  "/apple-icon",
  "/_vercel",
]

/**
 * `true` se a rota continua acessível durante o pré-lançamento.
 *
 * A comparação é por SEGMENTO (`=== p` ou `startsWith(p + "/")`), nunca
 * `startsWith(p)` puro — senão `/loginfake`, `/adminx` e `/pilotosX` passariam.
 */
export function isPrelaunchAllowed(pathname: string): boolean {
  if (ALLOW_EXACT.has(pathname)) return true
  return ALLOW_PREFIX.some((p) => pathname === p || pathname.startsWith(p + "/"))
}
