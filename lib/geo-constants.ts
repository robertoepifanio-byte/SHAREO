/**
 * geo-constants.ts — constantes geográficas client-safe (sem import de prisma).
 *
 * lib/userLocation.ts também usa BRAZIL_DEFAULT, mas é server-only (consulta o
 * banco) — componentes client (ItemsMap, ItemForm) importam daqui direto para
 * não puxar prisma pro bundle do navegador.
 */

// Centro geográfico do Brasil — zoom de país para usuários sem localização
// conhecida (lançamento nacional — nunca uma cidade específica como default).
export const BRAZIL_DEFAULT = { lat: -14.235, lng: -51.9253, zoom: 4 }
