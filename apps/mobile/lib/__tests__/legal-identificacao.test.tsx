// Fonte: components/legal/IdentificacaoPrestador.tsx (site)
//
// A obrigação legal não some porque o usuário abriu pelo celular: o app mostra
// os mesmos Termos e a mesma Política, então mostra a mesma identificação.
//
// RÓTULOS VERBATIM do site — divergir daqui quebra a paridade site↔app. A
// coerência dos VALORES (razão social, CNPJ) é travada do outro lado, pelo teste
// do site, que compara este espelho com lib/legal-config.ts.

import React from "react"
import { render, screen } from "@testing-library/react-native"
import { IdentificacaoPrestador } from "@/components/legal/IdentificacaoPrestador"
import { LEGAL_ENTITY } from "@/lib/legalConfig"

jest.mock("@/lib/theme", () => ({
  useTheme: () => ({
    mode: "light",
    tokens: {
      surface: "#FFFFFF",
      border: "#E2E8F0",
      text: "#0F172A",
      muted: "#64748B",
      green: "#007B3C",
    },
  }),
}))

describe("IdentificacaoPrestador (app)", () => {
  it("exibe razão social e CNPJ", () => {
    render(<IdentificacaoPrestador />)

    expect(screen.getByText(LEGAL_ENTITY.razaoSocial)).toBeTruthy()
    expect(screen.getByText(`CNPJ ${LEGAL_ENTITY.cnpj}`)).toBeTruthy()
    expect(screen.getByText("A plataforma ShareO é operada por:")).toBeTruthy()
  })

  it("identifica a empresa como CONTROLADORA na Política de Privacidade", () => {
    render(<IdentificacaoPrestador papel="controlador" />)

    expect(
      screen.getByText("O controlador dos dados pessoais tratados nesta plataforma é:"),
    ).toBeTruthy()
  })
})
