import { create } from "zustand"
import { apiFetch, clearTokens, getTokens, saveTokens, API_URL } from "./api"

interface User {
  id:        string
  name:      string
  email:     string
  role:      string
  avatarUrl: string | null
  isVerified: boolean
}

interface AuthState {
  user:       User | null
  loading:    boolean
  login:      (email: string, password: string) => Promise<void>
  logout:     () => Promise<void>
  loadUser:   () => Promise<void>
}

export const useAuth = create<AuthState>((set) => ({
  user:    null,
  loading: true,

  login: async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/mobile/login`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ email, password }),
    })
    if (!res.ok) {
      const body = await res.json().catch(() => ({}))
      throw new Error(body?.error?.message ?? "Credenciais inválidas.")
    }
    const { data } = await res.json()
    await saveTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    set({ user: data.user })
  },

  logout: async () => {
    await clearTokens()
    set({ user: null })
  },

  loadUser: async () => {
    set({ loading: true })
    try {
      const tokens = await getTokens()
      if (!tokens) { set({ user: null, loading: false }); return }
      const { data } = await apiFetch<{ data: User }>("/api/users/me")
      set({ user: data, loading: false })
    } catch {
      await clearTokens()
      set({ user: null, loading: false })
    }
  },
}))
