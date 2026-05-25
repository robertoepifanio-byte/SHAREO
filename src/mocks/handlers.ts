import { http, HttpResponse } from 'msw'

export const handlers = [
  http.get('/api/items', () => {
    return HttpResponse.json({ items: [], total: 0 })
  }),

  http.post('/api/auth/signin', () => {
    return HttpResponse.json({ user: null, error: 'Credenciais inválidas' }, { status: 401 })
  }),
]
