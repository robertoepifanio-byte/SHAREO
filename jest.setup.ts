import "@testing-library/jest-dom"
import { configureAxe, toHaveNoViolations } from "jest-axe"

// after() do next/server exige request scope — nos testes os handlers são
// chamados diretamente, então executamos a task imediatamente.
// Erros são engolidos: side-effects pós-resposta não devem derrubar o worker
// quando o mock do teste não cobre o modelo usado dentro do after().
jest.mock("next/server", () => ({
  ...jest.requireActual("next/server"),
  after: (task: unknown) => {
    if (typeof task === "function") {
      void Promise.resolve().then(() => (task as () => unknown)()).catch(() => {})
    }
  },
}))

expect.extend(toHaveNoViolations)

configureAxe({
  rules: {
    region: { enabled: false },
  },
})
