import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { useSubmissions } from "./hooks"
import { PROCESSING_STYLES } from "./types"
import api from "@/shared/api"

interface SubmissionListProps {
  taskId: string
}

export function SubmissionList({ taskId }: SubmissionListProps) {
  const { data: submissions = [], isLoading } = useSubmissions(taskId)

  async function handleDownload(submissionId: string, fileName: string) {
    const { data } = await api.get(
      `/tasks/${taskId}/submissions/${submissionId}/download-url`,
    )
    const link = document.createElement("a")
    link.href = data.download_url
    link.download = fileName
    link.target = "_blank"
    link.click()
  }

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-4 font-mono text-xs text-muted-foreground">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
        Loading submissions...
      </div>
    )
  }

  if (submissions.length === 0) {
    return (
      <p className="py-4 text-center font-mono text-xs text-muted-foreground/50">
        No submissions yet — upload a file above
      </p>
    )
  }

  return (
    <div>
      <p className="mb-3 font-mono text-xs font-medium text-muted-foreground">
        {submissions.length} submission{submissions.length !== 1 ? "s" : ""}
      </p>
      <div className="space-y-2">
        {submissions.map((sub) => {
          const style = PROCESSING_STYLES[sub.processing_status] || PROCESSING_STYLES.pending
          const result = sub.processing_result as Record<string, unknown> | null
          return (
            <div
              key={sub.id}
              className="flex items-center gap-3 rounded-lg bg-muted/30 px-3 py-2.5"
            >
              <span
                className={`inline-block h-2 w-2 shrink-0 rounded-full ${style.dot} ${
                  sub.processing_status === "processing"
                    ? "animate-dot-pulse"
                    : ""
                }`}
              />

              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{sub.file_name}</p>
                <div className="mt-0.5 flex items-center gap-2 font-mono text-[11px] text-muted-foreground">
                  <span>{sub.content_type}</span>
                  {sub.file_size && (
                    <>
                      <span className="text-border">/</span>
                      <span>{(sub.file_size / 1024).toFixed(1)} KB</span>
                    </>
                  )}
                  {result?.width && (
                    <>
                      <span className="text-border">/</span>
                      <span>
                        {result.width as number}x{result.height as number}
                      </span>
                    </>
                  )}
                  {result?.word_count && (
                    <>
                      <span className="text-border">/</span>
                      <span>{result.word_count as number} words</span>
                    </>
                  )}
                </div>
              </div>

              <Badge
                variant="outline"
                className={`shrink-0 font-mono text-[10px] uppercase tracking-wider ${style.text}`}
              >
                {sub.processing_status}
              </Badge>

              {sub.processing_status === "completed" && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="shrink-0 font-mono text-xs text-primary"
                  onClick={() => handleDownload(sub.id, sub.file_name)}
                >
                  Download
                </Button>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
