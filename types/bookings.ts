export type BookingStatus =
  | "PENDING"
  | "CONFIRMED"
  | "ACTIVE"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELLED"
  | "DISPUTED"

export interface BookingWithDetails {
  id: string
  status: BookingStatus
  startDate: Date
  endDate: Date
  totalPrice: number
  item: {
    id: string
    title: string
    images: Array<{ url: string }>
    pricePerDay: number
  }
  renter: { id: string; name: string | null; image: string | null }
  owner: { id: string; name: string | null; image: string | null }
  createdAt: Date
}
