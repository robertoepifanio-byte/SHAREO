/**
 * Testes unitários para lib/ssrfGuard.ts
 *
 * Cobre:
 *  1. IP privado/loopback/link-local literal → bloqueado
 *  2. Hostname público que resolve para IP privado → bloqueado (DNS rebinding)
 *  3. Hostname público com IPs públicos → permitido
 *  4. Protocolo não-HTTPS → bloqueado
 *  5. Hostname interno (.local, localhost, .internal) → bloqueado
 */

import { isPrivateIPv4, isPrivateIPv6, isBlockedIp, isUrlSafeForWebhook } from "@/lib/ssrfGuard"

// ─── Testes síncronos de blocklist ──────────────────────────────────────────

describe("isPrivateIPv4", () => {
  it.each([
    ["10.0.0.1",       true,  "RFC-1918 10/8"],
    ["10.255.255.255",  true,  "RFC-1918 10/8 limite superior"],
    ["172.16.0.1",      true,  "RFC-1918 172.16/12"],
    ["172.31.255.255",  true,  "RFC-1918 172.16/12 limite superior"],
    ["192.168.1.1",     true,  "RFC-1918 192.168/16"],
    ["127.0.0.1",       true,  "loopback"],
    ["127.255.255.255", true,  "loopback último octeto"],
    ["169.254.0.1",     true,  "link-local / metadata cloud"],
    ["100.64.0.1",      true,  "CGNAT início"],
    ["100.127.255.255", true,  "CGNAT fim"],
    ["0.0.0.0",         true,  "this-host"],
    ["224.0.0.1",       true,  "multicast"],
    ["240.0.0.1",       true,  "reservado"],
    ["8.8.8.8",         false, "IP público Google DNS"],
    ["1.1.1.1",         false, "IP público Cloudflare DNS"],
    ["172.15.255.255",  false, "logo abaixo do RFC-1918 172.16/12"],
    ["172.32.0.0",      false, "logo acima do RFC-1918 172.16/12"],
    ["malformed.ip",    true,  "malformado → bloqueia"],
    ["999.1.1.1",       true,  "octeto inválido → bloqueia"],
  ])("isPrivateIPv4(%s) === %s (%s)", (ip, expected) => {
    expect(isPrivateIPv4(ip)).toBe(expected)
  })
})

describe("isPrivateIPv6", () => {
  it("bloqueia loopback ::1", () => {
    expect(isPrivateIPv6("::1")).toBe(true)
  })
  it("bloqueia link-local fe80::1", () => {
    expect(isPrivateIPv6("fe80::1")).toBe(true)
  })
  it("bloqueia ULA fc00::1", () => {
    expect(isPrivateIPv6("fc00::1")).toBe(true)
  })
  it("bloqueia ULA fd00::1", () => {
    expect(isPrivateIPv6("fd00::1")).toBe(true)
  })
  it("bloqueia IPv4-mapped ::ffff:192.168.1.1", () => {
    expect(isPrivateIPv6("::ffff:192.168.1.1")).toBe(true)
  })
  it("bloqueia IPv4-mapped ::ffff:10.0.0.1", () => {
    expect(isPrivateIPv6("::ffff:10.0.0.1")).toBe(true)
  })
  it("permite endereço IPv6 publico 2001:4860:4860::8888 (Google)", () => {
    expect(isPrivateIPv6("2001:4860:4860::8888")).toBe(false)
  })
})

describe("isBlockedIp", () => {
  it("bloqueia IP privado IPv4", () => {
    expect(isBlockedIp("192.168.0.1")).toBe(true)
  })
  it("bloqueia IP privado IPv6", () => {
    expect(isBlockedIp("::1")).toBe(true)
  })
  it("permite IP publico IPv4", () => {
    expect(isBlockedIp("8.8.8.8")).toBe(false)
  })
})

// ─── Testes com mock de DNS (assinatura async) ──────────────────────────────

describe("isUrlSafeForWebhook", () => {
  // Mock do modulo dns para controlar resolução
  const mockLookup = jest.fn()

  beforeEach(() => {
    jest.resetModules()
    mockLookup.mockReset()
    jest.doMock("dns", () => ({
      promises: { lookup: mockLookup },
    }))
  })

  afterEach(() => {
    jest.dontMock("dns")
  })

  // --- Casos que independem de DNS ---

  it("bloqueia URL com protocolo HTTP", async () => {
    await expect(isUrlSafeForWebhook("http://example.com/hook")).resolves.toBe(false)
  })

  it("bloqueia URL malformada", async () => {
    await expect(isUrlSafeForWebhook("nao-e-uma-url")).resolves.toBe(false)
  })

  it("bloqueia localhost", async () => {
    await expect(isUrlSafeForWebhook("https://localhost/hook")).resolves.toBe(false)
  })

  it("bloqueia subdomínio de localhost", async () => {
    await expect(isUrlSafeForWebhook("https://foo.localhost/hook")).resolves.toBe(false)
  })

  it("bloqueia host .local", async () => {
    await expect(isUrlSafeForWebhook("https://server.local/hook")).resolves.toBe(false)
  })

  it("bloqueia host .internal", async () => {
    await expect(isUrlSafeForWebhook("https://api.internal/hook")).resolves.toBe(false)
  })

  it("bloqueia IP literal privado 192.168.1.1", async () => {
    await expect(isUrlSafeForWebhook("https://192.168.1.1/hook")).resolves.toBe(false)
  })

  it("bloqueia IP literal loopback 127.0.0.1", async () => {
    await expect(isUrlSafeForWebhook("https://127.0.0.1/hook")).resolves.toBe(false)
  })

  it("bloqueia IP literal link-local de metadata 169.254.169.254", async () => {
    await expect(isUrlSafeForWebhook("https://169.254.169.254/latest/meta-data")).resolves.toBe(false)
  })

  it("bloqueia IP literal IPv6 loopback [::1]", async () => {
    await expect(isUrlSafeForWebhook("https://[::1]/hook")).resolves.toBe(false)
  })

  // --- Casos que dependem de resolução DNS ---

  it("bloqueia hostname publico que resolve para IP privado (DNS rebinding)", async () => {
    // Simula um domínio que parece público mas resolve para IP interno
    mockLookup.mockResolvedValueOnce([
      { address: "192.168.1.100", family: 4 },
    ])
    // Re-importa para pegar o mock
    const { isUrlSafeForWebhook: guard } = await import("@/lib/ssrfGuard")
    await expect(guard("https://evil-rebinding.example.com/hook")).resolves.toBe(false)
  })

  it("permite hostname publico que resolve para IPs publicos", async () => {
    mockLookup.mockResolvedValueOnce([
      { address: "8.8.8.8",   family: 4 },
      { address: "8.8.4.4",   family: 4 },
    ])
    const { isUrlSafeForWebhook: guard } = await import("@/lib/ssrfGuard")
    await expect(guard("https://api.example.com/hook")).resolves.toBe(true)
  })

  it("bloqueia hostname quando DNS falha (fail-closed)", async () => {
    mockLookup.mockRejectedValueOnce(new Error("ENOTFOUND"))
    const { isUrlSafeForWebhook: guard } = await import("@/lib/ssrfGuard")
    await expect(guard("https://nxdomain-inexistente-shareo.example/hook")).resolves.toBe(false)
  })
})
