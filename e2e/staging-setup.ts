import { request } from '@playwright/test'

export default async function globalSetup() {
  const BASE = process.env.STAGING_URL
    ?? 'https://shareo-git-main-robertoepifanio-bytes-projects.vercel.app'

  const ctx = await request.newContext()

  // Aquece as serverless functions principais antes da suite rodar.
  // Evita cold start de 8-10s (Vercel Hobby) dentro dos timeouts de assertion.
  // /api/auth/register e /api/auth/callback/credentials são críticos para auth.spec.ts.
  const endpoints = [
    '/',
    '/login',
    '/cadastro',
    '/itens',
    '/api/health',
    '/api/auth/providers',
    '/api/auth/register',
    '/api/auth/callback/credentials',
  ]

  await Promise.all(
    endpoints.map(path =>
      ctx.get(`${BASE}${path}`).catch(() => null),
    ),
  )

  await ctx.dispose()
}
