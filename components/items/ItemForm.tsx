"use client"

import { useState, useEffect, useRef, type ChangeEvent, type FormEvent } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Input } from "@/components/ui/Input"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Textarea } from "@/components/ui/Textarea"

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
}

interface ItemFormProps {
  mode:          "create" | "edit"
  initialData?:  InitialData
}

// ─── Price suggestions by category slug ──────────────────────────────────────
// Base: diária ≈ 5% do valor do produto (mercado brasileiro)
const PRICE_SUGGESTIONS: Record<string, number> = {
  "ferramentas":   35,
  "eletronicos":   100,
  "casa-jardim":   30,
  "construcao":    45,
  "esporte":       60,
  "moda":          50,
  "festas":        80,
}

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
  id, label, value, onChange, required, helper,
}: {
  id: string; label: string; value: string; onChange: (v: string) => void; required?: boolean; helper?: string
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

export function ItemForm({ mode, initialData }: ItemFormProps) {
  const router = useRouter()

  // Form fields
  const [title,         setTitle]         = useState(initialData?.title         ?? "")
  const [description,   setDescription]   = useState(initialData?.description   ?? "")
  const [categoryId,    setCategoryId]    = useState(initialData?.categoryId    ?? "")
  const [condition,     setCondition]     = useState(initialData?.condition     ?? "GOOD")
  const [pricePerDay,   setPricePerDay]   = useState(toDisplay(initialData?.pricePerDay))
  const [pricePerWeek,  setPricePerWeek]  = useState(toDisplay(initialData?.pricePerWeek))
  const [pricePerMonth, setPricePerMonth] = useState(toDisplay(initialData?.pricePerMonth))
  const [depositAmount,        setDepositAmount]        = useState(toDisplay(initialData?.depositAmount))
  const [estimatedRetailPrice, setEstimatedRetailPrice] = useState(toDisplay(initialData?.estimatedRetailPrice))
  const [address,       setAddress]       = useState(initialData?.address       ?? "")
  const [city,          setCity]          = useState(initialData?.city          ?? (process.env.NEXT_PUBLIC_DEFAULT_CITY ?? ""))
  const [state,         setState]         = useState(initialData?.state         ?? (process.env.NEXT_PUBLIC_DEFAULT_STATE ?? ""))
  const [neighborhood,  setNeighborhood]  = useState(initialData?.neighborhood  ?? "")
  const [latitude,      setLatitude]      = useState(initialData?.latitude      ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LAT ?? -5.7945))
  const [longitude,     setLongitude]     = useState(initialData?.longitude     ?? Number(process.env.NEXT_PUBLIC_DEFAULT_LNG ?? -35.211))

  // Images
  const [images, setImages] = useState<ImageEntry[]>(
    initialData?.images.map((img) => ({ type: "existing", id: img.id, url: img.url })) ?? []
  )
  const [deletedImageIds, setDeletedImageIds] = useState<string[]>([])

  // UI state
  const [categories,    setCategories]    = useState<Category[]>([])
  const [errors,        setErrors]        = useState<Record<string, string>>({})
  const [loading,       setLoading]       = useState(false)
  const [gettingLoc,    setGettingLoc]    = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Price suggestion derived from selected category
  const selectedCat      = categories.find((c) => c.id === categoryId)
  const suggestedDayPrice = selectedCat ? PRICE_SUGGESTIONS[selectedCat.slug] : undefined

  function applyPriceSuggestion() {
    if (!suggestedDayPrice) return
    const suggested = suggestedDayPrice.toFixed(2).replace(".", ",")
    setPricePerDay(suggested)
    setErrors((p) => ({ ...p, pricePerDay: undefined! }))
  }

  function autoWeekly() {
    const cents = toCents(pricePerDay)
    if (!cents) return
    setPricePerWeek(((cents * 4) / 100).toFixed(2).replace(".", ","))
  }

  function autoMonthly() {
    const cents = toCents(pricePerDay)
    if (!cents) return
    setPricePerMonth(((cents * 12) / 100).toFixed(2).replace(".", ","))
  }

  // Load categories on mount
  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then(({ data }) => setCategories(data ?? []))
      .catch(() => {})
  }, [])

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img.type === "new") URL.revokeObjectURL(img.previewUrl)
      })
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ─── Location ──────────────────────────────────────────────────────────────

  function handleGetLocation() {
    if (!navigator.geolocation) {
      setErrors((p) => ({ ...p, location: "Geolocalização não suportada neste navegador." }))
      return
    }
    setGettingLoc(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(pos.coords.latitude)
        setLongitude(pos.coords.longitude)
        setGettingLoc(false)
        setErrors((p) => { const n = { ...p }; delete n.location; return n })
      },
      () => {
        setGettingLoc(false)
        setErrors((p) => ({ ...p, location: "Não foi possível obter a localização. Permita o acesso ou ajuste manualmente." }))
      },
      { timeout: 8000 }
    )
  }

  // ─── Images ────────────────────────────────────────────────────────────────

  function handleImageSelect(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? [])
    const remaining = 10 - images.filter((i) => i.type !== "existing" || !deletedImageIds.includes((i as ExistingImage).id)).length
    const toAdd = files.slice(0, remaining)

    const newEntries: NewImage[] = toAdd.map((file) => ({
      type:       "new",
      file,
      previewUrl: URL.createObjectURL(file),
    }))

    setImages((prev) => [...prev, ...newEntries])
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

    const clientErrors = validate()
    if (Object.keys(clientErrors).length > 0) {
      setErrors(clientErrors)
      window.scrollTo({ top: 0, behavior: "smooth" })
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

      // Upload new images
      const newImages = images.filter((img): img is NewImage => img.type === "new")
      for (const img of newImages) {
        const fd = new FormData()
        fd.append("file", img.file)
        await fetch(`/api/items/${itemId}/images`, { method: "POST", body: fd }).catch(() => {})
      }

      window.location.href = `/itens/${itemId}`
    } catch {
      setErrors({ form: "Erro inesperado. Tente novamente." })
      setLoading(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────

  const visibleImages = images.filter(
    (img) => !(img.type === "existing" && deletedImageIds.includes(img.id))
  )

  return (
    <form onSubmit={handleSubmit} noValidate className="space-y-8">
      {errors.form && (
        <div role="alert" className="rounded-md border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errors.form}
        </div>
      )}

      {/* ── Informações básicas ─────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-primary">Informações básicas</h2>

        <Input
          label="Título do anúncio"
          type="text"
          placeholder="Ex: Furadeira Bosch 650W — ideal para reformas"
          value={title}
          onChange={(e) => { setTitle(e.target.value); setErrors((p) => ({ ...p, title: undefined! })) }}
          error={errors.title}
          required
          disabled={loading}
          helper="Seja específico: marca, modelo e destaque principal"
        />

        <Textarea
          label="Descrição"
          placeholder="Descreva o item: características, inclui acessórios, instruções de uso, restrições..."
          value={description}
          onChange={(e) => { setDescription(e.target.value); setErrors((p) => ({ ...p, description: undefined! })) }}
          error={errors.description}
          required
          disabled={loading}
          rows={5}
          helper={`${description.length}/2000 caracteres`}
        />

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
      </section>

      {/* ── Preços ─────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <h2 className="font-semibold text-primary">Preços</h2>

        {/* Sugestão automática de preço por categoria */}
        {suggestedDayPrice && !toCents(pricePerDay) && (
          <div className="flex items-center gap-3 rounded-md border border-brand/25 bg-brand/5 px-3 py-2 text-xs text-muted-foreground">
            <span>
              💡 Sugestão para <strong>{selectedCat?.name}</strong>:{" "}
              <strong className="text-foreground">R$ {suggestedDayPrice.toFixed(2).replace(".", ",")}/dia</strong>
              <span className="ml-1 text-[11px]">(referência: 5% do valor do produto)</span>
            </span>
            <button
              type="button"
              onClick={applyPriceSuggestion}
              disabled={loading}
              className="ml-auto shrink-0 rounded-md bg-brand px-2.5 py-1 text-[11px] font-semibold text-white hover:opacity-90 transition-opacity disabled:opacity-50"
            >
              Usar
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <PriceInput
              id="price-per-day"
              label="Preço por dia"
              value={pricePerDay}
              onChange={(v) => { setPricePerDay(v); setErrors((p) => ({ ...p, pricePerDay: undefined! })) }}
              required
            />
            {errors.pricePerDay && (
              <p role="alert" className="mt-1 text-xs text-destructive">{errors.pricePerDay}</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <PriceInput
              id="price-per-week"
              label="Preço por semana"
              value={pricePerWeek}
              onChange={setPricePerWeek}
              helper="Desconto para locações ≥ 7 dias"
            />
            {toCents(pricePerDay) > 0 && !toCents(pricePerWeek) && (
              <button
                type="button"
                onClick={autoWeekly}
                disabled={loading}
                className="self-start text-[11px] text-brand hover:underline disabled:opacity-50"
              >
                Calcular (4× diária = R$ {((toCents(pricePerDay) * 4) / 100).toFixed(2).replace(".", ",")})
              </button>
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
              helper="Desconto para locações ≥ 30 dias"
            />
            {toCents(pricePerDay) > 0 && !toCents(pricePerMonth) && (
              <button
                type="button"
                onClick={autoMonthly}
                disabled={loading}
                className="self-start text-[11px] text-brand hover:underline disabled:opacity-50"
              >
                Calcular (12× diária = R$ {((toCents(pricePerDay) * 12) / 100).toFixed(2).replace(".", ",")})
              </button>
            )}
          </div>

          <PriceInput
            id="deposit-amount"
            label="Caução"
            value={depositAmount}
            onChange={setDepositAmount}
            helper="Opcional — valor retido como garantia durante o aluguel"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <PriceInput
            id="estimated-retail-price"
            label="Valor de compra estimado"
            value={estimatedRetailPrice}
            onChange={setEstimatedRetailPrice}
            helper="Opcional — exibe economia vs comprar novo para o locatário"
          />
        </div>
      </section>

      {/* ── Localização ─────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Localização</h2>
          <button
            type="button"
            onClick={handleGetLocation}
            disabled={loading || gettingLoc}
            className="flex items-center gap-1.5 text-xs text-brand hover:underline disabled:opacity-50 outline-none focus-visible:ring-1 focus-visible:ring-brand rounded"
          >
            {gettingLoc ? (
              <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
              </svg>
            )}
            Usar minha localização
          </button>
        </div>

        {errors.location && (
          <p role="alert" className="text-xs text-destructive">{errors.location}</p>
        )}

        {latitude !== 0 && longitude !== 0 && (
          <p className="text-xs text-muted-foreground">
            Coordenadas: {latitude.toFixed(4)}, {longitude.toFixed(4)}
          </p>
        )}

        <div className="grid grid-cols-3 gap-3">
          <div className="col-span-2">
            <Input
              label="Cidade"
              type="text"
              placeholder="Natal"
              value={city}
              onChange={(e) => { setCity(e.target.value); setErrors((p) => ({ ...p, city: undefined! })) }}
              error={errors.city}
              required
              disabled={loading}
            />
          </div>
          <Select
            label="Estado"
            value={state}
            onChange={(e) => { setState(e.target.value); setErrors((p) => ({ ...p, state: undefined! })) }}
            error={errors.state}
            placeholder="UF"
            required
            disabled={loading}
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
            onChange={(e) => setNeighborhood(e.target.value)}
            helper="Opcional"
            disabled={loading}
          />
          <Input
            label="Endereço"
            type="text"
            placeholder="Rua das Dunas, 123"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            helper="Opcional — só compartilhado após confirmação"
            disabled={loading}
          />
        </div>
      </section>

      {/* ── Fotos ───────────────────────────────────────────────────────────── */}
      <section className="rounded-lg border border-border bg-surface p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-primary">Fotos</h2>
          <span className="text-xs text-muted-foreground">{visibleImages.length}/10</span>
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

          {visibleImages.length < 10 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={[
                "flex aspect-square flex-col items-center justify-center gap-2 rounded-md border-2 border-dashed",
                "border-border text-muted-foreground hover:border-brand hover:text-brand transition-colors",
                "disabled:opacity-50 disabled:pointer-events-none",
              ].join(" ")}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              <span className="text-xs">Adicionar</span>
            </button>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="sr-only"
          onChange={handleImageSelect}
        />
        <p className="text-xs text-muted-foreground">
          Formatos aceitos: JPEG, PNG, WebP · Máximo 5 MB por foto
        </p>
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
  )
}
