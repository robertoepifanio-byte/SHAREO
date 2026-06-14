/**
 * Guard contra SSRF para requisições outbound controladas pelo usuário (webhooks PJ).
 * Exige HTTPS e bloqueia hostnames internos e IPs LITERAIS privados/loopback/
 * link-local — incluindo o endpoint de metadata de cloud (169.254.169.254).
 *
 * Ref.: S14-SEC-03 (auditoria s14). Implementação síncrona/pura (sem node:dns/net)
 * para ser bundler-safe no Next. LIMITAÇÃO: não resolve DNS, então um domínio
 * público que aponte para IP interno (DNS rebinding) não é coberto — follow-up.
 */

function isPrivateIPv4(ip: string): boolean {
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

function isPrivateIPv6(host: string): boolean {
  const lower = host.toLowerCase()
  if (lower === "::1" || lower === "::") return true
  if (lower.startsWith("fe80") || lower.startsWith("fc") || lower.startsWith("fd")) return true // link-local + ULA
  const mapped = lower.match(/::ffff:(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})$/) // IPv4-mapped ::ffff:a.b.c.d
  if (mapped) return isPrivateIPv4(mapped[1])
  return false
}

function ipKind(host: string): "v4" | "v6" | null {
  if (/^(\d{1,3})(\.\d{1,3}){3}$/.test(host)) return "v4"
  if (host.includes(":")) return "v6"
  return null
}

/**
 * true se a URL é segura para requisição outbound: HTTPS, host não-interno e
 * que NÃO seja um IP literal privado/loopback/metadata.
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

  if (
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host.endsWith(".local")
  ) {
    return false
  }

  const kind = ipKind(host)
  if (kind === "v4") return !isPrivateIPv4(host)
  if (kind === "v6") return !isPrivateIPv6(host)

  return true // domínio público — sem resolução DNS (follow-up: bloquear rebinding)
}
