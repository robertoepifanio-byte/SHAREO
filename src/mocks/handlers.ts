import { http, HttpResponse } from "msw"

const mockUser = {
  id: "user-1",
  name: "João Silva",
  email: "joao@example.com",
  image: null,
  role: "USER",
  userType: "PF",
}

const mockItem = {
  id: "item-1",
  title: "Furadeira Bosch",
  description: "Furadeira de impacto 750W",
  pricePerDay: 5000,
  category: "ferramentas",
  status: "AVAILABLE",
  city: "São Paulo",
  state: "SP",
  lat: -23.55,
  lng: -46.63,
  slug: "furadeira-bosch-em-sao-paulo-sp-item-1",
  images: [{ id: "img-1", url: "/placeholder.jpg", order: 0 }],
  owner: mockUser,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
}

const mockBooking = {
  id: "booking-1",
  status: "PENDING",
  startDate: new Date().toISOString(),
  endDate: new Date(Date.now() + 86400000 * 3).toISOString(),
  totalPrice: 15000,
  item: mockItem,
  renter: mockUser,
  owner: { ...mockUser, id: "user-2" },
  createdAt: new Date().toISOString(),
}

const mockConversation = {
  id: "conv-1",
  participants: [mockUser, { ...mockUser, id: "user-2", name: "Maria" }],
  lastMessage: null,
  unreadCount: 0,
  item: mockItem,
}

export const handlers = [
  // Items
  http.get("/api/items", () =>
    HttpResponse.json({ data: [mockItem], total: 1, page: 1, pageSize: 20, hasMore: false }),
  ),
  http.get("/api/items/:id", ({ params }) =>
    params.id === mockItem.id
      ? HttpResponse.json({ data: mockItem })
      : HttpResponse.json({ error: "Item não encontrado" }, { status: 404 }),
  ),
  http.post("/api/items", () =>
    HttpResponse.json({ data: mockItem }, { status: 201 }),
  ),
  http.put("/api/items/:id", () =>
    HttpResponse.json({ data: mockItem }),
  ),
  http.delete("/api/items/:id", () =>
    new HttpResponse(null, { status: 204 }),
  ),

  // Bookings
  http.get("/api/bookings", () =>
    HttpResponse.json({ data: [mockBooking], total: 1 }),
  ),
  http.post("/api/bookings", () =>
    HttpResponse.json({ data: mockBooking }, { status: 201 }),
  ),
  http.put("/api/bookings/:id", () =>
    HttpResponse.json({ data: mockBooking }),
  ),

  // Conversations
  http.get("/api/conversations", () =>
    HttpResponse.json({ data: [mockConversation] }),
  ),
  http.get("/api/conversations/:id", () =>
    HttpResponse.json({ data: mockConversation }),
  ),
  http.post("/api/conversations", () =>
    HttpResponse.json({ data: mockConversation }, { status: 201 }),
  ),
  http.get("/api/conversations/:id/messages", () =>
    HttpResponse.json({ data: [] }),
  ),
  http.post("/api/conversations/:id/messages", () =>
    HttpResponse.json({ data: { id: "msg-1", content: "Olá", senderId: "user-1", createdAt: new Date().toISOString() } }, { status: 201 }),
  ),

  // Categories
  http.get("/api/categories", () =>
    HttpResponse.json({ data: ["ferramentas", "eletronicos", "esportes", "casa", "moda", "festas", "construcao"] }),
  ),

  // Auth
  http.post("/api/auth/register", () =>
    HttpResponse.json({ data: mockUser }, { status: 201 }),
  ),
]
