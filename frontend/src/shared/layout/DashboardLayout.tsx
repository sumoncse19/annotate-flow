import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import api from "@/shared/api"
import type { User } from "@/features/auth/types"

type Tab = "projects" | "pipeline"

interface DashboardLayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onLogout: () => void
  children: ReactNode
}

const TABS: { key: Tab; label: string }[] = [
  { key: "projects", label: "Projects" },
  { key: "pipeline", label: "Pipeline Monitor" },
]

export function DashboardLayout({
  activeTab,
  onTabChange,
  onLogout,
  children,
}: DashboardLayoutProps) {
  const { data: user } = useQuery<User>({
    queryKey: ["me"],
    queryFn: () => api.get("/auth/me").then((r) => r.data),
  })

  return (
    <div className="min-h-svh">
      {/* Header */}
      <header className="bg-background/80 sticky top-0 z-10 backdrop-blur-sm">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-6">
            <h1 className="text-lg font-bold">AnnotateFlow</h1>
            <nav className="flex gap-1">
              {TABS.map((tab) => (
                <Button
                  key={tab.key}
                  variant={activeTab === tab.key ? "default" : "ghost"}
                  size="sm"
                  onClick={() => onTabChange(tab.key)}
                >
                  {tab.label}
                </Button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <span className="text-muted-foreground text-sm">
                {user.full_name}{" "}
                <Badge variant="outline" className="ml-1">
                  {user.role}
                </Badge>
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onLogout}>
              Logout
            </Button>
          </div>
        </div>
        <Separator />
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {children}
      </main>
    </div>
  )
}
