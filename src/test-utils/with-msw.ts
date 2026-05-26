import { server } from "@/src/mocks/server"

export function setupMswServer() {
  beforeAll(() => server.listen({ onUnhandledRequest: "warn" }))
  afterEach(() => server.resetHandlers())
  afterAll(() => server.close())
}
