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
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedProject(null)}
          className="mb-4"
        >
          &larr; Back to Projects
        </Button>
        <TaskBoard project={selectedProject} />
      </div>
    )
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Projects</h2>
        <Button onClick={() => setShowCreate(!showCreate)}>New Project</Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardContent className="pt-6">
            <form onSubmit={handleCreate} className="space-y-3">
              <div className="space-y-2">
                <Label htmlFor="projectName">Project Name</Label>
                <Input
                  id="projectName"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="My annotation project"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="projectDesc">Description</Label>
                <Input
                  id="projectDesc"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional description"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  size="sm"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? "Creating..." : "Create"}
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

      {isLoading ? (
        <p className="py-12 text-center text-muted-foreground">Loading...</p>
      ) : projects.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No projects yet</p>
          <p className="mt-1 text-sm text-muted-foreground/60">
            Create one to start annotating data
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-colors hover:border-primary/30"
              onClick={() => setSelectedProject(project)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <CardTitle className="text-base">{project.name}</CardTitle>
                  <span onClick={(e) => e.stopPropagation()}>
                    <ConfirmDeleteDialog
                      name={project.name}
                      onConfirm={() => deleteMutation.mutate(project.id)}
                    />
                  </span>
                </div>
                {project.description && (
                  <CardDescription className="line-clamp-2">
                    {project.description}
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{project.task_count} tasks</span>
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
