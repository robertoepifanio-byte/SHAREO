// Cadastro progressivo — regra única de "cadastro completo".
//
// Signup mínimo (nome/e-mail/senha/cidade/estado) cria a conta com profileCompletedAt = null,
// permitindo navegar. O cadastro completo (CPF/CNPJ + endereço + 18+) é exigido apenas ao
// Anunciar ou Alugar. A completude é lida do banco nos gates (mesmo padrão do emailVerified
// no booking) — não entra no JWT, evitando forçar re-login.

/** Caminho da página de conclusão do cadastro, com retorno opcional. */
export function completeRegistrationPath(callbackUrl?: string): string {
  const base = "/cadastro/completar"
  return callbackUrl ? `${base}?callbackUrl=${encodeURIComponent(callbackUrl)}` : base
}

/** Verdadeiro quando o usuário concluiu o cadastro completo. */
export function isRegistrationComplete(
  user: { profileCompletedAt: Date | null } | null | undefined,
): boolean {
  return !!user?.profileCompletedAt
}
