import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import api from "@/shared/api"

const ACCEPT_MAP: Record<string, string> = {
  image: "image/*",
  audio: "audio/*",
  text: ".txt,.csv,.json,.md,.xml,.log",
}

const STEPS = [
  "Requesting presigned URL...",
  "Uploading to S3 storage...",
  "Triggering processing pipeline...",
]

interface FileUploadProps {
  taskId: string
  taskType: string
  onClose: () => void
  onUploaded: () => void
}

export function FileUpload({
  taskId,
  taskType,
  onClose,
  onUploaded,
}: FileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [step, setStep] = useState(-1)
  const [error, setError] = useState("")

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    setError("")
    try {
      setStep(0)
      const { data } = await api.post(`/tasks/${taskId}/submissions/`, {
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      })

      setStep(1)
      await fetch(data.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      setStep(2)
      await api.post(
        `/tasks/${taskId}/submissions/${data.submission_id}/confirm`,
      )

      setStep(3)
      setTimeout(onUploaded, 800)
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string; message?: string } }
        message?: string
      }
      setError(
        axiosErr.response?.data?.message ||
          axiosErr.response?.data?.detail ||
          axiosErr.message ||
          "Upload failed",
      )
      setStep(-1)
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Upload {taskType} file
        </p>
        <Button variant="ghost" size="xs" onClick={onClose}>
          Cancel
        </Button>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept={ACCEPT_MAP[taskType]}
        className="w-full cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 p-3 font-mono text-sm text-muted-foreground transition-colors file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:border-primary/30"
      />

      <Button onClick={handleUpload} disabled={uploading} size="sm">
        {uploading ? "Processing..." : "Upload & Process"}
      </Button>

      {/* Progress steps */}
      {step >= 0 && (
        <div className="space-y-2 rounded-lg bg-muted/40 p-3">
          {STEPS.map((label, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 font-mono text-xs transition-all ${
                i < step
                  ? "text-emerald"
                  : i === step
                    ? "text-primary"
                    : "text-muted-foreground/40"
              }`}
            >
              {i < step ? (
                <span className="text-emerald">&#10003;</span>
              ) : i === step ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
              ) : (
                <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground/20" />
              )}
              {label}
            </div>
          ))}
          {step >= 3 && (
            <div className="flex items-center gap-2 font-mono text-xs text-emerald">
              <span>&#10003;</span> Complete!
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-rose/20 bg-rose/10 px-3 py-2 font-mono text-xs text-rose">
          {error}
        </div>
      )}
    </div>
  )
}
