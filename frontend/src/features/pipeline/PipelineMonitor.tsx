import { Card, CardContent } from "@/components/ui/card"
import { usePipelineStatus, useRecentJobs } from "./hooks"
import { STATUS_CONFIG } from "./types"

const STATUS_KEYS = ["pending", "processing", "completed", "failed"] as const

export function PipelineMonitor() {
  const { data: status } = usePipelineStatus()
  const { data: jobs = [] } = useRecentJobs()

  return (
    <div>
      <h2 className="mb-6 text-xl font-semibold">Pipeline Monitor</h2>

      {/* Status Cards */}
      {status && (
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATUS_KEYS.map((key) => {
            const config = STATUS_CONFIG[key]
            return (
              <Card key={key}>
                <CardContent className="pt-4">
                  <div className="mb-1 flex items-center gap-2">
                    <div
                      className={`h-2 w-2 rounded-full ${config.dotClass}`}
                    />
                    <span className="text-muted-foreground text-xs uppercase tracking-wide">
                      {config.label}
                    </span>
                  </div>
                  <p className={`text-2xl font-bold ${config.textClass}`}>
                    {status[key]}
                  </p>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Recent Jobs */}
      <h3 className="mb-4 text-lg font-medium">Recent Jobs</h3>
      {jobs.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No jobs yet</p>
          <p className="text-muted-foreground/60 mt-1 text-sm">
            Upload files to tasks to see processing jobs here
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {jobs.map((job) => {
            const config =
              STATUS_CONFIG[job.processing_status] || STATUS_CONFIG.pending
            const result = job.processing_result as Record<string, unknown> | null
            return (
              <Card key={job.id}>
                <CardContent className="flex items-center gap-4 py-3">
                  <div
                    className={`h-2.5 w-2.5 shrink-0 rounded-full ${config.dotClass}`}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {job.file_name}
                    </p>
                    <p className="text-muted-foreground text-xs">
                      {job.content_type} &middot;{" "}
                      {new Date(job.created_at).toLocaleString()}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 text-xs font-medium ${config.textClass}`}
                  >
                    {job.processing_status}
                  </span>
                  {result && (
                    <span className="text-muted-foreground shrink-0 text-xs">
                      {result.type as string || ""}
                      {result.width
                        ? ` ${result.width}x${result.height}`
                        : ""}
                      {result.word_count
                        ? ` ${result.word_count} words`
                        : ""}
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
