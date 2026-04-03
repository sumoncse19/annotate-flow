import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import api from "@/shared/api"

const ACCEPT_MAP: Record<string, string> = {
  image: "image/*",
  audio: "audio/*",
  text: ".txt,.csv,.json,.md,.xml,.log",
}

const TYPE_PREFIXES: Record<string, string[]> = {
  image: ["image/"],
  audio: ["audio/"],
  text: ["text/", "application/json", "application/xml"],
}

function isFileTypeValid(file: File, taskType: string): boolean {
  const prefixes = TYPE_PREFIXES[taskType]
  if (!prefixes) return true
  return prefixes.some((p) => file.type.startsWith(p))
}

interface FileProgress {
  name: string
  size: number
  step: number // -1=queued, 0-2=in progress, 3=done, -2=failed
  error?: string
}

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
  const [stagedFiles, setStagedFiles] = useState<File[]>([])
  const [progress, setProgress] = useState<FileProgress[]>([])
  const [rejected, setRejected] = useState<string[]>([])

  function handleFileSelect() {
    const selected = fileRef.current?.files
    if (!selected || selected.length === 0) return

    const incoming = Array.from(selected)
    const valid = incoming.filter((f) => isFileTypeValid(f, taskType))
    const invalid = incoming.filter((f) => !isFileTypeValid(f, taskType))

    if (invalid.length > 0) {
      setRejected(invalid.map((f) => f.name))
      setTimeout(() => setRejected([]), 5000)
    }

    setStagedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name))
      const newFiles = valid.filter((f) => !existingNames.has(f.name))
      return [...prev, ...newFiles]
    })

    // Reset input so the same file can be re-selected
    if (fileRef.current) fileRef.current.value = ""
  }

  function removeStaged(index: number) {
    setStagedFiles((prev) => prev.filter((_, i) => i !== index))
  }

  function updateProgress(index: number, update: Partial<FileProgress>) {
    setProgress((prev) =>
      prev.map((f, i) => (i === index ? { ...f, ...update } : f))
    )
  }

  async function uploadSingleFile(file: File, index: number) {
    try {
      updateProgress(index, { step: 0 })
      const { data } = await api.post(`/tasks/${taskId}/submissions/`, {
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      })

      updateProgress(index, { step: 1 })
      await fetch(data.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      updateProgress(index, { step: 2 })
      await api.post(
        `/tasks/${taskId}/submissions/${data.submission_id}/confirm`
      )

      updateProgress(index, { step: 3 })
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string; message?: string } }
        message?: string
      }
      updateProgress(index, {
        step: -2,
        error:
          axiosErr.response?.data?.message ||
          axiosErr.response?.data?.detail ||
          axiosErr.message ||
          "Upload failed",
      })
    }
  }

  async function handleUpload() {
    if (stagedFiles.length === 0) return

    setProgress(
      stagedFiles.map((f) => ({ name: f.name, size: f.size, step: -1 }))
    )
    setUploading(true)

    for (let i = 0; i < stagedFiles.length; i++) {
      await uploadSingleFile(stagedFiles[i], i)
    }

    setUploading(false)
    setTimeout(onUploaded, 800)
  }

  const completedCount = progress.filter((f) => f.step === 3).length
  const failedCount = progress.filter((f) => f.step === -2).length

  function formatSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="font-mono text-xs font-medium text-muted-foreground">
          Upload {taskType} files
        </p>
        <Button variant="ghost" size="xs" onClick={onClose}>
          Cancel
        </Button>
      </div>

      {/* File picker — always visible before upload starts */}
      {!uploading && progress.length === 0 && (
        <>
          <input
            ref={fileRef}
            type="file"
            multiple
            accept={ACCEPT_MAP[taskType]}
            onChange={handleFileSelect}
            className="w-full cursor-pointer rounded-lg border border-dashed border-border bg-muted/30 p-3 font-mono text-sm text-muted-foreground transition-colors file:mr-3 file:cursor-pointer file:rounded-md file:border-0 file:bg-primary/10 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-primary hover:border-primary/30"
          />

          {/* Rejected files warning */}
          {rejected.length > 0 && (
            <div className="animate-fade-in rounded-lg border border-rose/20 bg-rose/10 px-3 py-2 font-mono text-xs text-rose">
              Skipped {rejected.length} file{rejected.length !== 1 ? "s" : ""} —
              only {taskType} files allowed: {rejected.join(", ")}
            </div>
          )}

          {/* Staged file list */}
          {stagedFiles.length > 0 && (
            <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
              <p className="mb-2 font-mono text-[10px] tracking-wider text-muted-foreground uppercase">
                {stagedFiles.length} file{stagedFiles.length !== 1 ? "s" : ""}{" "}
                selected
              </p>
              {stagedFiles.map((file, i) => (
                <div
                  key={`${file.name}-${i}`}
                  className="flex items-center gap-2 font-mono text-xs text-foreground"
                >
                  <span className="min-w-0 flex-1 truncate">{file.name}</span>
                  <span className="shrink-0 text-muted-foreground">
                    {formatSize(file.size)}
                  </span>
                  <button
                    onClick={() => removeStaged(i)}
                    className="shrink-0 text-muted-foreground transition-colors hover:text-destructive"
                  >
                    &times;
                  </button>
                </div>
              ))}
              <p className="mt-2 border-t border-border/50 pt-2 text-[10px] text-muted-foreground">
                Click &quot;Choose Files&quot; again to add more
              </p>
            </div>
          )}

          <Button
            onClick={handleUpload}
            disabled={stagedFiles.length === 0}
            size="sm"
          >
            Upload & Process{" "}
            {stagedFiles.length > 0 && `(${stagedFiles.length})`}
          </Button>
        </>
      )}

      {/* Upload progress */}
      {progress.length > 0 && (
        <div className="space-y-1.5 rounded-lg bg-muted/40 p-3">
          {progress.map((f, i) => (
            <div
              key={i}
              className={`flex items-center gap-2 font-mono text-xs ${
                f.step === 3
                  ? "text-emerald"
                  : f.step === -2
                    ? "text-rose"
                    : f.step >= 0
                      ? "text-primary"
                      : "text-muted-foreground/40"
              }`}
            >
              {f.step === 3 ? (
                <span>&#10003;</span>
              ) : f.step === -2 ? (
                <span>&#10007;</span>
              ) : f.step >= 0 ? (
                <span className="inline-block h-3 w-3 animate-spin rounded-full border border-primary/30 border-t-primary" />
              ) : (
                <span className="inline-block h-3 w-3 rounded-full border border-muted-foreground/20" />
              )}
              <span className="min-w-0 flex-1 truncate">{f.name}</span>
              <span className="shrink-0 text-[10px] text-muted-foreground">
                {formatSize(f.size)}
              </span>
              {f.step >= 0 && f.step < 3 && (
                <span className="shrink-0 text-[10px] text-muted-foreground">
                  {["presign", "upload", "process"][f.step]}
                </span>
              )}
              {f.step === -2 && f.error && (
                <span className="shrink-0 text-[10px]">{f.error}</span>
              )}
            </div>
          ))}

          {!uploading && (
            <div className="mt-2 border-t border-border/50 pt-2 text-xs text-muted-foreground">
              {completedCount} completed
              {failedCount > 0 && (
                <span className="text-rose"> / {failedCount} failed</span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
