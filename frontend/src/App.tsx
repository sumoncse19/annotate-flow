import { useState, useEffect } from "react"
import { LoginPage } from "@/features/auth/LoginPage"
import { DashboardPage } from "@/pages/DashboardPage"

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  )

  useEffect(() => {
    if (token) {
      localStorage.setItem("token", token)
    } else {
      localStorage.removeItem("token")
    }
  }, [token])

  if (!token) {
    return <LoginPage onLogin={setToken} />
  }

  return <DashboardPage onLogout={() => setToken(null)} />
}
