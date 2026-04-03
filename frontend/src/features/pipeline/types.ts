export interface PipelineStatus {
  pending: number
  processing: number
  completed: number
  failed: number
  total: number
}

export interface RecentJob {
  id: string
  file_name: string
  content_type: string
  processing_status: "pending" | "processing" | "completed" | "failed"
  processing_result: Record<string, unknown> | null
  celery_task_id: string | null
  created_at: string
}

export interface Analytics {
  overview: {
    projects: number
    tasks: number
    submissions: number
    completion_rate: number
  }
  tasks_by_status: Record<string, number>
  tasks_by_type: Record<string, number>
  submissions_by_status: Record<string, number>
  top_contributors: {
    name: string
    email: string
    total_submissions: number
    completed_submissions: number
  }[]
  projects: {
    name: string
    task_count: number
    submission_count: number
    completed_tasks: number
    completion_rate: number
  }[]
}

export const STATUS_CONFIG: Record<
  string,
  { label: string; dotClass: string; textClass: string }
> = {
  pending: {
    label: "Pending",
    dotClass: "bg-yellow-500",
    textClass: "text-yellow-500",
  },
  processing: {
    label: "Processing",
    dotClass: "bg-blue-500",
    textClass: "text-blue-500",
  },
  completed: {
    label: "Completed",
    dotClass: "bg-green-500",
    textClass: "text-green-500",
  },
  failed: {
    label: "Failed",
    dotClass: "bg-red-500",
    textClass: "text-red-500",
  },
}
