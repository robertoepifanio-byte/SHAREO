import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { resolveUserId } from "@/lib/resolveUserId"
import { prisma } from "@/lib/prisma"

const unauth = (): NextResponse =>
  NextResponse.json(
    { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
    { status: 401 },
  )

/**
 * Resolve Bearer JWT (mobile) ou session cookie (web) e devolve o usuário.
 *
 * Sem `select`: devolve `{ id }` sem query ao banco.
 * Com `select`: busca os campos extras em `users` numa única query (evita a
 * "segunda query solta" que surge quando o handler precisa de mais que o id).
 *
 * Retorna `NextResponse` 401 padronizado quando não autenticado — basta um
 * `if (user instanceof NextResponse) return user` para encerrar o handler.
 *
 * `app/api/admin/**` é cookie-only por decisão — não usar aqui (memory
 * feedback-auth-cookie-only-mobile-401).
 */
export async function withUser(req: NextRequest): Promise<{ id: string } | NextResponse>
export async function withUser<S extends Prisma.UserSelect>(
  req: NextRequest,
  opts: { select: S },
): Promise<Prisma.UserGetPayload<{ select: S & { id: true } }> | NextResponse>
export async function withUser(
  req: NextRequest,
  opts?: { select?: Prisma.UserSelect },
): Promise<Record<string, unknown> | NextResponse> {
  const userId = await resolveUserId(req)
  if (!userId) return unauth()

  // SEC-CRIT-04c (withUser): sempre consulta o banco para rejeitar contas excluídas
  // ou desativadas — independente de Redis. isSessionStale é fail-open: se o Upstash
  // falha, tokens Bearer de contas excluídas passariam pelo resolveUserId e chegariam
  // aqui com userId válido. A query é mínima (só id + deletedAt + isActive); quando
  // `select` tem campos extras, a mesma query os busca sem overhead adicional.
  const user = await prisma.user.findUnique({
    where:  { id: userId, deletedAt: null, isActive: true },
    select: { id: true, ...(opts?.select ?? {}) },
  })
  return user ?? unauth()
}
