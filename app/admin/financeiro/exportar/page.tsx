import type { Metadata } from "next"
import { requireAdminPage } from "@/lib/auth/require-admin"
import { ExportForm } from "./_ExportForm"

export const metadata: Metadata = { title: "Admin — Exportar Financeiro" }

export default async function ExportarPage() {
  await requireAdminPage("ADMIN_SUPERADMIN", "ADMIN_FINANCEIRO")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-primary">Exportar Dados Financeiros</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Exporte transações em CSV para reconciliação contábil.
          Períodos de até 90 dias geram download imediato; períodos maiores são processados em background.
        </p>
      </div>
      <ExportForm />
    </div>
  )
}
