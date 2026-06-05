"use client"

import { useState } from "react"

type JobStatus = "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"

interface AsyncResult {
  jobId:  string
  status: JobStatus
  fileUrl?: string | null
  errorMessage?: string | null
}

export function ExportForm() {
  const today  = new Date().toISOString().slice(0, 10)
  const month1 = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const [start, setStart]     = useState(month1)
  const [end, setEnd]         = useState(today)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [asyncJob, setAsyncJob] = useState<AsyncResult | null>(null)

  const diffDays = Math.ceil(
    (new Date(end).getTime() - new Date(start).getTime()) / (1000 * 60 * 60 * 24),
  )
  const isAsync = diffDays > 90

  async function handleExport() {
    setLoading(true)
    setError(null)
    setAsyncJob(null)

    try {
      const res = await fetch("/api/admin/export", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ start, end }),
      })

      if (res.status === 202) {
        // Job assíncrono criado
        const data = (await res.json()) as { jobId: string; status: JobStatus }
        setAsyncJob({ jobId: data.jobId, status: data.status })
        // Inicia polling
        pollJob(data.jobId)
        return
      }

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Erro ao exportar" }))
        setError((data as { error?: string }).error ?? "Erro ao exportar")
        return
      }

      // Síncrono: download do CSV
      const blob     = await res.blob()
      const url      = URL.createObjectURL(blob)
      const a        = document.createElement("a")
      a.href         = url
      a.download     = `shareo-financeiro-${start}-${end}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      setError("Erro de rede. Tente novamente.")
    } finally {
      setLoading(false)
    }
  }

  function pollJob(jobId: string) {
    const interval = setInterval(async () => {
      try {
        const res  = await fetch(`/api/admin/export/${jobId}`)
        const data = (await res.json()) as AsyncResult

        setAsyncJob(data)

        if (data.status === "COMPLETED" || data.status === "FAILED") {
          clearInterval(interval)
        }
      } catch {
        clearInterval(interval)
      }
    }, 3000)
  }

  function downloadAsync() {
    if (!asyncJob?.fileUrl) return
    const a    = document.createElement("a")
    a.href     = asyncJob.fileUrl
    a.download = `shareo-financeiro-${start}-${end}.csv`
    a.click()
  }

  return (
    <div className="rounded-xl border border-border bg-surface p-6 space-y-5 max-w-lg">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label htmlFor="export-start" className="block text-sm font-medium text-foreground mb-1">
            Data inicial
          </label>
          <input
            id="export-start"
            type="date"
            value={start}
            max={today}
            onChange={(e) => setStart(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
        <div>
          <label htmlFor="export-end" className="block text-sm font-medium text-foreground mb-1">
            Data final
          </label>
          <input
            id="export-end"
            type="date"
            value={end}
            max={today}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full rounded-lg border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand"
          />
        </div>
      </div>

      {diffDays > 0 && (
        <p className="text-xs text-muted-foreground">
          {diffDays} dia{diffDays !== 1 ? "s" : ""} selecionado{diffDays !== 1 ? "s" : ""} —{" "}
          {isAsync
            ? "⏳ exportação assíncrona (período > 90 dias, processamento em background)"
            : "⚡ exportação imediata"}
        </p>
      )}

      {error && (
        <p className="rounded-lg bg-destructive/10 px-4 py-2 text-sm text-destructive">{error}</p>
      )}

      {asyncJob && (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {asyncJob.status === "PENDING"    && "⏳ Job criado, aguardando processamento…"}
            {asyncJob.status === "PROCESSING" && "⚙️ Processando exportação…"}
            {asyncJob.status === "COMPLETED"  && "✅ Exportação concluída!"}
            {asyncJob.status === "FAILED"     && "❌ Falha na exportação"}
          </p>
          {asyncJob.status === "COMPLETED" && asyncJob.fileUrl && (
            <button
              onClick={downloadAsync}
              className="text-sm text-brand underline hover:no-underline"
            >
              Baixar CSV →
            </button>
          )}
          {asyncJob.status === "FAILED" && asyncJob.errorMessage && (
            <p className="text-xs text-destructive">{asyncJob.errorMessage}</p>
          )}
          <p className="text-xs text-muted-foreground font-mono">Job: {asyncJob.jobId}</p>
        </div>
      )}

      <button
        onClick={handleExport}
        disabled={loading || !start || !end || diffDays <= 0}
        className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        {loading ? "Gerando…" : isAsync ? "Solicitar exportação" : "Exportar CSV"}
      </button>

      <p className="text-xs text-muted-foreground">
        Campos exportados: ID, data, status, item, proprietário, locatário, total, taxa plataforma, repasse líquido, dispute ID.
      </p>
    </div>
  )
}
