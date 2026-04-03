import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import api from "@/shared/api"

const ACCEPT_MAP: Record<string, string> = {
  image: "image/*",
  audio: "audio/*",
  text: ".txt,.csv,.json,.md,.xml,.log",
}

interface FileUploadProps {
  taskId: string
  taskType: string
  onClose: () => void
  onUploaded: () => void
}

export function FileUpload({ taskId, taskType, onClose, onUploaded }: FileUploadProps) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [status, setStatus] = useState("")

  async function handleUpload() {
    const file = fileRef.current?.files?.[0]
    if (!file) return

    setUploading(true)
    try {
      // 1. Create submission — get presigned URL
      setStatus("Requesting upload URL...")
      const { data } = await api.post(`/tasks/${taskId}/submissions/`, {
        file_name: file.name,
        file_size: file.size,
        content_type: file.type,
      })

      // 2. Upload directly to S3/MinIO via presigned URL
      setStatus("Uploading file to storage...")
      await fetch(data.upload_url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      })

      // 3. Confirm upload — triggers Celery processing pipeline
      setStatus("Triggering processing pipeline...")
      await api.post(
        `/tasks/${taskId}/submissions/${data.submission_id}/confirm`,
      )

      setStatus("Done! File submitted for processing.")
      setTimeout(onUploaded, 1000)
    } catch (err: unknown) {
      const axiosErr = err as {
        response?: { data?: { detail?: string } }
        message?: string
      }
      setStatus(
        `Error: ${axiosErr.response?.data?.detail || axiosErr.message}`,
      )
    } finally {
      setUploading(false)
    }
  }

  return (
    <Card className="mb-6">
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-base">Upload File</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT_MAP[taskType]}
          className="text-muted-foreground file:bg-secondary file:text-secondary-foreground w-full text-sm file:mr-4 file:cursor-pointer file:rounded-lg file:border-0 file:px-4 file:py-2 file:text-sm file:font-medium"
        />
        <Button onClick={handleUpload} disabled={uploading} size="sm">
          {uploading ? "Uploading..." : "Upload & Process"}
        </Button>
        {status && (
          <p
            className={`text-sm ${status.startsWith("Error") ? "text-destructive" : "text-muted-foreground"}`}
          >
            {status}
          </p>
        )}
      </CardContent>
    </Card>
  )
}
