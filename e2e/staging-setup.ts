import { request } from '@playwright/test'

export default async function globalSetup() {
  const BASE = 'https://shareo-git-main-robertoepifanio-bytes-projects.vercel.app'
  const ctx  = await request.newContext()

  // Aquece as serverless functions principais antes da suite rodar
  // evita cold start de 8-10s dentro dos timeouts de assertion
  const endpoints = ['/', '/login', '/api/auth/providers', '/api/health']

  await Promise.all(
    endpoints.map(path =>
      ctx.get(`${BASE}${path}`).catch(() => null),
    ),
  )

  await ctx.dispose()
}
