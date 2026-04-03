import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAnalytics } from "./hooks"

const TYPE_COLORS: Record<string, string> = {
  IMAGE: "bg-blue-500",
  AUDIO: "bg-purple-500",
  TEXT: "bg-emerald-500",
}

export function AnalyticsDashboard() {
  const { data, isLoading } = useAnalytics()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
      </div>
    )
  }

  if (!data) return null

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-heading text-3xl font-semibold tracking-tight">
          Analytics
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          Platform overview and contributor performance
        </p>
      </div>

      {/* Overview Cards */}
      <div className="stagger-children mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          {
            label: "Projects",
            value: data.overview.projects,
            color: "text-primary",
          },
          {
            label: "Tasks",
            value: data.overview.tasks,
            color: "text-foreground",
          },
          {
            label: "Submissions",
            value: data.overview.submissions,
            color: "text-foreground",
          },
          {
            label: "Completion",
            value: `${data.overview.completion_rate}%`,
            color: "text-green-500",
          },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="pt-5 pb-4">
              <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {stat.label}
              </span>
              <p
                className={`mt-1 text-3xl font-bold tabular-nums ${stat.color}`}
              >
                {stat.value}
              </p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Tasks by Type */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-4 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Tasks by Type
            </h3>
            <div className="space-y-3">
              {Object.entries(data.tasks_by_type).map(([type, count]) => {
                const total = data.overview.tasks || 1
                const pct = Math.round((count / total) * 100)
                return (
                  <div key={type}>
                    <div className="mb-1 flex items-center justify-between font-mono text-xs">
                      <span className="text-foreground">{type}</span>
                      <span className="text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${TYPE_COLORS[type] || "bg-primary"}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Tasks by Status */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-4 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Tasks by Status
            </h3>
            <div className="space-y-3">
              {Object.entries(data.tasks_by_status).map(([status, count]) => {
                const total = data.overview.tasks || 1
                const pct = Math.round((count / total) * 100)
                const color =
                  status === "completed"
                    ? "bg-green-500"
                    : status === "in_progress"
                      ? "bg-yellow-500"
                      : "bg-blue-500"
                return (
                  <div key={status}>
                    <div className="mb-1 flex items-center justify-between font-mono text-xs">
                      <span className="text-foreground">
                        {status.replace("_", " ")}
                      </span>
                      <span className="text-muted-foreground">
                        {count} ({pct}%)
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-muted">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${color}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Contributors */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-4 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Top Contributors
            </h3>
            {data.top_contributors.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No contributors yet
              </p>
            ) : (
              <div className="space-y-3">
                {data.top_contributors.map((c, i) => (
                  <div key={c.email} className="flex items-center gap-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.name}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">
                        {c.email}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="font-mono text-sm font-bold tabular-nums">
                        {c.total_submissions}
                      </p>
                      <p className="font-mono text-[10px] text-muted-foreground">
                        {c.completed_submissions} completed
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Project Summary */}
        <Card>
          <CardContent className="pt-5">
            <h3 className="mb-4 font-mono text-xs font-medium tracking-wider text-muted-foreground uppercase">
              Project Summary
            </h3>
            <div className="space-y-3">
              {data.projects.map((p) => (
                <div
                  key={p.name}
                  className="flex items-center justify-between rounded-lg bg-muted/30 px-3 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{p.name}</p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {p.task_count} tasks / {p.submission_count} submissions
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-mono text-[10px] ${
                      p.completion_rate >= 100
                        ? "text-green-500"
                        : p.completion_rate > 0
                          ? "text-yellow-500"
                          : "text-muted-foreground"
                    }`}
                  >
                    {Math.min(p.completion_rate, 100)}%
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
