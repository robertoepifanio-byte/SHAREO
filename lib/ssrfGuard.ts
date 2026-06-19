/**
 * Guard contra SSRF para requisições outbound controladas pelo usuário (webhooks PJ).
 * Exige HTTPS, bloqueia hostnames internos e IPs privados/loopback/link-local.
 *
 * Ref.: S14-SEC-03 (auditoria s14).
 *
 * Defesa em camadas:
 *  1. Rejeita protocolo não-HTTPS.
 *  2. Rejeita nomes de host reconhecidamente internos (localhost, .local, .internal).
 *  3. Rejeita IPs literais privados/loopback/link-local/CGNAT/multicast.
 *  4. Para hostnames públicos, resolve o DNS e valida CADA endereço IP retornado
 *     contra a blocklist — mitigando DNS rebinding.
 *
 * A resolução DNS usa `dns.promises.lookup` com { all: true } (runtime Node.js).
 * O módulo `dns` é importado dinamicamente para manter bundler-safety: em ambientes
 * que não suportam o módulo (ex.: Edge Runtime), a checagem DNS é omitida e o
 * hostname é aprovado somente se não for IP literal privado. Edge Runtime não executa
 * outboundWebhooks nem a rota PJ de criação de webhook, então o risco é aceitável.
 */

// ─── Blocklist de IP ────────────────────────────────────────────────────────

/**
 * Retorna `true` se o IP IPv4 pertence a um range privado, loopback, link-local,
 * CGNAT, benchmark ou multicast — e portanto deve ser bloqueado em destinos outbound.
 */
export function isPrivateIPv4(ip: string): boolean {
  const p = ip.split(".").map(Number)
  if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true // malformado → bloqueia
  const [a, b] = p
  if (a === 0 || a === 10 || a === 127) return true                  // this-host / 10/8 / loopback
  if (a === 169 && b === 254) return true                            // link-local (metadata cloud)
  if (a === 172 && b >= 16 && b <= 31) return true                   // 172.16/12
  if (a === 192 && b === 168) return true                            // 192.168/16
  if (a === 100 && b >= 64 && b <= 127) return true                  // CGNAT 100.64/10
  if (a === 198 && (b === 18 || b === 19)) return true               // benchmark 198.18/15
  if (a >= 224) return true                                          // multicast/reservado
  return false
}

/**
 * Retorna `true` se o endereço IPv6 é privado/loopback/link-local/ULA,
 * incluindo endereços IPv4-mapeados (::ffff:a.b.c.d).
 */
export function isPrivateIPv6(host: string): boolean {
  const lower = host.toLowerCase()
  if (lower === "::1" || lower === "::") return true
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true // link-local + ULA
  const mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/) // IPv4-mapped ::ffff:a.b.c.d
  if (mapped) return isPrivateIPv4(mapped[1])
  return false
}

/**
 * Determina se a string é um IP literal IPv4 ou IPv6, ou um hostname (null).
 */
export function ipKind(host: string): "v4" | "v6" | null {
  if (/^(\d{1,3})(\.\d{1,3}){3}$/.test(host)) return "v4"
  if (host.includes(":")) return "v6"
  return null
}

/**
 * Verifica se um único endereço IP (v4 ou v6) está na blocklist.
 * Função reutilizável para uso tanto na checagem de IPs literais
 * quanto nos resultados de resolução DNS.
 */
export function isBlockedIp(ip: string): boolean {
  const kind = ipKind(ip)
  if (kind === "v4") return isPrivateIPv4(ip)
  if (kind === "v6") return isPrivateIPv6(ip)
  return false // formato desconhecido → não bloqueia (hostname tratado separadamente)
}

// ─── Resolução DNS ──────────────────────────────────────────────────────────

/**
 * Resolve todos os endereços IP de um hostname via DNS e retorna `true` se
 * ALGUM dos endereços estiver na blocklist privada.
 *
 * Usa importação dinâmica de `dns` para manter bundler-safety.
 * Em caso de falha na importação (Edge Runtime), retorna `false` — não bloqueia
 * por default para não degradar ambientes que não executam webhooks.
 * Em caso de falha de resolução DNS (NXDOMAIN, timeout), retorna `true` — bloqueia
 * por precaução (fail-closed).
 */
async function dnsResolvesToPrivateIp(hostname: string): Promise<boolean> {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const dns = await import("dns").catch(() => null)
    if (!dns) return false // ambiente sem suporte a dns (Edge Runtime)

    const results = await dns.promises.lookup(hostname, { all: true })
    return results.some((r: { address: string }) => isBlockedIp(r.address))
  } catch {
    // DNS lookup falhou (NXDOMAIN, timeout, etc.) → fail-closed (bloqueia)
    return true
  }
}

// ─── Guard principal ─────────────────────────────────────────────────────────

/**
 * Retorna `true` se a URL é segura para requisição outbound: HTTPS, host não-interno,
 * IP literal não-privado, e hostname público que não resolve para IP privado (anti-rebinding).
 *
 * Assinatura permanece `async` — callers em outboundWebhooks.ts e api/pj/webhooks/route.ts
 * já usam `await`.
 */
export async function isUrlSafeForWebhook(rawUrl: string): Promise<boolean> {
  let url: URL
  try {
    url = new URL(rawUrl)
  } catch {
    return false
  }
  if (url.protocol !== "https:") return false

  let host = url.hostname.toLowerCase()
  // IPv6 literal aparece entre colchetes no hostname
  if (host.startsWith("[") && host.endsWith("]")) host = host.slice(1, -1)

  // Nomes de host reconhecidamente internos
  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return false
  }

  // IP literal — valida diretamente contra a blocklist
  const kind = ipKind(host)
  if (kind === "v4") return !isPrivateIPv4(host)
  if (kind === "v6") return !isPrivateIPv6(host)

  // Hostname público — resolve DNS e valida cada IP retornado (anti-rebinding)
  const resolvesToPrivate = await dnsResolvesToPrivateIp(host)
  return !resolvesToPrivate
}
