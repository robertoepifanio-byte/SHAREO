export interface ItemImage {
  id: string
  url: string
  alt?: string
  order: number
}

export interface ItemOwner {
  id: string
  name: string | null
  image: string | null
  avgRating?: number
}

export interface ItemWithOwner {
  id: string
  title: string
  description: string
  pricePerDay: number
  category: string
  status: "AVAILABLE" | "RENTED" | "INACTIVE"
  city: string
  state: string
  lat: number | null
  lng: number | null
  slug: string
  images: ItemImage[]
  owner: ItemOwner
  createdAt: Date
}

export interface ItemFilters {
  category?: string
  city?: string
  maxPrice?: number
  lat?: number
  lng?: number
  radiusKm?: number
  q?: string
  page?: number
}
