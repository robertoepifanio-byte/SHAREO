import { NextResponse } from "next/server"
import { z } from "zod"
import * as XLSX from "xlsx"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ItemCondition } from "@prisma/client"

export const runtime = "nodejs"
export const maxDuration = 60

const MAX_ROWS    = 100
const MAX_BYTES   = 512 * 1024  // 512 KB

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i < line.length) {
    if (line[i] === '"') {
      let field = ""
      i++
      while (i < line.length) {
        if (line[i] === '"' && line[i + 1] === '"') { field += '"'; i += 2 }
        else if (line[i] === '"')                   { i++; break }
        else                                         { field += line[i++] }
      }
      fields.push(field)
      if (line[i] === ",") i++
    } else {
      let field = ""
      while (i < line.length && line[i] !== ",") field += line[i++]
      fields.push(field)
      if (line[i] === ",") i++
    }
  }
  return fields
}

function parseCSV(text: string): Record<string, string>[] {
  const content = text.replace(/^﻿/, "")        // remove UTF-8 BOM
  const lines   = content.split(/\r?\n/).filter((l) => l.trim() !== "")
  if (lines.length < 2) return []

  const headers = parseCSVRow(lines[0]).map((h) => h.trim().toLowerCase())
  return lines.slice(1).map((line) => {
    const values = parseCSVRow(line)
    const row: Record<string, string> = {}
    headers.forEach((h, i) => { row[h] = (values[i] ?? "").trim() })
    return row
  })
}

// ─── Excel (.xlsx) parser ─────────────────────────────────────────────────────

function parseXLSX(buffer: ArrayBuffer): Record<string, string>[] {
  const workbook = XLSX.read(buffer, { type: "array" })
  const sheet    = workbook.Sheets[workbook.SheetNames[0]]
  // raw:false converte todos os valores para string; defval:"" preenche células vazias
  return XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { raw: false, defval: "" })
    .map((row) => {
      const normalized: Record<string, string> = {}
      for (const [k, v] of Object.entries(row)) {
        normalized[k.trim().toLowerCase()] = String(v ?? "").trim()
      }
      return normalized
    })
}

// ─── Google Sheets URL → CSV ──────────────────────────────────────────────────

function extractSheetsId(url: string): string | null {
  // Aceita URLs do tipo /spreadsheets/d/{ID}/... (edit, pub, export, etc.)
  const m = url.match(/spreadsheets\/d\/([a-zA-Z0-9_-]+)/)
  return m?.[1] ?? null
}

async function fetchSheetsRows(rawUrl: string): Promise<Record<string, string>[]> {
  const id = extractSheetsId(rawUrl)
  if (!id) throw new Error("URL inválida. Cole o link da planilha do Google Sheets.")

  const apiKey = process.env.GOOGLE_SHEETS_API_KEY
  if (!apiKey) throw new Error("Integração com Google Sheets não configurada. Contate o suporte.")

  // Sheets API v4 — único método confiável para planilhas "anyone with link" a partir de servidor.
  // /export e /gviz/tq redirecionam para HTML em IPs de datacenter (sem cookies de browser).
  const apiUrl = `https://sheets.googleapis.com/v4/spreadsheets/${id}/values/A:Z?key=${encodeURIComponent(apiKey)}`
  const res = await fetch(apiUrl)

  if (!res.ok) {
    if (res.status === 403 || res.status === 404) {
      throw new Error('Não foi possível acessar a planilha. Verifique se ela está compartilhada como "Qualquer pessoa com o link pode visualizar".')
    }
    throw new Error(`Erro ao acessar planilha (${res.status}). Tente novamente.`)
  }

  const json = await res.json() as { values?: string[][] }
  const values = json.values ?? []
  if (values.length < 2) return []

  const headers = values[0].map((h) => h.trim().toLowerCase())
  return values.slice(1).map((row) => {
    const record: Record<string, string> = {}
    headers.forEach((h, i) => { record[h] = (row[i] ?? "").trim() })
    return record
  })
}

// ─── Validação de linha ───────────────────────────────────────────────────────

const CONDITION_MAP: Record<string, ItemCondition> = {
  NOVO:      "NEW",
  EXCELENTE: "EXCELLENT",
  BOM:       "GOOD",
  REGULAR:   "FAIR",
}

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
]

function parsePriceField(v: string | undefined): number | null {
  if (!v || v.trim() === "") return null
  if (!/^\d+([.,]\d{1,2})?$/.test(v.trim())) return null
  return Math.round(parseFloat(v.trim().replace(",", ".")) * 100)
}

const RowSchema = z.object({
  titulo:      z.string().min(3,  "Mínimo 3 caracteres").max(200, "Máximo 200 caracteres"),
  descricao:   z.string().max(2000, "Máximo 2000 caracteres").optional().default(""),
  categoria:   z.string().min(1, "Categoria obrigatória"),
  preco_dia: z
    .string()
    .regex(/^\d+([.,]\d{1,2})?$/, "Preço inválido — use formato 25.00")
    .transform((v) => Math.round(parseFloat(v.replace(",", ".")) * 100)),
  preco_semana: z.string().optional().default(""),
  preco_mes:    z.string().optional().default(""),
  condicao: z
    .string()
    .transform((v) => v.toUpperCase())
    .pipe(z.enum(["NOVO", "EXCELENTE", "BOM", "REGULAR"], {
      errorMap: () => ({ message: "Condição inválida — use: NOVO, EXCELENTE, BOM ou REGULAR" }),
    }))
    .transform((v) => CONDITION_MAP[v] as ItemCondition),
  cidade: z.string().max(100).optional().default(""),
  estado: z
    .string()
    .transform((v) => v.toUpperCase())
    .refine((v) => v === "" || BR_STATES.includes(v), "Estado inválido")
    .optional()
    .default(""),
  bairro: z.string().max(100).optional().default(""),
})

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Autenticação necessária." } },
        { status: 401 },
      )
    }

    if (session.user.userType !== "PJ") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Importação em massa é exclusiva para contas PJ." } },
        { status: 403 },
      )
    }

    const contentLength = Number(req.headers.get("content-length") ?? 0)
    if (contentLength > MAX_BYTES) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "Arquivo muito grande. Máximo 512 KB." } },
        { status: 413 },
      )
    }

    const formData  = await req.formData() as globalThis.FormData
    const file      = formData.get("file")
    const sheetsUrl = formData.get("sheetsUrl")

    // ── Resolver fonte de dados ───────────────────────────────────────────────
    let rows: Record<string, string>[]

    if (sheetsUrl && typeof sheetsUrl === "string" && sheetsUrl.trim()) {
      try {
        rows = await fetchSheetsRows(sheetsUrl.trim())
      } catch (e: unknown) {
        return NextResponse.json(
          { error: { code: "SHEETS_ERROR", message: e instanceof Error ? e.message : "Erro ao acessar planilha." } },
          { status: 400 },
        )
      }
    } else if (file && typeof file !== "string") {
      const f    = file as File
      const name = f.name.toLowerCase()

      if (name.endsWith(".xlsx")) {
        try {
          rows = parseXLSX(await f.arrayBuffer())
        } catch {
          return NextResponse.json(
            { error: { code: "INVALID_FILE", message: "Não foi possível ler o arquivo Excel. Verifique se é um .xlsx válido." } },
            { status: 400 },
          )
        }
      } else {
        rows = parseCSV(await f.text())
      }
    } else {
      return NextResponse.json(
        { error: { code: "NO_INPUT", message: "Envie um arquivo (.csv ou .xlsx) ou cole a URL de uma planilha do Google Sheets." } },
        { status: 400 },
      )
    }

    if (rows.length === 0) {
      return NextResponse.json(
        { error: { code: "EMPTY_FILE", message: "Nenhuma linha de dados encontrada." } },
        { status: 400 },
      )
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: { code: "TOO_MANY_ROWS", message: `Máximo ${MAX_ROWS} linhas por importação.` } },
        { status: 400 },
      )
    }

    // ── Processar linhas ──────────────────────────────────────────────────────
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

    const ownerId = session.user.id
    let created = 0
    let updated = 0
    const errors: { row: number; message: string }[] = []
    const items:  { id: string; title: string; action: "created" | "updated" }[] = []

    for (let i = 0; i < rows.length; i++) {
      const rowNum = i + 2  // +1 para header, +1 para 1-indexed

      const parsed = RowSchema.safeParse(rows[i])
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join("; ")
        errors.push({ row: rowNum, message: msg })
        continue
      }

      const d = parsed.data
      const categoryId = categoryMap.get(d.categoria.toLowerCase())

      if (!categoryId) {
        errors.push({
          row: rowNum,
          message: `Categoria "${d.categoria}" não encontrada. Use: ${categories.map((c) => c.name).join(", ")}`,
        })
        continue
      }

      try {
        const existing = await prisma.item.findFirst({
          where: { ownerId, title: d.titulo, deletedAt: null },
          select: { id: true },
        })

        const sharedData = {
          title:         d.titulo,
          description:   d.descricao,
          categoryId,
          pricePerDay:   d.preco_dia,
          pricePerWeek:  parsePriceField(d.preco_semana) ?? undefined,
          pricePerMonth: parsePriceField(d.preco_mes) ?? undefined,
          condition:     d.condicao,
          city:          d.cidade  || "",
          state:         d.estado  || "",
          neighborhood:  d.bairro  || undefined,
          status:        "DRAFT" as const,
        }

        if (existing) {
          await prisma.item.update({ where: { id: existing.id }, data: sharedData })
          items.push({ id: existing.id, title: d.titulo, action: "updated" })
          updated++
        } else {
          const created_ = await prisma.item.create({
            data:   { ...sharedData, ownerId, latitude: 0, longitude: 0 },
            select: { id: true },
          })
          items.push({ id: created_.id, title: d.titulo, action: "created" })
          created++
        }
      } catch {
        errors.push({ row: rowNum, message: "Erro ao salvar — tente novamente." })
      }
    }

    return NextResponse.json({
      data: { created, updated, failed: errors.length, errors, items },
    })
  } catch (e: unknown) {
    console.error("[POST /api/items/import]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
