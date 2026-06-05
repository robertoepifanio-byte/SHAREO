/**
 * GET /api/admin/export/[jobId]
 * Retorna status e fileUrl do job assíncrono de exportação.
 */
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { requireAdminRole } from "@/lib/auth/admin-guards"

export const runtime = "nodejs"

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ jobId: string }> },
) {
  const session = await auth()
  try {
    requireAdminRole(session, "ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  const { jobId } = await params

  const job = await prisma.exportJob.findUnique({
    where:  { id: jobId },
    select: { id: true, status: true, fileUrl: true, errorMessage: true, createdAt: true, requestedBy: true },
  })

  if (!job) {
    return NextResponse.json({ error: "Job não encontrado" }, { status: 404 })
  }

  // Admin só pode ver seus próprios jobs (salvo SUPERADMIN)
  const isSuperAdmin = (session!.user as { adminRole?: string }).adminRole === "ADMIN_SUPERADMIN"
  if (!isSuperAdmin && job.requestedBy !== session!.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  return NextResponse.json({
    id:           job.id,
    status:       job.status,
    fileUrl:      job.status === "COMPLETED" ? job.fileUrl : null,
    errorMessage: job.status === "FAILED"    ? job.errorMessage : null,
    createdAt:    job.createdAt,
  })
}
