// Fonte: apps/mobile/app/meus-anuncios.tsx + apps/mobile/app/meus-anuncios/integracoes.tsx
//
// Tipos compartilhados entre telas do app mobile ShareO.
// Extraídos para eliminar duplicação — não inventar tipos novos aqui sem rastrear a fonte.

/** Retorno de GET /api/users/me — queryKey ["me-profile"] */
export interface MeData {
  id:       string
  userType: "PF" | "PJ"
}
