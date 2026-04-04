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
import { Separator } from "@/components/ui/separator"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { useQueryClient } from "@tanstack/react-query"
import { FileUpload } from "./FileUpload"
import { SubmissionList } from "./SubmissionList"
import { useTasks, useCreateTask, useDeleteTask, useUpdateTask } from "./hooks"
import { STATUS_STYLES, TYPE_LABELS } from "./types"
import type { Project } from "@/features/projects/types"

interface TaskBoardProps {
  project: Project
}

export function TaskBoard({ project }: TaskBoardProps) {
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null)
  const [uploadTaskId, setUploadTaskId] = useState<string | null>(null)
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [taskType, setTaskType] = useState("image")

  // Search & Filter
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [typeFilter, setTypeFilter] = useState("")
  const [page, setPage] = useState(0)
  const limit = 20

  const { data, isLoading } = useTasks(
    project.id,
    search,
    statusFilter,
    typeFilter,
    page,
    limit
  )
  const tasks = data?.items ?? []
  const total = data?.total ?? 0
  const totalPages = Math.ceil(total / limit)
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

  function toggleExpand(taskId: string) {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId))
    setUploadTaskId(null)
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            {project.name}
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {total} task{total !== 1 ? "s" : ""} in project
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>New Task</Button>
      </div>

      {/* Search & Filter bar */}
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tasks..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setPage(0)
          }}
          className="max-w-xs"
        />
        <Select
          value={statusFilter}
          onValueChange={(v) => {
            setStatusFilter(v === "all" ? "" : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-35">
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="open">Open</SelectItem>
            <SelectItem value="in_progress">In Progress</SelectItem>
            <SelectItem value="completed">Completed</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={typeFilter}
          onValueChange={(v) => {
            setTypeFilter(v === "all" ? "" : v)
            setPage(0)
          }}
        >
          <SelectTrigger className="w-30">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent position="popper">
            <SelectItem value="all">All types</SelectItem>
            <SelectItem value="image">Image</SelectItem>
            <SelectItem value="audio">Audio</SelectItem>
            <SelectItem value="text">Text</SelectItem>
          </SelectContent>
        </Select>
        {(search || statusFilter || typeFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("")
              setStatusFilter("")
              setTypeFilter("")
              setPage(0)
            }}
          >
            Clear
          </Button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="animate-fade-up mb-8 border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="taskTitle">Task Title</Label>
                <Input
                  id="taskTitle"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Label product images for classification"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="taskDesc">Description</Label>
                <Input
                  id="taskDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What should contributors annotate?"
                />
              </div>
              <div className="space-y-2">
                <Label>Data Type</Label>
                <Select value={taskType} onValueChange={setTaskType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent position="popper">
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

      {/* Task List */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="py-20 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-muted">
            <svg
              viewBox="0 0 24 24"
              className="h-7 w-7 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <path
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-medium">
            {search || statusFilter || typeFilter
              ? "No tasks match your filters"
              : "No tasks yet"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {search || statusFilter || typeFilter
              ? "Try different search or filter criteria"
              : "Create a task to start collecting data"}
          </p>
        </div>
      ) : (
        <>
          <div className="stagger-children space-y-3">
            {tasks.map((task) => {
              const isExpanded = expandedTaskId === task.id
              const isUploading = uploadTaskId === task.id
              return (
                <Card
                  key={task.id}
                  className={`transition-colors ${isExpanded ? "border-primary/20" : ""}`}
                >
                  {/* Task header row */}
                  <CardContent className="flex items-center gap-4 py-4">
                    <div
                      className="min-w-0 flex-1 cursor-pointer"
                      onClick={() => toggleExpand(task.id)}
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`text-xs text-muted-foreground transition-transform ${isExpanded ? "rotate-90" : ""}`}
                        >
                          &#9656;
                        </span>
                        <h3 className="truncate font-medium">{task.title}</h3>
                        {task.submission_count === 0 ? (
                          <span onClick={(e) => e.stopPropagation()}>
                            <Select
                              value={task.task_type}
                              onValueChange={(task_type) =>
                                updateMutation.mutate({
                                  taskId: task.id,
                                  task_type,
                                })
                              }
                            >
                              <SelectTrigger className="h-6 w-auto gap-1 border-dashed px-2 font-mono text-[10px] tracking-wider uppercase">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent position="popper" sideOffset={4}>
                                <SelectItem value="image">Image</SelectItem>
                                <SelectItem value="audio">Audio</SelectItem>
                                <SelectItem value="text">Text</SelectItem>
                              </SelectContent>
                            </Select>
                          </span>
                        ) : (
                          <Badge
                            variant="secondary"
                            className="font-mono text-[10px] tracking-wider uppercase"
                          >
                            {TYPE_LABELS[task.task_type] || task.task_type}
                          </Badge>
                        )}
                      </div>
                      {task.description && (
                        <p className="mt-1 truncate pl-5 text-sm text-muted-foreground">
                          {task.description}
                        </p>
                      )}
                      <p className="mt-1.5 pl-5 font-mono text-xs text-muted-foreground/60">
                        {task.submission_count} submission
                        {task.submission_count !== 1 ? "s" : ""}
                      </p>
                    </div>

                    {/* Status select */}
                    <Select
                      value={task.status}
                      onValueChange={(status) =>
                        updateMutation.mutate({ taskId: task.id, status })
                      }
                    >
                      <SelectTrigger
                        className={`w-35 shrink-0 border font-mono text-xs ${STATUS_STYLES[task.status]}`}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent position="popper" sideOffset={4}>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                      </SelectContent>
                    </Select>

                    {/* Upload */}
                    <Button
                      variant={isUploading ? "default" : "outline"}
                      size="sm"
                      className="shrink-0"
                      onClick={() =>
                        setUploadTaskId(isUploading ? null : task.id)
                      }
                    >
                      Upload
                    </Button>

                    {/* Delete */}
                    <ConfirmDeleteDialog
                      name={task.title}
                      onConfirm={() => deleteMutation.mutate(task.id)}
                    />
                  </CardContent>

                  {/* Expanded section: Upload + Submissions */}
                  {(isUploading || isExpanded) && (
                    <div className="animate-fade-up border-t border-border/50 px-6 pb-5">
                      {isUploading && (
                        <div className="pt-4">
                          <FileUpload
                            taskId={task.id}
                            taskType={task.task_type}
                            onClose={() => setUploadTaskId(null)}
                            onUploaded={() => {
                              queryClient.invalidateQueries({
                                queryKey: ["tasks"],
                              })
                              queryClient.invalidateQueries({
                                queryKey: ["submissions", task.id],
                              })
                              setUploadTaskId(null)
                              setExpandedTaskId(task.id)
                            }}
                          />
                        </div>
                      )}
                      {isExpanded && (
                        <div className={isUploading ? "" : "pt-4"}>
                          {isUploading && <Separator className="my-4" />}
                          <SubmissionList taskId={task.id} />
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              )
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-8 flex items-center justify-center gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <span className="font-mono text-xs text-muted-foreground">
                Page {page + 1} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages - 1}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
