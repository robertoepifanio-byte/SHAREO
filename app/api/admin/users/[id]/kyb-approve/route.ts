import type { NextRequest } from "next/server"
import { NextResponse, after } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { hasAdminRole } from "@/lib/auth/admin-guards"
import { prisma } from "@/lib/prisma"
import { decryptDocument } from "@/lib/crypto"
import { verifyCnpjAtReceita, PjVerificationError } from "@/lib/pjVerification"

type Params = { params: Promise<{ id: string }> }

const Schema = z.object({
  // "verify"   → re-consulta a Receita e confirma a situação cadastral.
  // "override" → o admin atesta manualmente o vínculo (sai da fila sem confirmar na Receita).
  action: z.enum(["verify", "override"]),
})

export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Acesso restrito a administradores." } },
        { status: 403 },
      )
    }
    if (!hasAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_OPERACIONAL")) {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Seu perfil não tem acesso a revisões de PJ." } },
        { status: 403 },
      )
    }

    const { id } = await params
    const parsed = Schema.safeParse(await req.json())
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION_ERROR", message: "Dados inválidos." } },
        { status: 400 },
      )
    }
    const { action } = parsed.data

    const user = await prisma.user.findFirst({
      where:  { id, deletedAt: null, userType: "PJ" },
      select: { id: true, cnpjEncrypted: true, cnpjSituacaoVerificada: true, cnpjVerificacaoOverrideAt: true },
    })
    if (!user) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Conta PJ não encontrada." } },
        { status: 404 },
      )
    }
    if (user.cnpjSituacaoVerificada || user.cnpjVerificacaoOverrideAt) {
      return NextResponse.json(
        { error: { code: "INVALID_STATE", message: "Esta conta PJ não está pendente de revisão." } },
        { status: 409 },
      )
    }

    const now = new Date()

    if (action === "override") {
      await prisma.user.update({
        where: { id },
        data:  { cnpjVerificacaoOverrideBy: session.user.id, cnpjVerificacaoOverrideAt: now },
      })
      after(() =>
        prisma.adminLog.create({
          data: { adminId: session.user.id, action: "KYB_OVERRIDE", entityType: "User", entityId: id },
        }).catch((e) => console.error("[adminLog kyb override]", e instanceof Error ? e.message : e)),
      )
      return NextResponse.json({ data: { message: "Conta liberada manualmente." } })
    }

    // action === "verify" → re-consulta a Receita.
    if (!user.cnpjEncrypted) {
      return NextResponse.json(
        { error: { code: "NO_CNPJ", message: "Conta sem CNPJ armazenado." } },
        { status: 422 },
      )
    }
    let cnpj: string
    try {
      cnpj = decryptDocument(user.cnpjEncrypted)
    } catch {
      return NextResponse.json(
        { error: { code: "DECRYPT_ERROR", message: "Não foi possível ler o CNPJ armazenado." } },
        { status: 500 },
      )
    }

    try {
      const v = await verifyCnpjAtReceita(cnpj)
      await prisma.user.update({
        where: { id },
        data: {
          cnpjRazaoSocial:        v.razaoSocial,
          cnpjSituacao:           v.situacao,
          cnpjDataAbertura:       v.dataAbertura,
          cnpjSituacaoVerificada: true,
          cnpjVerificadoAt:       now,
        },
      })
      after(() =>
        prisma.adminLog.create({
          data: { adminId: session.user.id, action: "KYB_VERIFIED", entityType: "User", entityId: id },
        }).catch((e) => console.error("[adminLog kyb verify]", e instanceof Error ? e.message : e)),
      )
      return NextResponse.json({ data: { message: "CNPJ confirmado na Receita.", razaoSocial: v.razaoSocial } })
    } catch (e) {
      if (e instanceof PjVerificationError) {
        if (e.code === "CNPJ_INACTIVE") {
          return NextResponse.json(
            { error: { code: "CNPJ_INACTIVE", message: "CNPJ não está ativo na Receita. Não aprove — avalie encerrar a conta." } },
            { status: 422 },
          )
        }
        if (e.code === "CNPJ_NOT_FOUND") {
          return NextResponse.json(
            { error: { code: "CNPJ_NOT_FOUND", message: "CNPJ não encontrado na Receita." } },
            { status: 422 },
          )
        }
        return NextResponse.json(
          { error: { code: "VERIFICATION_UNAVAILABLE", message: "Receita indisponível agora. Tente de novo ou use 'Aprovar manualmente'." } },
          { status: 503 },
        )
      }
      throw e
    }
  } catch (e) {
    console.error("[POST /api/admin/users/:id/kyb-approve]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
