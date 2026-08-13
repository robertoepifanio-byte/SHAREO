/**
 * Flags de indexação.
 *
 * Morava em `lib/prelaunch.ts` junto com o gate de campanha, por acidente de
 * história — não tem relação com pré-lançamento. Ao remover o gate (12/08/2026,
 * campanha extraída para apps/campanha) esta flag ficou de pé sozinha.
 *
 * ⚠️ No Vercel, NUNCA marcar `NEXT_PUBLIC_NOINDEX` como "Sensitive": o build do
 * staging roda no GitHub Actions e busca as variáveis com `vercel pull`, que não
 * decripta Sensitive — a flag chegaria vazia e o staging seria indexado,
 * rachando autoridade de SEO com shareo.com.br.
 */
export const NOINDEX_ENABLED = process.env.NEXT_PUBLIC_NOINDEX === "true"
