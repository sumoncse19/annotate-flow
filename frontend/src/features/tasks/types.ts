export interface Task {
  id: string
  title: string
  description: string | null
  task_type: "image" | "audio" | "text"
  status: "open" | "in_progress" | "completed"
  priority: number
  project_id: string
  submission_count: number
  created_at: string
}

export interface Submission {
  id: string
  task_id: string
  contributor_id: string
  file_key: string
  file_name: string
  file_size: number | null
  content_type: string | null
  processing_status: "pending" | "processing" | "completed" | "failed"
  processing_result: Record<string, unknown> | null
  celery_task_id: string | null
  created_at: string
}

export const PROCESSING_STYLES: Record<string, { dot: string; text: string }> = {
  pending: { dot: "bg-yellow-500", text: "text-yellow-500" },
  processing: { dot: "bg-blue-500", text: "text-blue-500" },
  completed: { dot: "bg-green-500", text: "text-green-500" },
  failed: { dot: "bg-red-500", text: "text-red-500" },
}

export const STATUS_STYLES: Record<string, string> = {
  open: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  in_progress: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
  completed: "bg-green-500/10 text-green-500 border-green-500/20",
}

export const TYPE_LABELS: Record<string, string> = {
  image: "Image",
  audio: "Audio",
  text: "Text",
}
