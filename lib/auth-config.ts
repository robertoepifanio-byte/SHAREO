/**
 * lib/auth-config.ts
 * Prazos de expiração de tokens de autenticação — fonte única.
 * Constantes (não PlatformConfig): mudá-las exige avaliação de segurança, não ajuste operacional.
 */

/** Token de verificação de e-mail — 48h */
export const EMAIL_VERIFY_TOKEN_TTL_MS = 48 * 60 * 60 * 1000

/** Link de redefinição de senha — 1h */
export const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000
