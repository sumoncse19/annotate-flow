import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ConfirmDeleteDialog } from "@/components/confirm-delete-dialog"
import { TaskBoard } from "@/features/tasks/TaskBoard"
import { useProjects, useCreateProject, useDeleteProject } from "./hooks"
import type { Project } from "./types"

export function ProjectList() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null)
  const [showCreate, setShowCreate] = useState(false)
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")

  const { data: projects = [], isLoading } = useProjects()
  const createMutation = useCreateProject()
  const deleteMutation = useDeleteProject()

  function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    createMutation.mutate(
      { name, description },
      {
        onSuccess: () => {
          setShowCreate(false)
          setName("")
          setDescription("")
        },
      }
    )
  }

  if (selectedProject) {
    return (
      <div>
        <button
          onClick={() => setSelectedProject(null)}
          className="group mb-6 flex items-center gap-2 font-mono text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <span className="transition-transform group-hover:-translate-x-0.5">
            &larr;
          </span>
          Back to Projects
        </button>
        <TaskBoard project={selectedProject} />
      </div>
    )
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-8 flex items-end justify-between">
        <div>
          <h2 className="font-heading text-3xl font-semibold tracking-tight">
            Projects
          </h2>
          <p className="mt-1 font-mono text-sm text-muted-foreground">
            {projects.length} project{projects.length !== 1 ? "s" : ""} total
          </p>
        </div>
        <Button onClick={() => setShowCreate(!showCreate)}>New Project</Button>
      </div>

      {/* Create form */}
      {showCreate && (
        <Card className="animate-fade-up mb-8 border-primary/20 shadow-lg shadow-primary/5">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Product Image Annotations"
                  required
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDesc">Description</Label>
                <Input
                  id="projectDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What data will be annotated?"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create Project"}
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

      {/* Project grid */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary/30 border-t-primary" />
        </div>
      ) : projects.length === 0 ? (
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
                d="M2 17L12 22L22 17M2 12L12 17L22 12M12 2L2 7L12 12L22 7L12 2Z"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
          <p className="text-lg font-medium text-foreground">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create your first project to begin annotating data
          </p>
        </div>
      ) : (
        <div className="stagger-children grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="group cursor-pointer transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/20 hover:shadow-lg hover:shadow-primary/5"
              onClick={() => setSelectedProject(project)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <CardTitle className="truncate text-base group-hover:text-primary">
                      {project.name}
                    </CardTitle>
                    {project.description && (
                      <CardDescription className="mt-1 line-clamp-2">
                        {project.description}
                      </CardDescription>
                    )}
                  </div>
                  <span onClick={(e) => e.stopPropagation()}>
                    <ConfirmDeleteDialog
                      name={project.name}
                      onConfirm={() => deleteMutation.mutate(project.id)}
                    />
                  </span>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 font-mono text-xs text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/50" />
                    {project.task_count} task
                    {project.task_count !== 1 ? "s" : ""}
                  </span>
                  <span className="text-border">/</span>
                  <span>
                    {new Date(project.created_at).toLocaleDateString()}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
