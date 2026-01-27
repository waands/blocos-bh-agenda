import crypto from "node:crypto"
import fs from "node:fs"
import path from "node:path"
import { parse } from "csv-parse/sync"
import { createClient } from "@supabase/supabase-js"
import { z } from "zod"

const rowSchema = z.object({
  DATA: z.string(),
  "HORÁRIO": z.string().optional().default(""),
  BLOCO: z.string(),
  "LOCAL DA CONCETRAÇÃO": z.string(),
  RITMOS: z.string().optional().default(""),
  "TAMANHO PÚBLICO": z.string().optional().default(""),
  LGBT: z.string().optional().default(""),
})

function loadEnvFile(filename: string) {
  const filePath = path.resolve(process.cwd(), filename)
  if (!fs.existsSync(filePath)) return
  const content = fs.readFileSync(filePath, "utf-8")
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const [key, ...rest] = trimmed.split("=")
    if (!key) continue
    const value = rest.join("=").replace(/^\"|\"$/g, "")
    if (!process.env[key]) {
      process.env[key] = value
    }
  }
}

type ParsedRow = z.infer<typeof rowSchema>

type NormalizedEvent = {
  id: string
  title: string
  starts_at: string
  ends_at: string | null
  all_day: boolean
  location: string
  ritmos: string
  tamanho_publico: string
  lgbt: string
}

const YEAR_ARG = "--year"
const DEFAULT_YEAR = 2026

const argIndex = process.argv.indexOf(YEAR_ARG)
const year =
  argIndex !== -1 && process.argv[argIndex + 1]
    ? Number(process.argv[argIndex + 1])
    : DEFAULT_YEAR

if (!Number.isInteger(year) || year < 2000 || year > 2100) {
  throw new Error(`Ano invalido: ${process.argv[argIndex + 1] ?? ""}`)
}

loadEnvFile(".env.local")
loadEnvFile("chaves.env.local")

const supabaseUrl = process.env.SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error(
    "Defina SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY no ambiente."
  )
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false },
})

function normalizeDate(dateValue: string, targetYear: number) {
  const trimmed = dateValue.trim()
  const match = trimmed.match(/^(\d{2})\/(\d{2})$/)
  if (!match) return null
  const [, day, month] = match
  const iso = `${targetYear}-${month}-${day}`
  return iso
}

function normalizeTime(timeValue: string) {
  const trimmed = timeValue.trim().toLowerCase()
  if (!trimmed || trimmed === "a divulgar") return null
  const match = trimmed.match(/^(\d{1,2})h(\d{2})?$/)
  if (!match) return null
  const hours = match[1].padStart(2, "0")
  const minutes = match[2] ? match[2] : "00"
  return `${hours}:${minutes}`
}

function buildKey(event: NormalizedEvent) {
  return `${event.title}|${event.starts_at}|${event.location}`
}

const csvPath = path.resolve(process.cwd(), "data", "blocos_bh.csv")
const csvContent = fs.readFileSync(csvPath, "utf-8")

const records = parse(csvContent, {
  columns: true,
  skip_empty_lines: true,
  relax_quotes: true,
  relax_column_count: true,
}) as Record<string, string>[]

const parsedRows: ParsedRow[] = []
const invalidRows: string[] = []

for (const [index, record] of records.entries()) {
  const result = rowSchema.safeParse(record)
  if (!result.success) {
    invalidRows.push(`linha ${index + 2}`)
    continue
  }
  parsedRows.push(result.data)
}

let ignored = invalidRows.length

const normalized: NormalizedEvent[] = []

for (const row of parsedRows) {
  const dateIso = normalizeDate(row.DATA, year)
  if (!dateIso) {
    ignored += 1
    continue
  }

  const time = normalizeTime(row["HORÁRIO"] ?? "")
  const starts_at = time ? `${dateIso}T${time}:00-03:00` : `${dateIso}T00:00:00-03:00`
  const all_day = time === null

  const event: NormalizedEvent = {
    id: crypto.randomUUID(),
    title: row.BLOCO.trim(),
    starts_at,
    ends_at: null,
    all_day,
    location: row["LOCAL DA CONCETRAÇÃO"].trim(),
    ritmos: row.RITMOS?.trim() ?? "",
    tamanho_publico: row["TAMANHO PÚBLICO"]?.trim() ?? "",
    lgbt: row.LGBT?.trim() ?? "",
  }

  normalized.push(event)
}

const startRange = `${year}-01-01T00:00:00-03:00`
const endRange = `${year + 1}-01-01T00:00:00-03:00`

const run = async () => {
  const { data: existingRows, error: existingError } = await supabase
    .from("events_base")
    .select("id,title,starts_at,location")
    .gte("starts_at", startRange)
    .lt("starts_at", endRange)

  if (existingError) {
    throw existingError
  }

  const existingMap = new Map<string, { id: string }>()
  for (const row of existingRows ?? []) {
    const key = `${row.title}|${row.starts_at}|${row.location}`
    existingMap.set(key, { id: row.id })
  }

  let toInsert = 0
  let toUpdate = 0

  const payload = normalized.map((event) => {
    const key = buildKey(event)
    const existing = existingMap.get(key)
    if (existing) {
      toUpdate += 1
      return { ...event, id: existing.id }
    }
    toInsert += 1
    return event
  })

  if (payload.length > 0) {
    const { error } = await supabase.from("events_base").upsert(payload)
    if (error) {
      throw error
    }
  }

  console.log("Importacao concluida")
  console.log(`Inseridos: ${toInsert}`)
  console.log(`Atualizados: ${toUpdate}`)
  console.log(`Ignorados: ${ignored}`)
}

run().catch((error) => {
  console.error(error)
  process.exit(1)
})
