import "@testing-library/jest-dom"
import { configureAxe, toHaveNoViolations } from "jest-axe"

expect.extend(toHaveNoViolations)

configureAxe({
  rules: {
    region: { enabled: false },
  },
})
