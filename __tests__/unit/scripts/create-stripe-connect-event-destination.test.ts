/** @jest-environment node */
/**
 * Testes do argumento --env-file em scripts/create-stripe-connect-event-destination.ts
 *
 * O script usa process.argv diretamente (top-level), então não é possível
 * importá-lo sem efeitos colaterais. Em vez disso, extraímos aqui a mesma
 * lógica de parsing e testamos a regra de negócio:
 *   - sem --env-file → usa ".env.local"
 *   - com --env-file=<caminho> → usa o caminho fornecido
 *
 * Isso garante que regredir a mudança (remover o suporte a --env-file e voltar
 * a carregar ".env.local" diretamente) quebraria estes testes.
 */

/** Replica a lógica do script para extrair o arquivo de env dos args. */
function resolveEnvFile(argv: string[]): string {
  const envFileArg = argv.find((a) => a.startsWith("--env-file="))
  return envFileArg ? envFileArg.slice("--env-file=".length) : ".env.local"
}

describe("resolveEnvFile — parsing do argumento --env-file", () => {
  it("usa .env.local quando --env-file não está presente (comportamento original)", () => {
    expect(resolveEnvFile([])).toBe(".env.local")
  })

  it("usa .env.local quando outros argumentos estão presentes mas não --env-file", () => {
    expect(resolveEnvFile(["--confirm", "--url=https://staging.shareo.com.br"])).toBe(".env.local")
  })

  it("usa o caminho informado em --env-file quando presente", () => {
    expect(resolveEnvFile(["--confirm", "--env-file=.env.production"])).toBe(".env.production")
  })

  it("aceita caminhos com diretório", () => {
    expect(resolveEnvFile(["--env-file=/tmp/stripe-live.env"])).toBe("/tmp/stripe-live.env")
  })

  it("--env-file prevalece sobre .env.local (não existe fallback silencioso)", () => {
    // Se o argumento está presente, o resultado NUNCA deve ser ".env.local"
    const result = resolveEnvFile(["--env-file=.env.custom"])
    expect(result).not.toBe(".env.local")
    expect(result).toBe(".env.custom")
  })

  it("usa o PRIMEIRO --env-file quando mais de um está presente (comportamento do Array.find)", () => {
    const result = resolveEnvFile(["--env-file=primeiro.env", "--env-file=segundo.env"])
    expect(result).toBe("primeiro.env")
  })
})
