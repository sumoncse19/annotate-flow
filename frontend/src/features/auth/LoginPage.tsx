import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import api from "@/shared/api"

interface LoginPageProps {
  onLogin: (token: string) => void
}

export function LoginPage({ onLogin }: LoginPageProps) {
  const [isRegister, setIsRegister] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [fullName, setFullName] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError("")
    setLoading(true)

    try {
      if (isRegister) {
        await api.post("/auth/register", {
          email,
          password,
          full_name: fullName,
        })
      }
      const { data } = await api.post("/auth/login", { email, password })
      onLogin(data.access_token)
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string; message?: string } }
      }
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.detail ||
          "Something went wrong"
      )
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative flex min-h-svh items-center justify-center overflow-hidden p-4">
      {/* Animated gradient mesh background */}
      <div className="animate-gradient absolute inset-0 bg-linear-to-br from-[oklch(0.12_0.03_260)] via-[oklch(0.08_0.02_210)] to-[oklch(0.14_0.025_280)]" />
      <div className="bg-dot-grid absolute inset-0" />

      {/* Decorative orbs */}
      <div className="absolute -top-32 -right-32 h-96 w-96 rounded-full bg-[oklch(0.7_0.16_192/0.08)] blur-[100px]" />
      <div className="absolute -bottom-32 -left-32 h-96 w-96 rounded-full bg-[oklch(0.65_0.13_230/0.06)] blur-[100px]" />

      <div className="animate-fade-up relative z-10 w-full max-w-md">
        {/* Branding */}
        <div className="mb-10 text-center">
          <div className="mb-3 inline-flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/20 ring-1 ring-primary/30">
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5 text-primary"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path
                  d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
            <h1 className="font-heading text-4xl font-semibold tracking-tight text-white">
              Annotate<span className="text-primary">Flow</span>
            </h1>
          </div>
          <p className="font-mono text-sm tracking-wide text-white/40">
            AI Data Annotation & Processing Platform
          </p>
        </div>

        {/* Auth Card */}
        <Card className="glass-card border-white/10 shadow-2xl shadow-black/20">
          <CardHeader className="pb-4">
            <CardTitle className="text-lg text-white">
              {isRegister ? "Create Account" : "Welcome back"}
            </CardTitle>
            <CardDescription className="text-white/50">
              {isRegister
                ? "Join the platform to start annotating"
                : "Sign in to continue to your dashboard"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="animate-fade-in rounded-lg border border-rose/20 bg-rose/10 px-4 py-3 font-mono text-xs text-rose">
                  {error}
                </div>
              )}

              {isRegister && (
                <div className="animate-fade-up space-y-2">
                  <Label htmlFor="fullName" className="text-white/70">
                    Full Name
                  </Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                    className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email" className="text-white/70">
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@company.com"
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-white/70">
                  Password
                </Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="&bull;&bull;&bull;&bull;&bull;&bull;&bull;&bull;"
                  required
                  className="border-white/10 bg-white/5 text-white placeholder:text-white/25 focus:border-primary/50 focus:ring-primary/20"
                />
              </div>

              <Button
                type="submit"
                className="w-full font-medium"
                disabled={loading}
              >
                {loading
                  ? "Loading..."
                  : isRegister
                    ? "Create Account"
                    : "Sign In"}
              </Button>

              <p className="text-center text-sm text-white/40">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError("")
                  }}
                  className="text-primary transition-colors hover:text-primary/80"
                >
                  {isRegister ? "Sign In" : "Register"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="mt-6 text-center font-mono text-[11px] tracking-wider text-white/20">
          Powered by FastAPI + React + PostgreSQL + Celery
        </p>
      </div>
    </div>
  )
}
