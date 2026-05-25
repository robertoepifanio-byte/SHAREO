import '@testing-library/jest-dom'
import { configureAxe, toHaveNoViolations } from 'jest-axe'
import { server } from '@/src/mocks/server'

expect.extend(toHaveNoViolations)

configureAxe({
  rules: {
    region: { enabled: false },
  },
})

beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
