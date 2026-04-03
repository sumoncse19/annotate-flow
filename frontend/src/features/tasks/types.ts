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
