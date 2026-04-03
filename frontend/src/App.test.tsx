import { describe, it, expect, beforeEach } from "vitest"
import { renderWithProviders, screen } from "@/test/test-utils"
import App from "./App"

describe("App", () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it("shows login page when no token", () => {
    renderWithProviders(<App />)
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
  })

  it("shows login page when token is removed", () => {
    localStorage.setItem("token", "test")
    localStorage.removeItem("token")
    renderWithProviders(<App />)
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
  })
})
