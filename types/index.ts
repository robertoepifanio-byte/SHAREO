export type { User, Item, Booking, Review, Conversation, Message } from '@prisma/client'

export type UserRole = 'USER' | 'ADMIN'

export type BookingStatus = 'PENDING' | 'CONFIRMED' | 'ACTIVE' | 'RETURNED' | 'COMPLETED' | 'CANCELLED' | 'DISPUTED'

export type ItemStatus = 'AVAILABLE' | 'RENTED' | 'INACTIVE'
