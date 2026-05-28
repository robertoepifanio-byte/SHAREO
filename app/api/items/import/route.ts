import { NextResponse } from "next/server"
import { z } from "zod"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import type { ItemCondition } from "@prisma/client"

const MAX_ROWS    = 100
const MAX_BYTES   = 512 * 1024  // 512 KB

// ─── CSV parser ──────────────────────────────────────────────────────────────

function parseCSVRow(line: string): string[] {
  const fields: string[] = []
  let i = 0
  while (i <= line.length) {
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

    const contentLength = Number(req.headers.get("content-length") ?? 0)
    if (contentLength > MAX_BYTES) {
      return NextResponse.json(
        { error: { code: "FILE_TOO_LARGE", message: "Arquivo muito grande. Máximo 512 KB." } },
        { status: 413 },
      )
    }

    const formData = await req.formData() as globalThis.FormData
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return NextResponse.json(
        { error: { code: "NO_FILE", message: "Nenhum arquivo enviado." } },
        { status: 400 },
      )
    }

    const text = await (file as File).text()
    const rows = parseCSV(text)

    if (rows.length === 0) {
      return NextResponse.json(
        { error: { code: "EMPTY_FILE", message: "Arquivo sem linhas de dados." } },
        { status: 400 },
      )
    }

    if (rows.length > MAX_ROWS) {
      return NextResponse.json(
        { error: { code: "TOO_MANY_ROWS", message: `Máximo ${MAX_ROWS} linhas por importação.` } },
        { status: 400 },
      )
    }

    // Carregar categorias uma vez
    const categories = await prisma.category.findMany({ select: { id: true, name: true } })
    const categoryMap = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]))

    if (session.user.userType !== "PJ") {
      return NextResponse.json(
        { error: { code: "FORBIDDEN", message: "Importação em massa é exclusiva para contas PJ." } },
        { status: 403 },
      )
    }

    const ownerId = session.user.id
    let created = 0
    let updated = 0
    const errors: { row: number; message: string }[] = []

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
        // Upsert: mesmo título + mesmo dono → atualiza; senão cria
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
          isActive:      true,
        }

        if (existing) {
          await prisma.item.update({ where: { id: existing.id }, data: sharedData })
          updated++
        } else {
          // latitude/longitude são obrigatórios no schema; padrão 0 para itens importados sem geo
          await prisma.item.create({
            data: { ...sharedData, ownerId },
          })
          created++
        }
      } catch {
        errors.push({ row: rowNum, message: "Erro ao salvar — tente novamente." })
      }
    }

    return NextResponse.json({
      data: { created, updated, failed: errors.length, errors },
    })
  } catch (e: unknown) {
    console.error("[POST /api/items/import]", e instanceof Error ? e.message : e)
    return NextResponse.json(
      { error: { code: "INTERNAL_ERROR", message: "Erro interno." } },
      { status: 500 },
    )
  }
}
