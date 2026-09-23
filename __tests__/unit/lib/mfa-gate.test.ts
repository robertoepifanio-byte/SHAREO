import { sessionAccess } from "@/lib/auth/mfa-gate"

describe("sessionAccess — admin sem 2FA vira usuário comum na sessão", () => {
  it.each([
    ["mfa ausente (token anterior ao 2FA)", { role: "ADMIN", adminRole: "ADMIN_SUPERADMIN" }],
    ["mfa=false (admin sem 2FA cadastrado)", { role: "ADMIN", adminRole: "ADMIN_FINANCEIRO", mfa: false }],
  ])("%s → role USER, sem adminRole, mfaPending", (_caso, token) => {
    expect(sessionAccess(token)).toEqual({ role: "USER", adminRole: undefined, mfaPending: true })
  })

  it("admin com 2FA verificado mantém role e adminRole", () => {
    expect(sessionAccess({ role: "ADMIN", adminRole: "ADMIN_SUPERADMIN", mfa: true })).toEqual({
      role: "ADMIN", adminRole: "ADMIN_SUPERADMIN", mfaPending: false,
    })
  })

  it("usuário comum não é afetado, com ou sem `mfa`", () => {
    expect(sessionAccess({ role: "USER" })).toEqual({ role: "USER", adminRole: undefined, mfaPending: false })
    expect(sessionAccess({ role: "USER", mfa: true })).toEqual({ role: "USER", adminRole: undefined, mfaPending: false })
  })
})
