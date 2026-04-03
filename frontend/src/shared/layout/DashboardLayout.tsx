import type { ReactNode } from "react"
import { useQuery } from "@tanstack/react-query"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useTheme } from "@/components/theme-provider"
import api from "@/shared/api"
import type { User } from "@/features/auth/types"

type Tab = "projects" | "pipeline" | "analytics"

interface DashboardLayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  onLogout: () => void
  children: ReactNode
}

const TABS: { key: Tab; label: string; mono?: string }[] = [
  { key: "projects", label: "Projects", mono: "01" },
  { key: "pipeline", label: "Pipeline", mono: "02" },
  { key: "analytics", label: "Analytics", mono: "03" },
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
  const { theme, setTheme } = useTheme()

  return (
    <div className="bg-dot-grid min-h-svh">
      {/* Header */}
      <header className="glass-card sticky top-0 z-10 border-b border-border/50">
        <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-8">
            {/* Logo */}
            <div className="flex items-center gap-2.5">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/15 ring-1 ring-primary/25">
                <svg
                  viewBox="0 0 24 24"
                  className="h-3.5 w-3.5 text-primary"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2.5"
                >
                  <path
                    d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
              <span className="font-heading text-lg font-semibold tracking-tight">
                Annotate<span className="text-primary">Flow</span>
              </span>
            </div>

            {/* Nav */}
            <nav className="flex items-center gap-1">
              {TABS.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => onTabChange(tab.key)}
                  className={`relative flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm font-medium transition-all ${
                    activeTab === tab.key
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span className="font-mono text-[10px] opacity-40">
                    {tab.mono}
                  </span>
                  {tab.label}
                  {activeTab === tab.key && (
                    <span className="absolute right-3 bottom-0 left-3 h-px bg-primary/50" />
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <div className="flex items-center gap-2 text-sm">
                <div className="flex h-7 w-7 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                  {user.full_name.charAt(0).toUpperCase()}
                </div>
                <span className="hidden text-muted-foreground sm:inline">
                  {user.full_name}
                </span>
                <Badge
                  variant="outline"
                  className="border-primary/20 font-mono text-[10px] tracking-wider text-primary/70 uppercase"
                >
                  {user.role}
                </Badge>
              </div>
            )}
            <div className="h-4 w-px bg-border" />
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="text-muted-foreground hover:text-foreground"
              title={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
            >
              {theme === "dark" ? (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" />
                  <line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" />
                  <line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              ) : (
                <svg
                  viewBox="0 0 24 24"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
                </svg>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={onLogout}
              className="text-muted-foreground hover:text-foreground"
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="animate-fade-up">{children}</div>
      </main>
    </div>
  )
}
