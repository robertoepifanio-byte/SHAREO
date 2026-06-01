import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient }

function createClient(): PrismaClient {
  if (!process.env.DATABASE_URL) {
    // Sem DATABASE_URL: retorna Proxy recursivo que resolve qualquer cadeia de
    // propriedades (prisma.item.findMany) e rejeita a Promise na chamada final.
    // Isso mantém o erro no contexto async para que os .catch() dos Server
    // Components possam tratá-lo — evita crash na inicialização do módulo.
    const rejected = () => Promise.reject(new Error("DATABASE_URL not configured"))
    const handler: ProxyHandler<typeof rejected> = {
      get:   () => new Proxy(rejected, handler),
      apply: () => Promise.reject(new Error("DATABASE_URL not configured")),
    }
    return new Proxy(rejected, handler) as unknown as PrismaClient
  }

  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  })
}

export const prisma = globalForPrisma.prisma ?? createClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma
