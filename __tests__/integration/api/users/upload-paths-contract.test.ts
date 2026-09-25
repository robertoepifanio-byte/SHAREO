/** @jest-environment node */
/**
 * Contrato entre QUEM GRAVA e QUEM APAGA no Storage (exclusão de conta, LGPD art. 18).
 *
 * O bug original foi drift: a rota de KYC gravava em `id-verification/<userId>/…` e a
 * exclusão listava `<userId>`. Aqui as duas rotas de upload rodam de verdade (só Supabase,
 * Prisma e rate limit são mocks) e o caminho que passam a `.upload()` tem de cair DENTRO
 * de um alvo de `alvosDoUsuario()`. Se alguém voltar a escrever o caminho à mão numa rota
 * e ele divergir do prefixo apagado, este teste quebra — o teste unitário do helper não
 * enxerga isso, pois só compara o helper com ele mesmo.
 */
import { NextRequest } from "next/server"

const mockUserId = jest.fn()
const mockUpload = jest.fn()

jest.mock("@/lib/resolveUserId", () => ({ resolveUserId: (...a: unknown[]) => mockUserId(...a) }))
jest.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    storage: {
      from: (bucket: string) => ({
        upload:       (path: string) => { mockUpload(bucket, path); return Promise.resolve({ error: null }) },
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${bucket}/${path}` } }),
      }),
    },
  }),
}))
jest.mock("@/lib/platform-config", () => ({
  getUploadLimits:            async () => ({ maxUploadSizeMB: 5 }),
  getBiometricConsentConfig:  async () => ({ required: false }),
}))
jest.mock("@/lib/rateLimit", () => ({
  checkRateLimit:    async () => ({ allowed: true }),
  rateLimitResponse: jest.fn(),
  RATE_LIMITS:       { upload: { limit: 10, windowMs: 60_000 } },
}))
jest.mock("@/lib/prisma", () => ({
  prisma: {
    user: {
      findUnique: jest.fn().mockResolvedValue({ idVerificationStatus: "UNVERIFIED" }),
      update:     jest.fn().mockResolvedValue({}),
    },
  },
}))
jest.mock("@/lib/crypto",     () => ({ hashToken: jest.fn(), decryptDocument: jest.fn(), maskCPF: jest.fn(), maskCNPJ: jest.fn() }))
jest.mock("@/lib/access-log", () => ({ extractClientIp: () => "127.0.0.1", logAccess: jest.fn() }))
// file-type é ESM puro — o Jest não transforma node_modules por padrão
jest.mock("file-type", () => ({ fileTypeFromBuffer: jest.fn().mockResolvedValue({ mime: "image/jpeg" }) }))

import { POST as uploadPOST }         from "@/app/api/upload/route"
import { POST as idVerificationPOST } from "@/app/api/users/me/id-verification/route"
import { alvosDoUsuario }             from "@/lib/supabase/purge-user-storage"

const USER = "cuser1"
const img  = (nome: string) => new File(["fake-image-data"], nome, { type: "image/jpeg" })

function postForm(url: string, campos: Record<string, string | File>) {
  const form = new FormData()
  for (const [k, v] of Object.entries(campos)) form.append(k, v)
  return new NextRequest(`http://localhost${url}`, { method: "POST", body: form })
}

/** Exatamente um alvo de purge para o bucket, e o caminho gravado tem de estar sob o prefixo dele. */
function expectSobPrefixoApagado(bucket: string, path: string) {
  const alvos = alvosDoUsuario(USER).filter((a) => a.bucket === bucket)
  expect(alvos).toHaveLength(1)
  expect(path.startsWith(`${alvos[0].prefixo}/`)).toBe(true)
}

beforeEach(() => {
  jest.clearAllMocks()
  mockUserId.mockResolvedValue(USER)
})

describe("o que as rotas de upload gravam é o que a exclusão de conta apaga", () => {
  it.each(["booking-photos", "item-images"])("POST /api/upload (bucket %s)", async (bucket) => {
    const res = await uploadPOST(postForm("/api/upload", { file: img("a.jpg"), bucket }))
    expect(res.status).toBe(201)

    expect(mockUpload).toHaveBeenCalledTimes(1)
    const [b, path] = mockUpload.mock.calls[0] as [string, string]
    expect(b).toBe(bucket)
    expectSobPrefixoApagado(b, path)
  })

  it("POST /api/users/me/id-verification (documento e selfie em id-docs)", async () => {
    const res = await idVerificationPOST(
      postForm("/api/users/me/id-verification", { document: img("doc.jpg"), selfie: img("eu.jpg") }),
    )
    expect(res.status).toBeLessThan(300)

    expect(mockUpload).toHaveBeenCalledTimes(2)
    const gravados = mockUpload.mock.calls as [string, string][]
    expect(gravados.map(([b]) => b)).toEqual(["id-docs", "id-docs"])
    expect(gravados.map(([, p]) => p.split("/").pop()!.split("-")[0]).sort()).toEqual(["document", "selfie"])
    for (const [b, path] of gravados) expectSobPrefixoApagado(b, path)
  })
})
