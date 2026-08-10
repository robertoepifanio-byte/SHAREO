import { isPrelaunchAllowed } from "@/lib/prelaunch"

describe("isPrelaunchAllowed", () => {
  describe("libera o que a campanha precisa", () => {
    it.each([
      ["/", "a landing de captação"],
      ["/pilotos", "índice de pilotos"],
      ["/pilotos/recife", "landing de cidade-piloto"],
      ["/termos", "legal — exigido na revisão de anúncio do Meta"],
      ["/privacidade", "legal — LGPD"],
      ["/politicas", "legal"],
      ["/robots.txt", "SEO"],
      ["/sitemap.xml", "SEO"],
    ])("%s (%s)", (path) => {
      expect(isPrelaunchAllowed(path)).toBe(true)
    })
  })

  describe("libera os estáticos que a landing usa", () => {
    // Regressão: o matcher do middleware NÃO isenta public/, então asset fora da
    // allowlist recebe 307 e a imagem quebra em silêncio — só o alt aparece.
    it.each([
      "/campanha/banner-h-1280.webp",
      "/campanha/banner-v-1024.webp",
      "/logos/shareo-logo.png",
      "/icons/ferramentas.png",
    ])("%s", (path) => {
      expect(isPrelaunchAllowed(path)).toBe(true)
    })
  })

  describe("libera os destinos dos e-mails transacionais", () => {
    // Sem isto, TODO convite de piloto morreria na home:
    // lib/email.ts monta /definir-senha/[token] e /esqueci-senha/[token].
    it.each([
      "/definir-senha/abc123",
      "/esqueci-senha",
      "/esqueci-senha/tok3n",
      "/verify-email",
      "/bem-vindo",
      "/login",
      "/sair",
    ])("%s", (path) => {
      expect(isPrelaunchAllowed(path)).toBe(true)
    })
  })

  describe("libera admin e APIs vivas", () => {
    it.each([
      "/admin",
      "/admin/fundadores",
      "/api/admin/founders/invite",
      "/api/founders/leads",
      "/api/founders/unsubscribe",
      "/api/auth/session",
      "/api/health",
      "/api/cron/reminders",
    ])("%s", (path) => {
      expect(isPrelaunchAllowed(path)).toBe(true)
    })
  })

  describe("bloqueia o marketplace", () => {
    it.each([
      "/itens",
      "/itens/abc123",
      "/itens/novo",
      "/perfil",
      "/reservas",
      "/mensagens",
      "/favoritos",
      "/carrinho",
      "/meus-anuncios",
      "/loja/alguem",
      "/ganhar",
      "/sobre",
      "/comunidade",
      "/ajuda",
      "/api/bookings",
      "/api/items",
      "/api/conversations",
    ])("%s", (path) => {
      expect(isPrelaunchAllowed(path)).toBe(false)
    })
  })

  it("libera /dashboard para não prender o usuário fora do login", () => {
    // Regressão do beco sem saída de 07/08. O middleware manda para /dashboard
    // quem tenta /admin sem ser ADMIN e quem abre /login já logado; com
    // /dashboard bloqueado, as duas rotas caíam na landing e não havia como
    // chegar ao formulário de login para trocar de conta.
    //
    // /dashboard exige sessão por conta própria, então liberá-lo no gate não
    // expõe nada — o que ele deixa de fazer é aprisionar.
    expect(isPrelaunchAllowed("/dashboard")).toBe(true)
  })

  it("bloqueia /cadastro — signup público fica fechado na campanha", () => {
    // A captação é o formulário de interessados; criar conta só no convite.
    expect(isPrelaunchAllowed("/cadastro")).toBe(false)
    expect(isPrelaunchAllowed("/cadastro/completar")).toBe(false)
  })

  describe("casa por SEGMENTO, não por prefixo cru", () => {
    // Regressão: com startsWith(p) puro estes passariam e abririam buraco no gate.
    it.each([
      "/loginfake",
      "/adminx",
      "/pilotosX",
      "/termosdeuso",
      "/api/foundersX",
      "/privacidade-falsa",
    ])("%s NÃO é liberado", (path) => {
      expect(isPrelaunchAllowed(path)).toBe(false)
    })
  })
})
