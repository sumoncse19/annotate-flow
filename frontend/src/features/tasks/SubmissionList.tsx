import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useSubmissions } from "./hooks"
import { PROCESSING_STYLES } from "./types"
import type { Submission } from "./types"
import api from "@/shared/api"

interface SubmissionListProps {
  taskId: string
}

interface AiAnalysis {
  summary: string
  sentiment: "positive" | "negative" | "mixed" | "neutral"
  tags: string[]
  quality_score: number
  recommendations: string
  provider: string
}

const SENTIMENT_STYLES: Record<string, { bg: string; text: string }> = {
  positive: { bg: "bg-green-500/10", text: "text-green-500" },
  negative: { bg: "bg-red-500/10", text: "text-red-500" },
  mixed: { bg: "bg-yellow-500/10", text: "text-yellow-500" },
  neutral: { bg: "bg-blue-500/10", text: "text-blue-500" },
}

export function SubmissionList({ taskId }: SubmissionListProps) {
  const { data: submissions = [], isLoading } = useSubmissions(taskId)
  const [preview, setPreview] = useState<{
    url: string
    submission: Submission
  } | null>(null)
  const [analysis, setAnalysis] = useState<AiAnalysis | null>(null)
  const [analyzing, setAnalyzing] = useState(false)

  async function handlePreview(sub: Submission) {
    const { data } = await api.get(
      `/tasks/${taskId}/submissions/${sub.id}/download-url`
    )
    setPreview({ url: data.download_url, submission: sub })
    // Load cached analysis if exists
    const result = sub.processing_result as Record<string, unknown> | null
    if (result?.ai_analysis) {
      setAnalysis(result.ai_analysis as AiAnalysis)
    } else {
      setAnalysis(null)
    }
  }

  async function handleAnalyze() {
    if (!preview) return
    setAnalyzing(true)
    try {
      const { data } = await api.post(
        `/tasks/${taskId}/submissions/${preview.submission.id}/analyze`
      )
      setAnalysis(data)
    } catch {
      setAnalysis(null)
    } finally {
      setAnalyzing(false)
    }
  }

  function handleDownload() {
    if (!preview) return
    const link = document.createElement("a")
    link.href = preview.url
    link.download = preview.submission.file_name
    link.target = "_blank"
    link.click()
  }

  function isPreviewable(
    contentType: string | null
  ): "image" | "audio" | "text" | null {
    if (!contentType) return null
    if (contentType.startsWith("image/")) return "image"
    if (contentType.startsWith("audio/")) return "audio"
    if (contentType.startsWith("text/") || contentType === "application/json")
      return "text"
    return null
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
          const style =
            PROCESSING_STYLES[sub.processing_status] ||
            PROCESSING_STYLES.pending
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
                  {Boolean(result?.width) && (
                    <>
                      <span className="text-border">/</span>
                      <span>
                        {Number(result!.width)}x{Number(result!.height)}
                      </span>
                    </>
                  )}
                  {Boolean(result?.word_count) && (
                    <>
                      <span className="text-border">/</span>
                      <span>{Number(result!.word_count)} words</span>
                    </>
                  )}
                </div>
              </div>

              <Badge
                variant="outline"
                className={`shrink-0 font-mono text-[10px] tracking-wider uppercase ${style.text}`}
              >
                {sub.processing_status}
              </Badge>

              {sub.processing_status === "completed" && (
                <Button
                  variant="ghost"
                  size="xs"
                  className="shrink-0 font-mono text-xs text-primary"
                  onClick={() => handlePreview(sub)}
                >
                  Preview
                </Button>
              )}
            </div>
          )
        })}
      </div>

      {/* Preview Modal */}
      <Dialog
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
      >
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 font-mono text-sm">
              {preview?.submission.file_name}
              {preview?.submission.content_type && (
                <Badge variant="secondary" className="font-mono text-[10px]">
                  {preview.submission.content_type}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {preview && (
            <div className="space-y-4">
              {/* Preview content */}
              <div className="flex items-center justify-center overflow-hidden rounded-lg bg-muted/30">
                {isPreviewable(preview.submission.content_type) === "image" && (
                  <img
                    src={preview.url}
                    alt={preview.submission.file_name}
                    className="max-h-[60vh] rounded-lg object-contain"
                  />
                )}
                {isPreviewable(preview.submission.content_type) === "audio" && (
                  <div className="w-full p-6">
                    <audio controls className="w-full" src={preview.url}>
                      Your browser does not support audio playback.
                    </audio>
                  </div>
                )}
                {isPreviewable(preview.submission.content_type) === "text" && (
                  <div className="max-h-[60vh] w-full overflow-auto p-4">
                    {(
                      preview.submission.processing_result as Record<
                        string,
                        unknown
                      > | null
                    )?.preview ? (
                      <pre className="font-mono text-sm whitespace-pre-wrap text-foreground">
                        {
                          (
                            preview.submission.processing_result as Record<
                              string,
                              string
                            >
                          ).preview
                        }
                      </pre>
                    ) : (
                      <p className="font-mono text-sm text-muted-foreground">
                        Text preview not available
                      </p>
                    )}
                  </div>
                )}
                {!isPreviewable(preview.submission.content_type) && (
                  <p className="p-8 font-mono text-sm text-muted-foreground">
                    Preview not available for this file type
                  </p>
                )}
              </div>

              {/* Metadata */}
              {preview.submission.processing_result &&
                (() => {
                  const r = preview.submission.processing_result as Record<
                    string,
                    unknown
                  >
                  return (
                    <div className="flex flex-wrap gap-3 font-mono text-xs text-muted-foreground">
                      {Boolean(r.width) && (
                        <span>
                          Dimensions: {Number(r.width)}x{Number(r.height)}
                        </span>
                      )}
                      {Boolean(r.format) && (
                        <span>Format: {String(r.format)}</span>
                      )}
                      {Boolean(r.word_count) && (
                        <span>Words: {Number(r.word_count)}</span>
                      )}
                      {Boolean(r.line_count) && (
                        <span>Lines: {Number(r.line_count)}</span>
                      )}
                    </div>
                  )
                })()}

              {/* AI Analysis */}
              {analysis ? (
                <div className="space-y-3 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-medium tracking-wider text-primary uppercase">
                      AI Analysis
                    </span>
                    <Badge
                      variant="outline"
                      className={`font-mono text-[10px] uppercase ${SENTIMENT_STYLES[analysis.sentiment]?.text || ""} ${SENTIMENT_STYLES[analysis.sentiment]?.bg || ""}`}
                    >
                      {analysis.sentiment}
                    </Badge>
                    <Badge
                      variant="secondary"
                      className="font-mono text-[10px]"
                    >
                      Quality: {analysis.quality_score}/10
                    </Badge>
                    <span className="font-mono text-[10px] text-muted-foreground">
                      via {analysis.provider}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed">{analysis.summary}</p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.tags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="font-mono text-[10px]"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {analysis.recommendations}
                  </p>
                </div>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleAnalyze}
                  disabled={analyzing}
                  className="border-primary/30 text-primary hover:bg-primary/10"
                >
                  {analyzing ? (
                    <>
                      <span className="mr-2 inline-block h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
                      Analyzing...
                    </>
                  ) : (
                    "Analyze with AI"
                  )}
                </Button>
              )}

              {/* Actions */}
              <div className="flex justify-end gap-2">
                <Button variant="outline" size="sm" onClick={handleDownload}>
                  Download
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setPreview(null)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
