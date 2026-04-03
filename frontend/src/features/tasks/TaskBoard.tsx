import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
// Badge import kept for task type label
import { useQueryClient } from "@tanstack/react-query"
import { FileUpload } from "./FileUpload"
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask } from "./hooks"
import { STATUS_STYLES, TYPE_LABELS } from "./types"
import type { Project } from "@/features/projects/types"

interface TaskBoardProps {
  project: Project
}

export function TaskBoard({ project }: TaskBoardProps) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [uploadTask, setUploadTask] = useState<{
    id: string
    type: string
  } | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskType, setTaskType] = useState("image")

  const { data: tasks = [], isLoading } = useTasks(project.id)
  const createMutation = useCreateTask(project.id)
  const deleteMutation = useDeleteTask(project.id)
  const updateMutation = useUpdateTask(project.id)

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate(
      { title, description, task_type: taskType },
      {
        onSuccess: () => {
          setShowCreate(false)
          setTitle("")
          setDescription("")
        },
      }
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">{project.name}</h2>
          <p className="text-sm text-muted-foreground">{tasks.length} tasks</p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>New Task</Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Annotate product images"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDesc">Description</Label>
                <Input
                  id="taskDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="space-y-2">
                <Label>Task Type</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="image">Image</SelectItem>
                    <SelectItem value="audio">Audio</SelectItem>
                    <SelectItem value="text">Text</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Task"}
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCreate(false)}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {uploadTask && (
        <FileUpload
          taskId={uploadTask.id}
          taskType={uploadTask.type}
          onClose={() => setUploadTask(null)}
          onUploaded={() => {
            queryClient.invalidateQueries({
              queryKey: ["tasks", project.id],
            })
            setUploadTask(null)
          }}
        />
      )}

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Loading...</p>
      ) : tasks.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No tasks yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center justify-between gap-3 py-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-medium">{task.title}</h3>
                    <Badge variant="secondary">
                      {TYPE_LABELS[task.task_type] || task.task_type}
                    </Badge>
                  </div>
                  {task.description && (
                    <p className="mt-1 truncate text-sm text-muted-foreground">
                      {task.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-muted-foreground/60">
                    {task.submission_count} submissions
                  </p>
                </div>

                <Select
                  value={task.status}
                  onValueChange={(status) =>
                    updateMutation.mutate({ taskId: task.id, status })
                  }
                >
                  <SelectTrigger
                    className={`w-35 shrink-0 border ${STATUS_STYLES[task.status]}`}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                  </SelectContent>
                </Select>

                <Button
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() =>
                    setUploadTask({ id: task.id, type: task.task_type })
                  }
                >
                  Upload
                </Button>

                <Button
                  variant="ghost"
                  size="icon-xs"
                  className="shrink-0 text-muted-foreground hover:text-destructive"
                  onClick={() => {
                    if (confirm(`Delete "${task.title}"?`)) {
                      deleteMutation.mutate(task.id)
                    }
                  }}
                >
                  &times;
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
