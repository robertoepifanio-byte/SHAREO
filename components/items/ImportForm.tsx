"use client"

import { useState, useRef } from "react"
import Link from "next/link"

type ImportResult = {
  created: number
  updated: number
  failed:  number
  errors:  { row: number; message: string }[]
}

type State =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; result: ImportResult }
  | { status: "error"; message: string }

export function ImportForm() {
  const [state,     setState]     = useState<State>({ status: "idle" })
  const [file,      setFile]      = useState<File | null>(null)
  const [dragging,  setDragging]  = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function handleFile(f: File) {
    if (!f.name.endsWith(".csv")) {
      setState({ status: "error", message: "Selecione um arquivo .csv" })
      return
    }
    setFile(f)
    setState({ status: "idle" })
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!file) return

    setState({ status: "loading" })

    const form = new FormData()
    form.append("file", file)

    try {
      const res  = await fetch("/api/items/import", { method: "POST", body: form })
      const json = await res.json()

      if (!res.ok) {
        setState({ status: "error", message: json?.error?.message ?? "Erro no servidor." })
        return
      }

      setState({ status: "success", result: json.data })
    } catch {
      setState({ status: "error", message: "Erro de conexão. Tente novamente." })
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">

      {/* Instruções */}
      <div className="rounded-xl border border-border bg-surface p-5">
        <h2 className="mb-3 font-semibold text-foreground">Como usar</h2>
        <ol className="space-y-1.5 text-sm text-muted-foreground list-decimal list-inside">
          <li>Baixe o modelo CSV abaixo e preencha seus itens</li>
          <li>Colunas obrigatórias: <code className="rounded bg-muted px-1 text-xs">titulo</code>, <code className="rounded bg-muted px-1 text-xs">categoria</code>, <code className="rounded bg-muted px-1 text-xs">preco_dia</code>, <code className="rounded bg-muted px-1 text-xs">condicao</code></li>
          <li>Preço em Reais com ponto ou vírgula — ex: <code className="rounded bg-muted px-1 text-xs">25.00</code></li>
          <li>Condições aceitas: <code className="rounded bg-muted px-1 text-xs">NOVO</code> · <code className="rounded bg-muted px-1 text-xs">EXCELENTE</code> · <code className="rounded bg-muted px-1 text-xs">BOM</code> · <code className="rounded bg-muted px-1 text-xs">REGULAR</code></li>
          <li>Categorias: Ferramentas · Eletrônicos · Construção · Esporte · Moda · Festas · Casa e Jardim</li>
          <li>Máximo 100 linhas por arquivo. Se o título já existe, o item é <strong>atualizado</strong></li>
        </ol>

        <a
          href="/template-importacao.csv"
          download
          className="mt-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-brand/40 bg-brand/5 px-3 text-sm font-semibold text-brand hover:bg-brand/10 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          Baixar modelo CSV
        </a>
      </div>

      {/* Upload */}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div
          role="button"
          tabIndex={0}
          aria-label="Área de upload de arquivo CSV"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragging(false)
            const f = e.dataTransfer.files[0]
            if (f) handleFile(f)
          }}
          className={[
            "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-10 transition-colors outline-none",
            "focus-visible:ring-2 focus-visible:ring-brand focus-visible:ring-offset-2",
            dragging
              ? "border-brand bg-brand/5"
              : file
                ? "border-success/50 bg-success/5"
                : "border-border hover:border-brand/40 hover:bg-brand/5",
          ].join(" ")}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="sr-only"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f) }}
          />

          {file ? (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-success" aria-hidden="true">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                <polyline points="14 2 14 8 20 8"/>
                <polyline points="9 15 12 18 15 15"/>
              </svg>
              <div className="text-center">
                <p className="font-semibold text-foreground">{file.name}</p>
                <p className="text-xs text-muted-foreground">{(file.size / 1024).toFixed(1)} KB · clique para trocar</p>
              </div>
            </>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-muted-foreground" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              <div className="text-center">
                <p className="font-medium text-foreground">Arraste o CSV ou clique para selecionar</p>
                <p className="text-xs text-muted-foreground">Apenas arquivos .csv · máximo 512 KB</p>
              </div>
            </>
          )}
        </div>

        {state.status === "error" && (
          <p className="rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {state.message}
          </p>
        )}

        <button
          type="submit"
          disabled={!file || state.status === "loading"}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-brand text-sm font-semibold text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
        >
          {state.status === "loading" ? (
            <>
              <svg className="mr-2 h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 12a9 9 0 1 1-6.219-8.56"/>
              </svg>
              Importando…
            </>
          ) : "Importar itens"}
        </button>
      </form>

      {/* Resultado */}
      {state.status === "success" && (
        <div className="rounded-xl border border-border bg-surface p-5">
          <h2 className="mb-4 font-semibold text-foreground">Resultado da importação</h2>

          <div className="mb-4 grid grid-cols-3 gap-3">
            <div className="rounded-lg bg-success/10 p-3 text-center">
              <p className="text-2xl font-bold text-success">{state.result.created}</p>
              <p className="text-xs text-muted-foreground">criados</p>
            </div>
            <div className="rounded-lg bg-brand/10 p-3 text-center">
              <p className="text-2xl font-bold text-brand">{state.result.updated}</p>
              <p className="text-xs text-muted-foreground">atualizados</p>
            </div>
            <div className={`rounded-lg p-3 text-center ${state.result.failed > 0 ? "bg-destructive/10" : "bg-muted"}`}>
              <p className={`text-2xl font-bold ${state.result.failed > 0 ? "text-destructive" : "text-muted-foreground"}`}>
                {state.result.failed}
              </p>
              <p className="text-xs text-muted-foreground">falhas</p>
            </div>
          </div>

          {state.result.errors.length > 0 && (
            <div className="mb-4 space-y-1.5">
              <p className="text-sm font-semibold text-destructive">Linhas com erro:</p>
              {state.result.errors.map((err) => (
                <p key={err.row} className="text-sm text-muted-foreground">
                  <span className="font-mono text-xs text-destructive">Linha {err.row}:</span>{" "}
                  {err.message}
                </p>
              ))}
            </div>
          )}

          {(state.result.created > 0 || state.result.updated > 0) && (
            <Link
              href="/meus-anuncios"
              className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white hover:opacity-90 transition-opacity"
            >
              Ver meus anúncios →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}
