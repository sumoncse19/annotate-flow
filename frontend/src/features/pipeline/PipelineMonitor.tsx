import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { usePipelineStatus, useRecentJobs } from "./hooks"
import { STATUS_CONFIG } from "./types"

const STATUS_KEYS = ["pending", "processing", "completed", "failed"] as const

export function PipelineMonitor() {
  const { data: status } = usePipelineStatus()
  const { data: jobs = [] } = useRecentJobs()

  return (
    <div>
      <div className="mb-8">
        <h2 className="font-heading text-3xl font-semibold tracking-tight">
          Pipeline Monitor
        </h2>
        <p className="mt-1 font-mono text-sm text-muted-foreground">
          Real-time processing status &middot; polling every 3s
        </p>
      </div>

      {/* Status Cards */}
      {status && (
        <div className="stagger-children mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATUS_KEYS.map((key) => {
            const config = STATUS_CONFIG[key]
            const count = status[key]
            const isActive = key === "processing" && count > 0
            return (
              <Card
                key={key}
                className={`transition-all ${isActive ? "animate-pulse-glow border-primary/30" : ""}`}
              >
                <CardContent className="pt-5 pb-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={`inline-block h-2 w-2 rounded-full ${config.dotClass} ${
                        isActive ? "animate-dot-pulse" : ""
                      }`}
                    />
                    <span className="font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                      {config.label}
                    </span>
                  </div>
                  <p
                    className={`text-3xl font-bold tabular-nums ${config.textClass}`}
                  >
                    {count}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Total bar */}
      {status && status.total > 0 && (
        <div className="mb-10">
          <div className="mb-2 flex items-center justify-between font-mono text-xs text-muted-foreground">
            <span>Processing breakdown</span>
            <span>{status.total} total</span>
          </div>
          <div className="flex h-2 overflow-hidden rounded-full bg-muted">
            {STATUS_KEYS.map((key) => {
              const pct =
                status.total > 0 ? (status[key] / status.total) * 100 : 0
              if (pct === 0) return null
              const config = STATUS_CONFIG[key]
              return (
                <div
                  key={key}
                  className={`${config.dotClass} transition-all duration-500`}
                  style={{ width: `${pct}%` }}
                />
              )
            })}
          </div>
        </div>
      )}

      {/* Recent Jobs */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">Recent Jobs</h3>
        <span className="font-mono text-xs text-muted-foreground">
          {jobs.length} job{jobs.length !== 1 ? "s" : ""}
        </span>
      </div>

      {jobs.length === 0 ? (
        <div className="py-16 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M13 10V3L4 14h7v7l9-11h-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-medium">No jobs yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Upload files to tasks to see processing jobs here
          </p>
        </div>
      ) : (
        <div className="stagger-children space-y-2">
          {jobs.map((job) => {
            const config =
              STATUS_CONFIG[job.processing_status] || STATUS_CONFIG.pending
            const result = job.processing_result as Record<
              string,
              unknown
            > | null
            const isProcessing = job.processing_status === "processing"
            return (
              <Card
                key={job.id}
                className={`transition-colors ${isProcessing ? "border-primary/20" : ""}`}
              >
                <CardContent className="flex items-center gap-4 py-3">
                  <span
                    className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${config.dotClass} ${
                      isProcessing ? "animate-dot-pulse" : ""
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {job.file_name}
                    </p>
                    <p className="font-mono text-[11px] text-muted-foreground">
                      {job.content_type} &middot;{" "}
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Badge
                    variant="outline"
                    className={`shrink-0 font-mono text-[10px] tracking-wider uppercase ${config.textClass}`}
                  >
                    {job.processing_status}
                  </Badge>
                  {result && (
                    <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                      {(result.type as string) || ""}
                      {result.width ? ` ${result.width}x${result.height}` : ""}
                      {result.word_count ? ` ${result.word_count} words` : ""}
                    </span>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
