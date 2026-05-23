import { PrismaClient } from "@prisma/client"
import { readFileSync } from "fs"
import { resolve } from "path"

const prisma = new PrismaClient()

// Dollar-quote-aware SQL splitter — handles $$ and $tag$ quoted strings
function splitSQL(sql: string): string[] {
  const statements: string[] = []
  let current = ""
  let inDollarQuote = false
  let dollarTag = ""
  let i = 0

  while (i < sql.length) {
    if (inDollarQuote) {
      if (sql[i] === "$" && sql.startsWith(dollarTag, i)) {
        current += dollarTag
        i += dollarTag.length
        inDollarQuote = false
        dollarTag = ""
        continue
      }
      current += sql[i++]
    } else if (sql[i] === "$") {
      const match = sql.slice(i).match(/^\$[A-Za-z_0-9]*\$/)
      if (match) {
        dollarTag = match[0]
        inDollarQuote = true
        current += dollarTag
        i += dollarTag.length
      } else {
        current += sql[i++]
      }
    } else if (sql[i] === ";") {
      const stmt = current.trim()
      if (hasSQLContent(stmt)) statements.push(stmt)
      current = ""
      i++
    } else {
      current += sql[i++]
    }
  }

  const last = current.trim()
  if (hasSQLContent(last)) statements.push(last)

  return statements
}

function hasSQLContent(stmt: string): boolean {
  return stmt.split("\n").some(line => {
    const t = line.trim()
    return t.length > 0 && !t.startsWith("--") && !t.startsWith("/*")
  })
}

function firstSQLLine(stmt: string): string {
  for (const line of stmt.split("\n")) {
    const t = line.trim()
    if (t.length > 0 && !t.startsWith("--") && !t.startsWith("/*")) return t
  }
  return stmt.slice(0, 60)
}

async function main() {
  const sql = readFileSync(resolve("supabase/rls-policies.sql"), "utf-8")
  const statements = splitSQL(sql)

  console.log(`📋 ${statements.length} statements para executar...`)

  let ok = 0
  let skip = 0

  for (const stmt of statements) {
    const preview = firstSQLLine(stmt).slice(0, 60).replace(/\n/g, " ")
    try {
      await prisma.$executeRawUnsafe(stmt)
      ok++
      process.stdout.write(`✅ ${preview}\n`)
    } catch (e: any) {
      if (e.message?.includes("already exists")) {
        skip++
        process.stdout.write(`⏭️  JÁ EXISTE: ${preview}\n`)
      } else {
        console.error(`❌ ERRO: ${preview}\n   → ${e.message}`)
      }
    }
  }

  console.log(`\n✅ ${ok} aplicados | ⏭️  ${skip} já existiam`)
}

main()
  .catch(e => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
