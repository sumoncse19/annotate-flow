import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import api from "@/shared/api"
import type { Task, Submission } from "./types"

export function useTasks(projectId: string) {
  return useQuery<Task[]>({
    queryKey: ["tasks", projectId],
    queryFn: () => api.get(`/projects/${projectId}/tasks/`).then((r) => r.data),
  })
}

export function useCreateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (data: {
      title: string
      description: string
      task_type: string
    }) => api.post(`/projects/${projectId}/tasks/`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export function useDeleteTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (taskId: string) =>
      api.delete(`/projects/${projectId}/tasks/${taskId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}

export function useSubmissions(taskId: string | null) {
  return useQuery<Submission[]>({
    queryKey: ["submissions", taskId],
    queryFn: () => api.get(`/tasks/${taskId}/submissions/`).then((r) => r.data),
    enabled: !!taskId,
    refetchInterval: 5000,
  })
}

export function useUpdateTask(projectId: string) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({
      taskId,
      ...data
    }: {
      taskId: string
      title?: string
      description?: string
      status?: string
      priority?: number
    }) => api.patch(`/projects/${projectId}/tasks/${taskId}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] })
    },
  })
}
