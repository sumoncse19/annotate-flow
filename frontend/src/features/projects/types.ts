export interface Project {
  id: string
  name: string
  description: string | null
  owner_id: string
  task_count: number
  created_at: string
}
