"use client"

import { useState, useEffect, useRef, useCallback, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"
import { ListingQualityIndicator } from "./ListingQualityIndicator"
import { ItemCardPreview } from "./ItemCardPreview"

// ─── Types ───────────────────────────────────────────────────────────────────

interface Category {
  id:   string
  name: string
  slug: string
}

interface ExistingImage {
  type: "existing"
  id:   string
  url:  string
}

interface NewImage {
  type:       "new"
  file:       File
  previewUrl: string
}

type ImageEntry = ExistingImage | NewImage

interface InitialData {
  id:            string
  title:         string
  description:   string
  categoryId:    string
  condition:     string
  pricePerDay:   number
  pricePerWeek?: number | null
  pricePerMonth?: number | null
  depositAmount?:        number | null
  estimatedRetailPrice?: number | null
  address?:              string | null
  city:           string
  state:          string
  neighborhood?:  string | null
  latitude:       number
  longitude:      number
  images:         { id: string; url: string; order: number }[]
  voltage?:               string | null
  requireIdVerification?: boolean
  requirePhone?:          boolean
}

interface ItemFormProps {
  mode:               "create" | "edit"
  initialData?:       InitialData
  weeklyMultiplier?:  number
  monthlyMultiplier?: number
}

// ─── Sugestão de preço por faixa de valor do bem ─────────────────────────────
interface PriceBand { minRate: number; maxRate: number }

function getPriceBand(retailCents: number): PriceBand {
  if (retailCents <= 20_000)  return { minRate: 0.05, maxRate: 0.08 } // até R$200
  if (retailCents <= 100_000) return { minRate: 0.03, maxRate: 0.05 } // R$200–R$1.000
  if (retailCents <= 500_000) return { minRate: 0.02, maxRate: 0.04 } // R$1.000–R$5.000
  return                             { minRate: 0.01, maxRate: 0.03 } // acima R$5.000
}

function fmtPct(r: number) { return `${(r * 100).toFixed(0)}%` }

// Categorias onde faz sentido exibir campo de voltagem
const ELECTRICAL_CATEGORIES = new Set([
  "ferramentas", "eletronicos", "construcao", "casa-jardim", "festas",
])

// ─── Helpers ─────────────────────────────────────────────────────────────────

const BR_STATES = [
  "AC","AL","AM","AP","BA","CE","DF","ES","GO","MA",
  "MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN",
  "RO","RR","RS","SC","SE","SP","TO",
]

const CONDITIONS = [
  { value: "NEW",       label: "Novo" },
  { value: "EXCELLENT", label: "Excelente" },
  { value: "GOOD",      label: "Bom" },
  { value: "FAIR",      label: "Regular" },
]

function toCents(display: string): number {
  const n = parseFloat(display.replace(",", "."))
  return isNaN(n) ? 0 : Math.round(n * 100)
}

function toDisplay(cents: number | null | undefined): string {
  if (!cents) return ""
  return (cents / 100).toFixed(2).replace(".", ",")
}

// ─── Price input helper ───────────────────────────────────────────────────────

function PriceInput({
  id, label, value, onChange, required, helper, onFocus, onBlur,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void
  required?: boolean; helper?: string
  onFocus?: () => void; onBlur?: () => void
}) {
  const helperId = helper ? `${id}-helper` : undefined
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium text-foreground">
        {label}
        {required && <span className="ml-1 text-destructive" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <span className="absolute inset-y-0 left-3 flex items-center text-sm text-muted-foreground select-none" aria-hidden="true">
          R$
        </span>
        <input
          id={id}
          type="text"
          inputMode="decimal"
          value={value}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9,]/g, "")
            onChange(raw)
          }}
          onFocus={onFocus}
          onBlur={onBlur}
          placeholder="0,00"
          aria-describedby={helperId}
          className={[
            "h-11 w-full rounded-md border border-input bg-surface pl-10 pr-3 text-sm text-foreground",
            "placeholder:text-muted-foreground outline-none transition-colors",
            "focus:border-ring focus:ring-2 focus:ring-ring/20",
          ].join(" ")}
        />
      </div>
      {helper && <p id={helperId} className="text-xs text-muted-foreground">{helper}</p>}
    </div>
  )
}

// ─── Componente ──────────────────────────────────────────────────────────────

export function ItemForm({ mode, initialData, weeklyMultiplier = 3, monthlyMultiplier = 15 }: ItemFormProps) {
  const router = useRouter()

  // Form fields
  const [title,         setTitle]         = useState(initialData?.title         ?? "")
  const [description,   setDescription]   = useState(initialData?.description   ?? "")
  const [categoryId,    setCategoryId]    = useState(initialData?.categoryId    ?? "")
  const [condition,     setCondition]     = useState(initialData?.condition     ?? "GOOD")
  const [pricePerDay,   setPricePerDay]   = useState(toDisplay(initialData?.pricePerDay))
  const [pricePerWeek,  setPricePerWeek]  = useState(toDisplay(initialData?.pricePerWeek))
  const [pricePerMonth, setPricePerMonth] = useState(toDisplay(initialData?.pricePerMonth))
  const [depositAmount,        _setDepositAmount]       = useState(toDisplay(initialData?.depositAmount))
  const [estimatedRetailPrice, setEstimatedRetailPrice] = useState(toDisplay(initialData?.estimatedRetailPrice))
  const [address,       setAddress]       = useState(initialData?.address       ?? "")
  const [city,          setCity]          = useState(initialData?.city          ?? (process.env.NEXT_PUBLIC_DEFAULT_CITY ?? ""))
  const [state,         setState]         = useState(initialData?.state         ?? (process.env.NEXT_PUBLIC_DEFAULT_STATE ?? ""))
  const [neighborhood,  setNeighborhood]  = useState(initialData?.neighborhood  ?? "")
  const [latitude,      setLatitude]      = useState(initialData?.latitude      ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? -5.7945))
  const [longitude,     setLongitude]     = useState(initialData?.longitude     ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? -35.211))
  const [voltage,               setVoltage]               = useState<string>(initialData?.voltage ?? "")
  const [requireIdVerification, setRequireIdVerification] = useState(initialData?.requireIdVerification ?? false)
  const [requirePhone,          setRequirePhone]          = useState(initialData?.requirePhone          ?? false)

  // Images
  const [images, setImages] = useState<ImageEntry[]>(
    initialData?.images.map((img) => ({ type: "existing", id: img.id, url: img.url })) ?? []
  )
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

  // Prevents double-submit: ref is synchronous (no re-render delay)
  const submittingRef = useRef(false)

  // UI state
  const [categories,    setCategories]    = useState<Category[]>([])
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [loading,       setLoading]       = useState(false)
  const [geocoding,     setGeocoding]     = useState(false)
  const [geocodeResult, setGeocodeResult] = useState<"ok" | "not_found" | "error" | null>(
    initialData?.latitude ? "ok" : null
  )
  const gpsUsedRef = useRef(false)
  const fileInputRef    = useRef<HTMLInputElement>(null)
  const cameraInputRef  = useRef<HTMLInputElement>(null)

  // Endereço do perfil do usuário (usado no modo create para pré-preencher)
  const [profileAddress, setProfileAddress] = useState<{
    city: string; state: string; neighborhood: string; address: string
  } | null>(null)
  const [profileAddressLoaded, setProfileAddressLoaded] = useState(false)

  // P2-52 — Sugestão de preço médio da região
  const [regionSuggestion, setRegionSuggestion] = useState<{
    rangeMinCents: number
    rangeMaxCents: number
    count:         number
  } | null>(null)

  // Dica ativa por campo (P2-62)
  const [activeTip, setActiveTip] = useState<string | null>(null)

  // Sugestão de preço por faixa de valor do bem
  const [priceSuggestion, setPriceSuggestion] = useState<PriceBand | null>(() => {
    const retailCents = toCents(toDisplay(initialData?.estimatedRetailPrice))
    return retailCents > 0 ? getPriceBand(retailCents) : null
  })

  // Price suggestion derived from selected category (usado apenas para isElectrical)
  const selectedCat  = categories.find((c) => c.id === categoryId)
  const isElectrical = selectedCat ? ELECTRICAL_CATEGORIES.has(selectedCat.slug) : false

  function applyRetailSuggestion(retailDisplay: string) {
    const retailCents = toCents(retailDisplay)
    if (retailCents <= 0) { setPriceSuggestion(null); return }
    const band = getPriceBand(retailCents)
    setPriceSuggestion(band)
    const suggestedDayCents = Math.round(retailCents * band.minRate)
    if (!toCents(pricePerDay)) {
      const dayDisplay = (suggestedDayCents / 100).toFixed(2).replace(".", ",")
      setPricePerDay(dayDisplay)
      setErrors((p) => ({ ...p, pricePerDay: undefined! }))
      if (!toCents(pricePerWeek))
        setPricePerWeek(((suggestedDayCents * weeklyMultiplier) / 100).toFixed(2).replace(".", ","))
      if (!toCents(pricePerMonth))
        setPricePerMonth(((suggestedDayCents * monthlyMultiplier) / 100).toFixed(2).replace(".", ","))
    }
  }

  function autoWeekly() {
    const cents = toCents(pricePerDay)
    if (!cents) return
    setPricePerWeek(((cents * weeklyMultiplier) / 100).toFixed(2).replace(".", ","))
  }

  function autoMonthly() {
    const cents = toCents(pricePerDay)
    if (!cents) return
    setPricePerMonth(((cents * monthlyMultiplier) / 100).toFixed(2).replace(".", ","))
  }

  // Load categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ data }) => setCategories(data ?? []))
      .catch(() => {})
  }, [])

  // No modo create, busca o endereço do perfil para pré-preencher localização
  useEffect(() => {
    if (mode !== "create") return
    fetch("/api/users/me")
      .then((r) => r.json())
      .then(({ data }) => {
        const c = data?.city?.trim()
        const s = data?.state?.trim()
        if (c && s) {
          const addr = {
            city:         c,
            state:        s,
            neighborhood: data?.neighborhood?.trim() ?? "",
            address:      data?.street?.trim()       ?? "",
          }
          setProfileAddress(addr)
          setCity(c)
          setState(s)
          setNeighborhood(addr.neighborhood)
          setAddress(addr.address)
        }
        setProfileAddressLoaded(true)
      })
      .catch(() => setProfileAddressLoaded(true))
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  // P2-52 — Buscar sugestão de preço da região ao mudar categoria ou cidade
  useEffect(() => {
    if (!categoryId || city.trim().length < 2) { setRegionSuggestion(null); return }
    const params = new URLSearchParams({ city: city.trim(), categoryId })
    fetch(`/api/items/price-suggestion?${params.toString()}`)
      .then((r) => r.json())
      .then(({ data }) => setRegionSuggestion(data ?? null))
      .catch(() => setRegionSuggestion(null))
  }, [categoryId, city])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.type === "new") URL.revokeObjectURL(img.previewUrl)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Location ──────────────────────────────────────────────────────────────

  async function geocodeAddress() {
    if (gpsUsedRef.current) return
    const query = [neighborhood.trim(), city.trim(), state, "Brasil"].filter(Boolean).join(", ")
    if (city.trim().length < 2) return
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN
    if (!token || token.endsWith("...")) return

    setGeocoding(true)
    setGeocodeResult(null)
    try {
      const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json` +
        `?access_token=${token}&country=BR&language=pt&limit=1&types=place,locality,neighborhood,address`
      const res  = await fetch(url)
      const data = await res.json() as { features?: { center: [number, number] }[] }
      const feature = data?.features?.[0]
      if (feature) {
        const [lng, lat] = feature.center
        setLatitude(lat)
        setLongitude(lng)
        setGeocodeResult("ok")
      } else {
        setGeocodeResult("not_found")
      }
    } catch {
      setGeocodeResult("error")
    } finally {
      setGeocoding(false)
    }
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  const addFiles = useCallback((files: File[]) => {
    setImages((prev) => {
      const visible   = prev.filter((i) => !(i.type === "existing" && deletedImageIds.includes((i as ExistingImage).id)))
      const remaining = 3 - visible.length
      const toAdd     = files.slice(0, remaining)
      const newEntries: NewImage[] = toAdd.map((file) => ({
        type:       "new",
        file,
        previewUrl: URL.createObjectURL(file),
      }))
      return [...prev, ...newEntries]
    })
  }, [deletedImageIds])

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    addFiles(files)
    e.target.value = "" // reset so the same file can be re-selected
  }

  function removeImage(index: number) {
    const img = images[index]
    if (img.type === "existing") {
      setDeletedImageIds((prev) => [...prev, img.id])
    } else {
      URL.revokeObjectURL(img.previewUrl)
    }
    setImages((prev) => prev.filter((_, i) => i !== index))
  }

  // ─── Validation ────────────────────────────────────────────────────────────

  function validate(): Record<string, string> {
    const errs: Record<string, string> = {}
    if (title.trim().length < 5)       errs.title       = "Título: mínimo 5 caracteres"
    if (description.trim().length < 20) errs.description = "Descrição: mínimo 20 caracteres"
    if (!categoryId)                    errs.categoryId  = "Selecione uma categoria"
    const dayPrice = toCents(pricePerDay)
    if (dayPrice < 100)                 errs.pricePerDay = "Preço mínimo: R$ 1,00/dia"
    if (city.trim().length < 2)         errs.city        = "Cidade obrigatória"
    if (state.length !== 2)             errs.state       = "Selecione o estado"
    return errs
  }

  // ─── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (submittingRef.current) return
    submittingRef.current = true

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      window.scrollTo({ top: 0, behavior: "smooth" })
      submittingRef.current = false
      return
    }

    setErrors({})
    setLoading(true)

    const payload = {
      title:         title.trim(),
      description:   description.trim(),
      categoryId,
      condition,
      pricePerDay:   toCents(pricePerDay),
      pricePerWeek:  pricePerWeek  ? toCents(pricePerWeek)  : null,
      pricePerMonth: pricePerMonth ? toCents(pricePerMonth) : null,
      depositAmount:        depositAmount        ? toCents(depositAmount)        : null,
      estimatedRetailPrice: estimatedRetailPrice ? toCents(estimatedRetailPrice) : null,
      address:       address.trim() || undefined,
      city:          city.trim(),
      state,
      neighborhood:  neighborhood.trim() || undefined,
      latitude,
      longitude,
      voltage:       voltage || null,
      requireIdVerification,
      requirePhone,
    }

    try {
      let itemId: string

      if (mode === "create") {
        const res  = await fetch("/api/items", {
          method:  "POST",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) {
          const details = json.error?.details as Record<string, string[]> | undefined
          if (details) {
            const mapped: Record<string, string> = {}
            for (const [k, msgs] of Object.entries(details)) mapped[k] = msgs[0]
            setErrors(mapped)
          } else {
            setErrors({ form: json.error?.message ?? "Erro ao criar anúncio." })
          }
          setLoading(false)
          return
        }
        itemId = json.data.id
      } else {
        // Edit mode
        itemId = initialData!.id
        const res  = await fetch(`/api/items/${itemId}`, {
          method:  "PUT",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify(payload),
        })
        const json = await res.json()
        if (!res.ok) {
          setErrors({ form: json.error?.message ?? "Erro ao atualizar anúncio." })
          setLoading(false)
          return
        }

        // Delete removed images
        for (const imgId of deletedImageIds) {
          await fetch(`/api/items/${itemId}/images`, {
            method:  "DELETE",
            headers: { "Content-Type": "application/json" },
            body:    JSON.stringify({ imageId: imgId }),
          }).catch(() => {})
        }
      }

      // Upload new images — mostra erros ao usuário
      const newImages = images.filter((img): img is NewImage => img.type === "new")
      const uploadErrors: string[] = []

      for (let i = 0; i < newImages.length; i++) {
        const img = newImages[i]
        const fd = new FormData()
        fd.append("file", img.file)
        try {
          const res  = await fetch(`/api/items/${itemId}/images`, { method: "POST", body: fd })
          const json = await res.json().catch(() => ({}))
          if (!res.ok) {
            uploadErrors.push(`Foto ${i + 1}: ${json.error?.message ?? "falha no upload"}`)
          }
        } catch {
          uploadErrors.push(`Foto ${i + 1}: erro de rede`)
        }
      }

      if (uploadErrors.length > 0) {
        setErrors({ form: `Anúncio salvo, mas ${uploadErrors.length} foto(s) não foram enviadas: ${uploadErrors.join("; ")}. Tente editar o anúncio e adicionar novamente.` })
        setLoading(false)
        return
      }

      window.location.href = `/itens/${itemId}`
    } catch {
      setErrors({ form: "Erro inesperado. Tente novamente." })
      setLoading(false)
      submittingRef.current = false
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const visibleImages = images.filter(
    (img) => !(img.type === "existing" && deletedImageIds.includes(img.id))
  )

  // P2-62 — dados para preview e indicador de qualidade
  const selectedCatName  = categories.find((c) => c.id === categoryId)?.name ?? ""
  const firstPreviewUrl  = visibleImages[0]
    ? (visibleImages[0].type === "existing" ? visibleImages[0].url : visibleImages[0].previewUrl)
    : undefined

  // Dicas inline por campo (P2-62)
  const FIELD_TIPS: Record<string, string> = {
    title:      "Use palavras que as pessoas buscariam (ex: 'Câmera Sony A6400')",
    description:"Seja específico: estado de conservação, inclui acessórios, como usar.",
    photos:     "Anúncios com 3 fotos recebem 4× mais contatos.",
    pricePerDay:"Itens com preço justo aluguem 2× mais rápido.",
  }

  return (
    <div className="lg:grid lg:grid-cols-[1fr_220px] lg:gap-8 lg:items-start">
      {/* ── Coluna principal ─────────────────────────────────── */}
      <div>
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {errors.form && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.form}
        </div>
      )}

      {/* P2-62 — Indicador de qualidade do anúncio */}
      <ListingQualityIndicator
        title={title}
        description={description}
        photoCount={visibleImages.length}
        pricePerDay={pricePerDay}
        categoryId={categoryId}
        city={city}
      />

      {/* ── Informações básicas ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-primary">Informações básicas</h2>

        <div>
          <Input
            label="Título do anúncio"
            type="text"
            placeholder="Ex: Furadeira Bosch 650W — ideal para reformas"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined! })) }}
            onFocus={() => setActiveTip("title")}
            onBlur={() => setActiveTip(null)}
            error={errors.title}
            required
            disabled={loading}
            helper="Seja específico: marca, modelo e destaque principal"
          />
          {activeTip === "title" && (
            <p className="mt-1 text-xs text-brand" role="status">{FIELD_TIPS.title}</p>
          )}
        </div>

        <div>
          <Textarea
            label="Descrição"
            placeholder="Descreva o item: características, inclui acessórios, instruções de uso, restrições..."
            value={description}
            onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined! })) }}
            onFocus={() => setActiveTip("description")}
            onBlur={() => setActiveTip(null)}
            error={errors.description}
            required
            disabled={loading}
            rows={5}
            helper={`${description.length}/2000 caracteres`}
          />
          {activeTip === "description" && (
            <p className="mt-1 text-xs text-brand" role="status">{FIELD_TIPS.description}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Select
            label="Categoria"
            value={categoryId}
            onChange={(e) => { setCategoryId(e.target.value); setErrors((p) => ({ ...p, categoryId: undefined! })) }}
            error={errors.categoryId}
            placeholder="Selecione..."
            required
            disabled={loading || categories.length === 0}
          >
            {categories.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </Select>

          <Select
            label="Estado de conservação"
            value={condition}
            onChange={(e) => setCondition(e.target.value)}
            required
            disabled={loading}
          >
            {CONDITIONS.map((c) => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </Select>
        </div>

        {/* Voltagem — exibida apenas para categorias elétricas */}
        {isElectrical && (
          <div className="flex flex-col gap-1.5">
            <label htmlFor="voltage" className="text-sm font-medium text-foreground">
              Voltagem
            </label>
            <select
              id="voltage"
              value={voltage}
              onChange={(e) => setVoltage(e.target.value)}
              disabled={loading}
              className="h-11 w-full rounded-md border border-input bg-surface px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/20 transition-colors"
            >
              <option value="">Não informado</option>
              <option value="110V">110V</option>
              <option value="220V">220V</option>
              <option value="Bivolt">Bivolt (110V/220V)</option>
            </select>
          </div>
        )}
      </section>

      {/* ── Preços ─────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-primary">Preços</h2>

        {/* Valor do bem — base para sugestão de preços */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <PriceInput
              id="estimated-retail-price"
              label="Valor de compra estimado"
              value={estimatedRetailPrice}
              onChange={setEstimatedRetailPrice}
              onBlur={() => applyRetailSuggestion(estimatedRetailPrice)}
              helper="Preencha para calcular automaticamente a diária sugerida"
            />
            {priceSuggestion && (
              <p className="mt-1 text-xs text-brand">
                💡 Sugestão: diária de <strong>{fmtPct(priceSuggestion.minRate)} a {fmtPct(priceSuggestion.maxRate)}</strong> do valor do bem
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <PriceInput
              id="price-per-day"
              label="Preço por dia"
              value={pricePerDay}
              onChange={(v) => { setPricePerDay(v); setErrors((p) => ({ ...p, pricePerDay: undefined! })) }}
              onFocus={() => setActiveTip("pricePerDay")}
              onBlur={() => setActiveTip(null)}
              required
            />
            {errors.pricePerDay && (
              <p role="alert" className="mt-1 text-xs text-destructive">{errors.pricePerDay}</p>
            )}
            {priceSuggestion && (
              <p className="mt-1 text-xs text-muted-foreground">
                Faixa sugerida:{" "}
                <span className="font-semibold text-foreground">
                  R$ {(toCents(estimatedRetailPrice) * priceSuggestion.minRate / 100).toFixed(2).replace(".", ",")}
                  {" – "}
                  R$ {(toCents(estimatedRetailPrice) * priceSuggestion.maxRate / 100).toFixed(2).replace(".", ",")}
                </span>
                <span className="ml-1 opacity-60">({fmtPct(priceSuggestion.minRate)}–{fmtPct(priceSuggestion.maxRate)} do valor do bem)</span>
              </p>
            )}
            {/* P2-52 — Preço médio na região */}
            {regionSuggestion && (
              <p className="mt-1 text-xs text-muted-foreground">
                Preço médio na sua região:{" "}
                <span className="font-semibold text-foreground">
                  R$ {(regionSuggestion.rangeMinCents / 100).toFixed(2).replace(".", ",")}
                  {" – "}
                  R$ {(regionSuggestion.rangeMaxCents / 100).toFixed(2).replace(".", ",")}
                </span>
                <span className="ml-1 opacity-60">({regionSuggestion.count} anúncios)</span>
              </p>
            )}
            {activeTip === "pricePerDay" && (
              <p className="mt-1 text-xs text-brand" role="status">{FIELD_TIPS.pricePerDay}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <PriceInput
              id="price-per-week"
              label="Preço por semana"
              value={pricePerWeek}
              onChange={setPricePerWeek}
            />
            {priceSuggestion ? (
              <p className="text-[11px] text-muted-foreground">
                Sugerido: R$ {(toCents(estimatedRetailPrice) * priceSuggestion.minRate * weeklyMultiplier / 100).toFixed(2).replace(".", ",")}
                <span className="ml-1 opacity-70">({weeklyMultiplier}× diária mín.) — Desconto para locações ≥ 7 dias</span>
              </p>
            ) : (
              toCents(pricePerDay) > 0 && !toCents(pricePerWeek) && (
                <button
                  type="button"
                  onClick={autoWeekly}
                  disabled={loading}
                  className="self-start text-[11px] text-brand hover:underline disabled:opacity-50"
                >
                  Calcular ({weeklyMultiplier}× diária = R$ {((toCents(pricePerDay) * weeklyMultiplier) / 100).toFixed(2).replace(".", ",")})
                </button>
              )
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <PriceInput
              id="price-per-month"
              label="Preço por mês"
              value={pricePerMonth}
              onChange={setPricePerMonth}
            />
            {priceSuggestion ? (
              <p className="text-[11px] text-muted-foreground">
                Sugerido: R$ {(toCents(estimatedRetailPrice) * priceSuggestion.minRate * monthlyMultiplier / 100).toFixed(2).replace(".", ",")}
                <span className="ml-1 opacity-70">({monthlyMultiplier}× diária mín.) — Desconto para locações ≥ 30 dias</span>
              </p>
            ) : (
              toCents(pricePerDay) > 0 && !toCents(pricePerMonth) && (
                <button
                  type="button"
                  onClick={autoMonthly}
                  disabled={loading}
                  className="self-start text-[11px] text-brand hover:underline disabled:opacity-50"
                >
                  Calcular ({monthlyMultiplier}× diária = R$ {((toCents(pricePerDay) * monthlyMultiplier) / 100).toFixed(2).replace(".", ",")})
                </button>
              )
            )}
          </div>

          {/* Caução oculta no MVP (D2) — FIN-6 pós V1-Financeiro */}
        </div>
      </section>

      {/* ── Localização ─────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-primary">Localização</h2>

        {/* Banner: endereço do perfil pré-preenchido (somente leitura) */}
        {mode === "create" && profileAddressLoaded && profileAddress && (
          <div className="flex items-start gap-2 rounded-lg border border-brand/20 bg-brand/5 px-3 py-2.5 text-xs text-brand">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
            </svg>
            <span>
              Endereço do seu perfil.{" "}
              Para alterar,{" "}
              <Link href="/perfil/endereco" className="underline font-semibold hover:opacity-80">
                edite seu endereço no perfil
              </Link>.
            </span>
          </div>
        )}

        {/* Banner: endereço do perfil não cadastrado */}
        {mode === "create" && profileAddressLoaded && !profileAddress && (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs text-amber-700">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-0.5 shrink-0" aria-hidden="true">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span>
              Você ainda não tem um endereço cadastrado.{" "}
              <Link href="/perfil/endereco" className="underline font-semibold hover:opacity-80">
                Cadastre seu endereço no perfil
              </Link>{" "}
              para que ele apareça automaticamente em todos os seus anúncios.
            </span>
          </div>
        )}

        {errors.location && (
          <p role="alert" className="text-xs text-destructive">{errors.location}</p>
        )}

        {/* Status de geocoding */}
        {geocoding && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            Buscando coordenadas…
          </div>
        )}
        {!geocoding && geocodeResult === "ok" && (
          <p className="text-xs text-success">
            📍 Localização encontrada — {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        )}
        {!geocoding && geocodeResult === "not_found" && (
          <p className="text-xs text-amber-600">
            ⚠️ Endereço não encontrado no mapa. Verifique cidade e estado no seu perfil.
          </p>
        )}
        {!geocoding && geocodeResult === "error" && (
          <p className="text-xs text-destructive">
            Erro ao buscar localização. Tente novamente.
          </p>
        )}

        {/* Campos somente leitura no create (endereço vem do perfil); editáveis apenas no edit */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="md:col-span-2">
            <Input
              label="Cidade"
              type="text"
              placeholder="Natal"
              value={city}
              onChange={(e) => {
                if (mode === "create") return
                setCity(e.target.value)
                setErrors((p) => ({ ...p, city: undefined! }))
                gpsUsedRef.current = false
                setGeocodeResult(null)
              }}
              onBlur={mode === "edit" ? geocodeAddress : undefined}
              error={errors.city}
              required
              disabled={loading || mode === "create"}
            />
          </div>
          <Select
            label="Estado"
            value={state}
            onChange={(e) => {
              if (mode === "create") return
              setState(e.target.value)
              setErrors((p) => ({ ...p, state: undefined! }))
              gpsUsedRef.current = false
              setGeocodeResult(null)
            }}
            onBlur={mode === "edit" ? geocodeAddress : undefined}
            error={errors.state}
            placeholder="UF"
            required
            disabled={loading || mode === "create"}
          >
            {BR_STATES.map((uf) => (
              <option key={uf} value={uf}>{uf}</option>
            ))}
          </Select>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Input
            label="Bairro"
            type="text"
            placeholder="Ponta Negra"
            value={neighborhood}
            onChange={(e) => { if (mode !== "create") setNeighborhood(e.target.value) }}
            onBlur={mode === "edit" ? geocodeAddress : undefined}
            helper="Opcional — melhora a precisão no mapa"
            disabled={loading || mode === "create"}
          />
          <Input
            label="Endereço"
            type="text"
            placeholder="Rua das Dunas, 123"
            value={address}
            onChange={(e) => { if (mode !== "create") setAddress(e.target.value) }}
            helper="Opcional — só compartilhado após confirmação"
            disabled={loading || mode === "create"}
          />
        </div>
      </section>

      {/* ── Fotos ───────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Fotos</h2>
          <span className="text-xs text-muted-foreground">{visibleImages.length}/3</span>
        </div>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {visibleImages.map((img, idx) => (
            <div key={img.type === "existing" ? img.id : img.previewUrl} className="group relative aspect-square overflow-hidden rounded-md bg-muted">
              <Image
                src={img.type === "existing" ? img.url : img.previewUrl}
                alt={`Foto ${idx + 1}`}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, 25vw"
              />
              {idx === 0 && (
                <span className="absolute left-1 top-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-white">
                  Capa
                </span>
              )}
              <button
                type="button"
                onClick={() => removeImage(images.indexOf(img))}
                className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100 focus:opacity-100"
                aria-label="Remover foto"
              >
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" aria-hidden="true">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>
          ))}

          {visibleImages.length < 3 && (
            <div className="flex aspect-square flex-col items-center justify-center gap-1.5 rounded-md border-2 border-dashed border-border">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                disabled={loading}
                className="flex flex-col items-center gap-0.5 rounded-md px-3 py-2 text-muted-foreground hover:text-brand transition-colors disabled:opacity-50"
                title="Tirar foto com a câmera"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                  <circle cx="12" cy="13" r="4"/>
                </svg>
                <span className="text-[10px] font-medium">Câmera</span>
              </button>
              <div className="h-px w-8 bg-border" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex flex-col items-center gap-0.5 rounded-md px-3 py-2 text-muted-foreground hover:text-brand transition-colors disabled:opacity-50"
                title="Escolher da galeria"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                  <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/>
                  <polyline points="21 15 16 10 5 21"/>
                </svg>
                <span className="text-[10px] font-medium">Galeria</span>
              </button>
            </div>
          )}
        </div>

        {/* Input oculto: câmera direta */}
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          onChange={handleImageSelect}
        />
        {/* Input oculto: galeria / arquivos */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          onChange={handleImageSelect}
        />
        <p className="text-xs text-muted-foreground">
          Máximo 10 MB por foto · JPEG, PNG, WebP ou HEIC
        </p>
        {/* P2-62 — dica geral */}
        <p className="text-xs text-brand">{FIELD_TIPS.photos}</p>
        {/* P3-76 — dicas de fotografia inline */}
        <details className="mt-2">
          <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-brand transition-colors">
            Dicas para fotos que convertem mais ▾
          </summary>
          <ul className="mt-2 space-y-1 pl-3 text-xs text-muted-foreground list-disc">
            <li>Use <strong>luz natural</strong> — abra janelas e evite flash direto</li>
            <li>Fotografe de <strong>múltiplos ângulos</strong>: frente, lateral, detalhe e uso em escala</li>
            <li>Fundo <strong>neutro ou organizado</strong> transmite mais confiança</li>
            <li>Inclua <strong>todos os acessórios</strong> que acompanham o item</li>
            <li>Evite filtros excessivos — o item deve parecer exatamente como é</li>
          </ul>
        </details>
      </section>

      {/* ── Requisitos para reserva ─────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <div>
          <h2 className="font-semibold text-primary">Requisitos para reserva</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            Defina o que os locatários precisam ter para alugar este item. Aumenta a confiança e reduz riscos.
          </p>
        </div>

        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <input
              id="req-id-verification"
              type="checkbox"
              checked={requireIdVerification}
              onChange={(e) => setRequireIdVerification(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-brand"
            />
            <div>
              <label htmlFor="req-id-verification" className="cursor-pointer text-sm font-medium text-foreground">
                Identidade verificada
              </label>
              <p className="text-xs text-muted-foreground">
                O locatário deve ter enviado e aprovado documento de identidade. Recomendado para itens de alto valor.
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3">
            <input
              id="req-phone"
              type="checkbox"
              checked={requirePhone}
              onChange={(e) => setRequirePhone(e.target.checked)}
              disabled={loading}
              className="mt-0.5 h-4 w-4 cursor-pointer rounded border-input accent-brand"
            />
            <div>
              <label htmlFor="req-phone" className="cursor-pointer text-sm font-medium text-foreground">
                Telefone cadastrado
              </label>
              <p className="text-xs text-muted-foreground">
                O locatário deve ter um número de telefone no perfil para permitir contato direto.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Submit ──────────────────────────────────────────────────────────── */}
      <div className="flex gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() => router.back()}
          disabled={loading}
          className="flex-1 md:flex-none md:w-32"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          loading={loading}
          className="flex-1"
        >
          {mode === "create" ? "Publicar anúncio" : "Salvar alterações"}
        </Button>
      </div>
    </form>
    </div>{/* fim coluna principal */}

    {/* ── Sidebar — prévia do card (desktop) + prévia inline (mobile) ── */}
    <div className="lg:sticky lg:top-24 space-y-4">
      {/* Prévia — desktop (sidebar) */}
      <div className="hidden lg:block">
        <ItemCardPreview
          title={title}
          pricePerDay={pricePerDay}
          categoryName={selectedCatName}
          city={city}
          previewUrl={firstPreviewUrl}
        />
      </div>

      {/* Prévia — mobile (seção inferior, aparece após preencher algo) */}
      {(title.trim().length >= 5 || toCents(pricePerDay) > 0) && (
        <div className="lg:hidden mt-2">
          <ItemCardPreview
            title={title}
            pricePerDay={pricePerDay}
            categoryName={selectedCatName}
            city={city}
            previewUrl={firstPreviewUrl}
          />
        </div>
      )}
    </div>
    </div>
  )
}
