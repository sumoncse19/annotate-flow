import { describe, it, expect, vi } from "vitest"
import { renderWithProviders, screen, fireEvent } from "@/test/test-utils"
import { LoginPage } from "./LoginPage"

describe("LoginPage", () => {
  it("renders sign in form by default", () => {
    renderWithProviders(<LoginPage onLogin={vi.fn()} />)
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
    expect(screen.getByText("Sign In")).toBeInTheDocument()
    expect(screen.getByPlaceholderText("you@company.com")).toBeInTheDocument()
  })

  it("toggles to registration form", () => {
    renderWithProviders(<LoginPage onLogin={vi.fn()} />)
    fireEvent.click(screen.getByText("Register"))
    expect(
      screen.getByRole("button", { name: "Create Account" })
    ).toBeInTheDocument()
    expect(screen.getByPlaceholderText("John Doe")).toBeInTheDocument()
  })

  it("toggles back to sign in", () => {
    renderWithProviders(<LoginPage onLogin={vi.fn()} />)
    fireEvent.click(screen.getByText("Register"))
    fireEvent.click(screen.getByText("Sign In"))
    expect(screen.getByText("Welcome back")).toBeInTheDocument()
  })

  it("shows platform branding", () => {
    renderWithProviders(<LoginPage onLogin={vi.fn()} />)
    expect(
      screen.getByText("AI Data Annotation & Processing Platform")
    ).toBeInTheDocument()
  })
})
