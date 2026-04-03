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
      const axiosErr = err as { response?: { data?: { detail?: string } } }
      setError(axiosErr.response?.data?.detail || "Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-svh items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">AnnotateFlow</h1>
          <p className="text-muted-foreground mt-2">
            AI Data Annotation & Processing Platform
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isRegister ? "Create Account" : "Sign In"}</CardTitle>
            <CardDescription>
              {isRegister
                ? "Create an account to start annotating"
                : "Sign in to your account"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="bg-destructive/10 text-destructive rounded-lg px-4 py-3 text-sm">
                  {error}
                </div>
              )}

              {isRegister && (
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    required
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading
                  ? "Loading..."
                  : isRegister
                    ? "Create Account"
                    : "Sign In"}
              </Button>

              <p className="text-muted-foreground text-center text-sm">
                {isRegister
                  ? "Already have an account?"
                  : "Don't have an account?"}{" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(!isRegister)
                    setError("")
                  }}
                  className="text-primary hover:underline"
                >
                  {isRegister ? "Sign In" : "Register"}
                </button>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
